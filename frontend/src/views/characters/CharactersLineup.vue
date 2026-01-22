<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import EditViewHeader from '@components/editor/EditViewHeader.vue';

const { t } = useI18n();

const container = ref(null);
const loading = ref(true);
const loadingStatus = ref('Initializing...');
const characters = ref([]);

// Three.js variables
let scene, camera, renderer, controls, animationId;
let mixers = [];
const clock = new THREE.Clock();

// Helper to resolve paths without using game composables
const resolvePath = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return path;
    if (path.startsWith('artwork/')) return `/storage/${path}`;
    // Handle simplified 3d/ paths if they exist in data
    if (path.startsWith('3d/') || path.startsWith('/3d/')) {
        const clean = path.startsWith('/') ? path.slice(1) : path;
        return `/storage/${clean}`;
    }
    if (path.startsWith('/')) return `/storage${path}`;
    return `/storage/${path}`;
};

const initThree = () => {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.fog = new THREE.Fog(0x333333, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.value.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced slightly to let fill light take over
    scene.add(ambientLight);

    // Warm fill light
    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(0, 20, 10); // Higher up for shorter shadows
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.normalBias = 0.02;
    // Adjust shadow camera to cover the area
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // Floor
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/storage/artwork/general/floor-tile.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50); // Smaller tiles
        texture.colorSpace = THREE.SRGBColorSpace;

        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.2
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);
    });

    // Handle resize
    window.addEventListener('resize', onWindowResize);

    // Start loop
    animate();
};

const onWindowResize = () => {
    if (!container.value) return;
    camera.aspect = container.value.clientWidth / container.value.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
};

const animate = () => {
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixers.forEach(mixer => mixer.update(delta));

    controls.update();
    renderer.render(scene, camera);
};

const globalAnimations = ref([]);

const loadCharacters = async () => {
    try {
        loadingStatus.value = 'Fetching data...';

        // Fetch characters and global animations in parallel
        const [charsRes, animsRes] = await Promise.all([
            fetch('/api/characters?type=person'),
            fetch('/api/animations')
        ]);

        if (!charsRes.ok) throw new Error(`Characters fetch failed: ${charsRes.status}`);
        const allChars = await charsRes.json();

        if (animsRes.ok) {
            globalAnimations.value = await animsRes.json();
        }

        // Filter those likely to have 3D models
        characters.value = allChars.filter(c => {
             const hasMediaGlb = c.media && c.media.some(m => m.filepad && m.filepad.endsWith('.glb'));
             const hasLegacyGlb = !!c.threefile;
             return hasMediaGlb || hasLegacyGlb;
        });

        if (characters.value.length === 0) {
            loadingStatus.value = 'No 3D characters found.';
            loading.value = false;
            return;
        }

        await setupLineup();

    } catch (error) {
        console.error("Error loading data:", error);
        loadingStatus.value = 'Error loading data.';
    } finally {
        loading.value = false;
    }
};

const setupLineup = async () => {
    // Determine grid size
    const count = characters.value.length;
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 2.0;

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    // Pre-load default animation (Caution)
    let defaultClip = null;

    // Fuzzy search for "caution" in global animations
    const cautionAnim = globalAnimations.value.find(a => a.name.toLowerCase().includes('caution'));

    let defaultAnimUrl = '';

    if (cautionAnim) {
        // Resolve path from media relation
        if (cautionAnim.media && cautionAnim.media.length > 0) {
            // Find the GLB file in media
            const m = cautionAnim.media.find(m => m.filepad && m.filepad.endsWith('.glb'));
            if (m) {
                defaultAnimUrl = resolvePath(m.filepad);
            }
        }

        if (!defaultAnimUrl && cautionAnim.filepad) {
             defaultAnimUrl = resolvePath(cautionAnim.filepad);
        }
    }

    // Fallback if dynamic lookup fails (though it shouldn't if DB is correct)
    if (!defaultAnimUrl) {
         // Fallback to the known idle or just log warning
         console.warn("Could not find 'Caution' animation in DB. Checking for hardcoded fallback...");
         defaultAnimUrl = resolvePath('3d/glb/1768742961_anim-idle.glb'); // Back to idle if caution missing
    }

    if (defaultAnimUrl) {
        try {
            console.log(`Loading default animation from: ${defaultAnimUrl}`);
            const animGltf = await loader.loadAsync(defaultAnimUrl);
            if (animGltf.animations && animGltf.animations.length > 0) {
                defaultClip = animGltf.animations[0];
                console.log("Default animation loaded.");
            }
        } catch (e) {
            console.warn("Failed to load default animation:", e);
        }
    }

    for (let i = 0; i < count; i++) {
        const charData = characters.value[i];
        loadingStatus.value = `Loading ${i + 1}/${count}: ${charData.name}`;

        // Determine GLB path
        let glbPath = '';
        if (charData.media && charData.media.some(m => m.filepad && m.filepad.endsWith('.glb'))) {
            const m = charData.media.find(m => m.filepad && m.filepad.endsWith('.glb'));
            glbPath = m.filepad;
        } else if (charData.threefile) {
            glbPath = `glb/${charData.threefile}`;
        }

        if (!glbPath) continue;

        try {
            const url = resolvePath(glbPath);
            const gltf = await loader.loadAsync(url);
            const model = gltf.scene;

            // Positioning
            const row = Math.floor(i / cols);
            const col = i % cols;

            // Center the grid around 0,0
            const xOffset = ((cols - 1) * spacing) / 2;
            const zOffset = ((Math.ceil(count / cols) - 1) * spacing) / 2;

            model.position.set((col * spacing) - xOffset, 0, (row * spacing) - zOffset);

            // Shadows
            model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(model);

            // Animation Handling
            const mixer = new THREE.AnimationMixer(model);
            mixers.push(mixer);

            // 1. Check for Embedded "Idle"
            let bestClip = null;
            if (gltf.animations && gltf.animations.length > 0) {
                bestClip = gltf.animations.find(a => {
                    const n = a.name.toLowerCase();
                    return n.includes('idle') || n.includes('stand');
                });
            }

            // 2. If not embedded, use the default forced animation (Caution)
            if (!bestClip && defaultClip) {
                bestClip = defaultClip;
            }

            // 3. (Optional) Check external if different from default?
            // The user requested to "attach the [default]" because models have no anims.
            // So default is the primary fallback.

            if (bestClip) {
                const action = mixer.clipAction(bestClip);
                action.play();
            }

        } catch (err) {
            console.error(`Failed to load model for ${charData.name}`, err);
        }
    }
};

onMounted(() => {
    initThree();
    loadCharacters();
});

onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
    cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
    mixers = [];
});

</script>

<template>
    <div class="character-lineup-view">
        <EditViewHeader
            backRoute="/characters"
            :parentName="t(`common.views.characters.title`)"
            itemName="Lineup"
            :showButtons="false"
        />

        <div class="canvas-container" ref="container">
            <div v-if="loading" class="loading-overlay">
                <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
                <p>{{ loadingStatus }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.character-lineup-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.canvas-container {
    flex: 1;
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #333;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    z-index: 10;
    gap: 1rem;
}
</style>

