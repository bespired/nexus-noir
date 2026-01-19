<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelUrl: {
        type: String,
        required: false,
        default: null
    },
    title: {
        type: String,
        default: ''
    },
    showSkin: {
        type: Boolean,
        default: true
    },
    showSkeleton: {
        type: Boolean,
        default: true
    },
    externalAnimationUrl: {
        type: String,
        default: null
    },
    framingScale: {
        type: Number,
        default: 0.85
    }
});

const { t } = useI18n();

const container = ref(null);
const animations = ref([]);
const activeAnimation = ref(null);
let scene, camera, renderer, controls, gltfLoader, fbxLoader, mixer;
let modelGroup, skeletonHelper;
const clock = new THREE.Clock();

/**
 * Custom helper to visualize bones as thick cylinders
 */
class ThickSkeletonHelper extends THREE.Group {
    constructor(model) {
        super();
        this.model = model;
        this.bones = [];
        this.boneSegments = [];

        model.traverse(child => {
            if (child.isBone) this.bones.push(child);
        });

        const material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: 0x3b82f6,
            emissiveIntensity: 2,
            metalness: 0.5,
            roughness: 0.2
        });

        const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
        const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

        this.bones.forEach(bone => {
            // Joint sphere
            const sphere = new THREE.Mesh(sphereGeo, material);
            this.add(sphere);

            // Bone segment to parent
            if (bone.parent && bone.parent.isBone) {
                const cylinder = new THREE.Mesh(cylinderGeo, material);
                this.add(cylinder);
                this.boneSegments.push({ cylinder, bone, parent: bone.parent });
            }

            this.boneSegments.push({ sphere, bone });
        });

        this.renderOrder = 999;
    }

    update() {
        const boneRadius = 0.006;
        const jointRadius = 0.008;

        this.boneSegments.forEach(seg => {
            if (seg.cylinder) {
                const start = new THREE.Vector3();
                const end = new THREE.Vector3();
                seg.parent.getWorldPosition(start);
                seg.bone.getWorldPosition(end);

                const distance = start.distanceTo(end);
                if (distance > 0) {
                    seg.cylinder.position.copy(start).lerp(end, 0.5);
                    seg.cylinder.scale.set(boneRadius, distance, boneRadius);
                    seg.cylinder.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        end.clone().sub(start).normalize()
                    );
                    seg.cylinder.visible = true;
                } else {
                    seg.cylinder.visible = false;
                }
            } else if (seg.sphere) {
                const pos = new THREE.Vector3();
                seg.bone.getWorldPosition(pos);
                seg.sphere.position.copy(pos);
                seg.sphere.scale.set(jointRadius, jointRadius, jointRadius);
            }
        });
    }
}

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Boosted
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 4); // Boosted
    directionalLight1.position.set(10, 20, 20);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight2.position.set(-10, 10, -10);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x3b82f6, 5, 50);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // GRID (Spatial Context)
    const grid = new THREE.GridHelper(20, 20, 0x666666, 0x333333); // Larger, brighter grid
    scene.add(grid);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // LOADERS
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    
    gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    
    fbxLoader = new FBXLoader();
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
    
    // Zoom out to show full body. 
    // d = (height/2) / tan(fov/2)
    // We'll use a ratio < 1.0 to add some padding around the character.
    // We'll use a ratio < 1.0 to add some padding around the character.
    const comfortableRatio = props.framingScale; 
    const finalDistance = h3d / (2 * comfortableRatio * Math.tan(fovRad / 2));

    // Center of character vertically (since normalized to 1.0 units height starting from 0)
    const centerHeight = 0.5;
    camera.position.set(0, centerHeight, finalDistance);

    if (controls) {
        controls.target.set(0, centerHeight, 0);
        controls.update();
    }
};

const loadModel = () => {
    if (!modelGroup) return;

    // Reset current state
    while(modelGroup.children.length > 0){
        modelGroup.remove(modelGroup.children[0]);
    }
    if (skeletonHelper) {
        scene.remove(skeletonHelper);
        skeletonHelper = null;
    }
    if (mixer) {
        mixer.stopAllAction();
        mixer = null;
    }
    activeAnimation.value = null;
    animations.value = [];

    if (!props.modelUrl) {
        updateFraming();
        return;
    }

    const isFbx = props.modelUrl.toLowerCase().endsWith('.fbx');
    const loader = isFbx ? fbxLoader : gltfLoader;

    loader.load(props.modelUrl, (object) => {
        const model = isFbx ? object : object.scene;
        modelGroup.add(model);

        // Thick Skeleton Helper
        skeletonHelper = new ThickSkeletonHelper(model);
        skeletonHelper.visible = props.showSkeleton;
        scene.add(skeletonHelper);
        skeletonHelper.update();

        // Apply initial skin visibility
        model.traverse(child => {
            if (child.isMesh) child.visible = props.showSkin;
        });

        // Explicitly calculate bounding box including bones
        const box = new THREE.Box3();

        // 1. Check for meshes
        const hasMeshes = (obj) => {
            let found = false;
            obj.traverse(child => { if (child.isMesh) found = true; });
            return found;
        };

        if (hasMeshes(model)) {
            box.setFromObject(model);
        } else {
            // 2. Fallback to bones if no meshes
            model.traverse(child => {
                if (child.isBone) {
                    // Use world matrix for accurate bone position
                    const position = new THREE.Vector3();
                    child.getWorldPosition(position);
                    box.expandByPoint(position);
                }
            });
        }

        // If still empty (very rare), use a default unit box
        if (box.isEmpty()) {
            box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
        }

        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 1.0;

        // MIXAMO FIX: If size is huge (e.g. 100-200 units), scaleFactor will be tiny (0.01)
        const scaleFactor = targetHeight / (size.y || 1);

        console.log(`[ThreePreview] Model: ${props.modelUrl}`);
        console.log(`[ThreePreview] Raw Size:`, size);
        console.log(`[ThreePreview] Scale Factor:`, scaleFactor);

        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Center on X and Z, but keep Y at 0 (standing on grid)
        const center = box.getCenter(new THREE.Vector3());
        // We negate the center to move it to (0,0,0), then scale it
        model.position.x = -center.x * scaleFactor;
        model.position.z = -center.z * scaleFactor;
        model.position.y = -box.min.y * scaleFactor; // Bottom of box at Y=0

        // Create mixer for all models to support external animations
        mixer = new THREE.AnimationMixer(model);

        // Animations
        const clips = isFbx ? object.animations : object.animations;
        if (clips && clips.length > 0) {
            animations.value = clips;
            playAnimation(clips[0]);
        }

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

    // Safely update skeleton helper if it exists
    if (skeletonHelper && typeof skeletonHelper.update === 'function') {
        skeletonHelper.update();
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
};

const loadExternalAnimation = (url) => {
    console.log(`[ThreePreview] loadExternalAnimation called with: ${url}`);
    if (!url) {
        console.warn('[ThreePreview] No URL provided to loadExternalAnimation');
        return;
    }
    if (!mixer) {
        console.warn('[ThreePreview] No mixer available to loadExternalAnimation');
        return;
    }

    const isFbx = url.toLowerCase().endsWith('.fbx');
    const loader = isFbx ? fbxLoader : gltfLoader;

    console.log(`[ThreePreview] Using ${isFbx ? 'FBX' : 'GLTF'} loader for external animation`);

    loader.load(url, (object) => {
        console.log(`[ThreePreview] External animation loaded:`, object);
        console.log(`[ThreePreview] External object rotation:`, object.rotation);
        console.log(`[ThreePreview] External object scale:`, object.scale);

        const clips = isFbx ? object.animations : object.animations;
        if (clips && clips.length > 0) {
            console.log(`[ThreePreview] Found ${clips.length} clips in external file`);
            
            // Log bone names in the animation for comparison
            if (clips[0].tracks && clips[0].tracks.length > 0) {
                const trackNames = clips[0].tracks.slice(0, 5).map(t => t.name);
                console.log(`[ThreePreview] Sample track names in animation:`, trackNames);
            }

            // Log bone names in the model for comparison
            const modelBones = [];
            modelGroup.traverse(child => { if (child.isBone) modelBones.push(child.name); });
            console.log(`[ThreePreview] Sample bone names in model:`, modelBones.slice(0, 5));

            // Stop current animations
            mixer.stopAllAction();
            
            // Apply the first clip from the external file
            const clip = clips[0].clone(); // Clone to avoid modifying original if cached
            
            const action = mixer.clipAction(clip);
            action.play();
            activeAnimation.value = `External: ${clip.name}`;
            console.log(`[ThreePreview] Playing external animation: ${clip.name}`);
        } else {
            console.warn('[ThreePreview] No animation clips found in external file');
        }
    }, (xhr) => {
        console.log(`[ThreePreview] Loading progress: ${ (xhr.loaded / xhr.total * 100) }%`);
    }, (error) => {
        console.error(`[ThreePreview] Error loading external animation: ${url}`, error);
    });
};

const captureScreenshot = () => {
    if (!renderer || !scene || !camera) return null;
    renderer.render(scene, camera); // Ensure we capture the current state
    return renderer.domElement.toDataURL('image/png');
};

const preparePhotoOpp = (options = {}) => {
    const { forceSkeleton = false, isMugshot = false } = options;
    
    if (!modelGroup || !controls || !camera) return;

    // Calculate bounding box
    let box = new THREE.Box3().setFromObject(modelGroup);
    
    // Fallback for models without meshes (skeletons only)
    if (box.isEmpty()) {
        modelGroup.traverse(child => {
            if (child.isBone) {
                const position = new THREE.Vector3();
                child.getWorldPosition(position);
                box.expandByPoint(position);
            }
        });
    }

    // Still empty? Use unit box
    if (box.isEmpty()) {
        box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Target calculation: Mugshot targets head, Full shot targets center
    const viewCenter = new THREE.Vector3(
        center.x,
        isMugshot ? box.max.y - (size.y * 0.15) : center.y, 
        center.z
    );

    // Set controls target
    controls.target.copy(viewCenter);

    // Distance calculation: Mugshot is tight, Full shot fits max dimension
    let distance;
    if (isMugshot) {
        distance = size.y * 0.4;
    } else {
        const maxDim = Math.max(size.x, size.y, size.z);
        // Ensure distance is enough to fit the object within FOV (assuming ~45-50 deg FOV)
        // distance approx size / (2 * tan(fov/2))
        // Using * 1.5 provides a safe comfortable padding for full view
        distance = maxDim * 1.5;
    }

    // 3/4 View: offset on X and Z
    const angle = -Math.PI / 4; 
    camera.position.set(
        viewCenter.x + Math.sin(angle) * distance,
        viewCenter.y + (isMugshot ? distance * 0.1 : distance * 0.2), 
        viewCenter.z + Math.cos(angle) * distance
    );

    controls.update();
    renderer.render(scene, camera);
};

let savedCameraPos = null;
let savedControlsTarget = null;

const saveCameraState = () => {
    if (!camera || !controls) return;
    savedCameraPos = camera.position.clone();
    savedControlsTarget = controls.target.clone();
};

const restoreCameraState = () => {
    if (!camera || !controls || !savedCameraPos || !savedControlsTarget) return;
    camera.position.copy(savedCameraPos);
    controls.target.copy(savedControlsTarget);
    controls.update();
    renderer.render(scene, camera);
};

defineExpose({
    captureScreenshot,
    preparePhotoOpp,
    saveCameraState,
    restoreCameraState
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
    if (scene) loadModel();
});

watch(() => props.showSkin, (val) => {
    if (modelGroup) {
        modelGroup.traverse(child => {
            if (child.isMesh) child.visible = val;
        });
    }
});

watch(() => props.showSkeleton, (val) => {
    if (skeletonHelper) {
        skeletonHelper.visible = val;
    }
});

watch(() => props.externalAnimationUrl, (newUrl) => {
    if (newUrl) {
        loadExternalAnimation(newUrl);
    }
});
</script>

<template>
    <div class="three-preview">
        <div class="header-overlay">
            <span class="header-title">{{ title || t('clues.edit.media.header_3d') }}</span>
            <div class="header-actions">
                <slot name="header-actions"></slot>
            </div>
        </div>

        <div ref="container" class="renderer-container"></div>

        <div v-if="!modelUrl" class="no-data-overlay">
            <i class="pi pi-user no-data-icon"></i>
            <span class="no-data-text">NO NEURAL DATA FOUND</span>
            <Badge label="INITIALIZE_SCAN" severity="primary" outlined class="scan-btn" />
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

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.icon-only-btn, :deep(.upload-trigger-btn.p-button-icon-only) {
    padding: 0.5rem !important;
    height: 2.5rem !important;
    width: 2.5rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
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

.scan-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
    font-size: 0.9rem !important;
    padding: 0.75rem 2rem !important;
}
</style>
