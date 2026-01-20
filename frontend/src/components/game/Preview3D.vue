<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelUrl: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: ''
    }
});

const { t } = useI18n();

const container = ref(null);
const animations = ref([]);
const activeAnimation = ref(null);
let scene, camera, renderer, controls, loader, mixer;
let modelGroup;
const clock = new THREE.Clock();

const init = () => {
    if (!container.value) return;

    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);

    // MODEL GROUP
    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // CAMERA
    camera = new THREE.PerspectiveCamera(45, container.value.clientWidth / container.value.clientHeight, 0.1, 10000);
    // Initial position, will be updated by updateFraming
    camera.position.set(0, 5, 20);

    // RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.value.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffff77, 2);
    directionalLight1.position.set(10, 20, 20);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xff77ff, 3);
    directionalLight2.position.set(-10, 10, -10);
    scene.add(directionalLight2);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // LOADER
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loadModel();

    animate();
};

const onWindowResize = () => {
    if (!container.value || !camera || !renderer) return;
    camera.aspect = container.value.clientWidth / container.value.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    updateFraming();
};

const updateFraming = () => {
    if (!container.value || !camera || !modelGroup) return;

    const vRes = container.value.clientHeight;
    if (vRes === 0) return;

    // Requirement: 20px top, 20px bottom padding
    const totalPadding = 40;
    const occupiedRatio = Math.max(0.1, (vRes - totalPadding) / vRes);

    // Our models are normalized to 1.0 units high
    const h3d = 1.0;
    const fovRad = (camera.fov * Math.PI) / 180;
    const distance = h3d / (2 * occupiedRatio * Math.tan(fovRad / 2));

    // Center of character vertically (since normalized to 1.0 units height starting from 0)
    const centerHeight = 0.5;
    camera.position.set(0, centerHeight, distance);

    if (controls) {
        controls.target.set(0, centerHeight, 0);
        controls.update();
    }
};

const loadModel = () => {
    if (!props.modelUrl || !modelGroup) return;

    loader.load(props.modelUrl, (gltf) => {
        // 1. Clear existing model content
        while(modelGroup.children.length > 0){
            modelGroup.remove(modelGroup.children[0]);
        }

        if (mixer) {
            mixer.stopAllAction();
            mixer = null;
        }
        activeAnimation.value = null;
        animations.value = [];

        // 2. Add new model
        const model = gltf.scene;

        // Remove embedded lights from the model
        const lightsToRemove = [];
        model.traverse((child) => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach((light) => {
            if (light.parent) {
                light.parent.remove(light);
                console.log(`[Preview3D] Removed embedded light: ${light.type}`);
            }
        });

        // Debug Materials
        model.traverse((child) => {
            if (child.isMesh) {
                console.log(`[Preview3D] Mesh: ${child.name}, Material:`, child.material);
                if (child.material.isMeshStandardMaterial) {
                    console.log(`- Metalness: ${child.material.metalness}, Roughness: ${child.material.roughness}`);
                    // Temporary fix: If it's fully metal but we have no envMap, it might look black.
                    // child.material.metalness = 0; // Uncomment to test if this fixes the "black" issue
                }
            }
        });

        modelGroup.add(model);

        // 3. Normalized Scaling and Centering
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());



        // Normalize to a standard height of 1.0 units
        const targetHeight = 1.0;
        const scaleFactor = targetHeight / (size.y || 1);
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Re-calculate box and center after scale
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        // Move to origin (centered on XZ, feet at Y=0)
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        console.log('loaded model', model)
        
        // 4. Animations
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            animations.value = gltf.animations;
            playAnimation(gltf.animations[0]);
        }



        // 5. Apply Precise Framing
        updateFraming();
    },
    undefined,
    (error) => {
        console.error(`[ThreePreview] Error loading model: ${props.modelUrl}`, error);
    });
};

const playAnimation = (clip) => {
    if (!mixer || !clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    activeAnimation.value = clip.name;
};

const animate = () => {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (controls) controls.update();
    if (mixer) mixer.update(delta);
    if (renderer && scene && camera) renderer.render(scene, camera);
};

const captureScreenshot = () => {
    if (!renderer || !scene || !camera) return null;
    return renderer.domElement.toDataURL('image/png');
};

defineExpose({
    captureScreenshot
});

onMounted(() => {
    init();
    window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
    if (renderer) renderer.dispose();
});

watch(() => props.modelUrl, () => {
    if (loader && scene) loadModel();
});
</script>

<template>
    <div class="three-preview">
        <div class="header-overlay">
            <span class="header-title">{{ title || t('clues.edit.media.header_3d') }}</span>
            <slot name="header-actions"></slot>
        </div>

        <div ref="container" class="renderer-container"></div>

        <div v-if="animations.length > 0" class="animations-overlay">
            <div class="animations-list">
                <Button
                    v-for="clip in animations"
                    :key="clip.name"
                    :label="clip.name.toUpperCase()"
                    :severity="activeAnimation === clip.name ? 'primary' : 'secondary'"
                    text
                    class="animation-btn"
                    @click="playAnimation(clip)"
                />
            </div>
        </div>

        <div v-if="!modelUrl" class="no-data-overlay">
            <i class="pi pi-user no-data-icon"></i>
            <span class="no-data-text">NO NEURAL DATA FOUND</span>
            <Button label="INITIALIZE_SCAN" severity="primary" outlined class="scan-btn" />
        </div>
    </div>
</template>

<style scoped>
.three-preview {
    width: 100%;
    aspect-ratio: 1 / 1;
    background-color: #0b0f19;
    border: 1px solid var(--color-noir-panel);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.renderer-container {
    width: 100%;
    height: 100%;
}

.header-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to bottom, rgba(11, 15, 25, 0.8), transparent);
    z-index: 10;
}

.header-title {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.9rem;
    letter-spacing: 2px;
}

.no-data-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    background-color: #0b0f19;
    z-index: 5;
}

.no-data-icon {
    font-size: 4rem;
    color: rgba(255, 255, 255, 0.05);
}

.no-data-text {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.8rem;
    letter-spacing: 2px;
}

.animations-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1rem;
    background: linear-gradient(to top, rgba(11, 15, 25, 0.9), transparent);
    z-index: 10;
}

.animations-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
}

.animation-btn {
    font-family: var(--font-mono);
    font-size: 0.75rem !important;
    font-weight: bold !important;
    padding: 0.25rem 0.75rem !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: var(--color-noir-muted) !important;
    border-radius: 4px;
}

.animation-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    color: var(--color-noir-text) !important;
}

:deep(.p-button-primary).animation-btn {
    background: rgba(var(--color-noir-accent-rgb), 0.2) !important;
    border-color: var(--color-noir-accent) !important;
    color: var(--color-noir-accent) !important;
}

.scan-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
    font-size: 0.9rem !important;
    padding: 0.75rem 2rem !important;
}
</style>
