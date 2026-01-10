<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
let scene, camera, renderer, controls, loader;

const init = () => {
    if (!container.value) return;

    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);

    // CAMERA
    camera = new THREE.PerspectiveCamera(45, container.value.clientWidth / container.value.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 5);

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.value.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // LOADER
    loader = new GLTFLoader();
    loadModel();

    animate();
};

const loadModel = () => {
    if (!props.modelUrl) return;

    loader.load(props.modelUrl, (gltf) => {
        // Clear existing models
        scene.children.forEach(child => {
            if (child.type === 'Group' || child.type === 'Scene') {
                scene.remove(child);
            }
        });

        const model = gltf.scene;
        
        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        scene.add(model);
        
        // Adjust camera to fit
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.z = maxDim * 2.5;
    });
};

const animate = () => {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
};

const handleResize = () => {
    if (!container.value || !renderer) return;
    camera.aspect = container.value.clientWidth / container.value.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
};

onMounted(() => {
    init();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (renderer) renderer.dispose();
});

watch(() => props.modelUrl, () => {
    if (loader && scene) loadModel();
});
</script>

<template>
    <div class="three-preview shadow-lg">
        <div class="header-overlay">
            <span class="header-title">{{ title || t('clues.edit.media.header_3d') }}</span>
            <slot name="header-actions"></slot>
        </div>
        
        <div ref="container" class="renderer-container"></div>
        
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

.scan-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
    font-size: 0.9rem !important;
    padding: 0.75rem 2rem !important;
}
</style>
