<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// PrimeVue components
import Slider from 'primevue/slider';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sceneId = route.params.id;
const scene = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

const canvasContainer = ref(null);
const backdropAspectRatio = ref(16 / 9);

// Three.js variables
let threeScene, threeCamera, renderer, loader, raycaster, mouse;
let resizeObserver = null;
let floorMesh = null;
let glbModel = null;
let glbCamera = null;
let playerMesh = null;
const cameraDebugInfo = ref({
    found: false,
    name: '',
    fov: 0,
    aspect: 0,
    containerAspect: 0,
    imageAspect: 0,
    shiftX: 0,
    shiftY: 0
});
const isGlbLoaded = ref(false);
const floorFound = ref(false);

const characterScale = ref(1.0);

const fetchInitialData = async () => {
    try {
        const response = await fetch(`/api/scenes/${sceneId}`);
        if (!response.ok) throw new Error('Failed to fetch scene');
        scene.value = await response.json();

        // Initialize scale from data
        if (scene.value.data && scene.value.data.character_scale) {
            characterScale.value = scene.value.data.character_scale;
        } else if (scene.value.character_scale) {
            characterScale.value = scene.value.character_scale;
        } else {
            characterScale.value = 1.5; // Default from CharacterManager
        }

        nextTick(() => {
            initThree();
        });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load scene data', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const backdropUrl = computed(() => {
    if (scene.value && scene.value.media) {
        const backdrop = scene.value.media.find(m => m.type === '2d');
        if (backdrop) {
            const file = backdrop.filepad;
            const url = file.startsWith('http') ? file : `/storage/${file}`;

            // Load image to get aspect ratio
            const img = new Image();
            img.onload = () => {
                backdropAspectRatio.value = img.width / img.height;
                nextTick(() => handleResize());
            };
            img.src = url;

            return url;
        }
    }
    return null;
});

const currentGlb = computed(() => {
    if (scene.value && scene.value.media) {
        return scene.value.media.find(m => m.type === '3d');
    }
    return null;
});

const glbUrl = computed(() => {
    if (currentGlb.value) {
        const file = currentGlb.value.filepad;
        return file.startsWith('http') ? file : `/storage/${file}`;
    }
    return null;
});

const initThree = () => {
    if (!canvasContainer.value) return;

    threeScene = new THREE.Scene();

    threeCamera = new THREE.PerspectiveCamera(50, canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 0.1, 1000);
    threeCamera.position.set(0, 5, 10);
    threeCamera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.value.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    threeScene.add(dirLight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load Scene GLB
    if (glbUrl.value) {
        loader.load(glbUrl.value, (gltf) => {
            glbModel = gltf.scene;
            threeScene.add(glbModel);
            isGlbLoaded.value = true;

            glbModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.material) {
                        const isFloor = child.name.toLowerCase().includes('floor');
                        const isMask = child.name.toLowerCase().includes('mask');

                        if (isFloor || isMask) {
                            child.material = new THREE.MeshPhongMaterial({
                                color: isFloor ? 0x3b82f6 : 0xd946ef,
                                transparent: true,
                                opacity: 0.5,
                                // side: THREE.DoubleSide,
                                depthWrite: true,
                                polygonOffset: true,
                                polygonOffsetFactor: -1,
                                polygonOffsetUnits: -1
                            });

                            if (isFloor) {
                                floorMesh = child;
                                floorFound.value = true;
                            }
                        } else {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                            child.material.opacity = 0.3;
                            child.material.depthWrite = true;
                            // child.material.side = THREE.DoubleSide;
                        }
                    }
                }
                if (child.isCamera) {
                    glbCamera = child;
                }
            });

            if (glbCamera) {
                threeScene.updateMatrixWorld(true);
                threeCamera = glbCamera;
                threeCamera.aspect = backdropAspectRatio.value;
                threeCamera.updateProjectionMatrix();

                cameraDebugInfo.value = {
                    found: true,
                    name: glbCamera.name,
                    fov: glbCamera.fov,
                    aspect: glbCamera.aspect,
                    containerAspect: canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
                    imageAspect: backdropAspectRatio.value,
                    shiftX: glbCamera.projectionMatrix.elements[8],
                    shiftY: glbCamera.projectionMatrix.elements[9]
                };
            } else {
                cameraDebugInfo.value = {
                    found: false,
                    name: 'Default',
                    fov: threeCamera.fov,
                    aspect: threeCamera.aspect,
                    containerAspect: canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
                    imageAspect: backdropAspectRatio.value,
                    shiftX: 0,
                    shiftY: 0
                };
            }

            // After scene load, load the player placeholder
            loadPlayerPlaceholder();
        });
    }

    animate();
};

const loadPlayerPlaceholder = () => {
    // We try to find a character model or use a generic one
    // For now, let's use a simple Box or a known character if possible
    // In a real scenario, we'd fetch the default player GLB

    // Create a simple figure placeholder (a cylinder represent a human-size 1.8m figure)
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 12);
    const material = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.y = 0.5; // Half height up

    // Add a small "face" to indicate direction
    const faceGeo = new THREE.BoxGeometry(0.1, 0.1, 0.2);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0.3, 0.2);
    playerMesh.add(face);

    threeScene.add(playerMesh);
    updatePlayerScale();

    // Position figure: prefer first spawnpoint, fallback to floor center
    if (scene.value['3d_spawnpoints'] && scene.value['3d_spawnpoints'].length > 0) {
        const sp = scene.value['3d_spawnpoints'][0];
        playerMesh.position.set(sp.x, (1.0 * characterScale.value) / 2, sp.z);
    } else if (floorMesh) {
        // Fallback: Center of the floor
        const box = new THREE.Box3().setFromObject(floorMesh);
        const center = new THREE.Vector3();
        box.getCenter(center);
        playerMesh.position.set(center.x, (1.0 * characterScale.value) / 2, center.z);
        console.log("No spawnpoints found, positioning at floor center:", center);
    }
};

const updatePlayerScale = () => {
    if (!playerMesh) return;
    // The cylinder is 1.0 units high.
    // Scaling it by characterScale makes it exactly that height in world units.
    playerMesh.scale.set(characterScale.value, characterScale.value, characterScale.value);
    playerMesh.position.y = (1.0 * characterScale.value) / 2;
};

const animate = () => {
    if (!renderer) return;
    requestAnimationFrame(animate);
    renderer.render(threeScene, threeCamera);
};

const handleMouseDown = (event) => {
    if (!canvasContainer.value || !floorMesh) return;

    const rect = canvasContainer.value.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, threeCamera);
    const intersects = raycaster.intersectObject(floorMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        if (playerMesh) {
            playerMesh.position.set(point.x, (1.0 * characterScale.value) / 2, point.z);
        }
    }
};

const handleSave = async () => {
    saving.value = true;
    try {
        const updatedData = {
            ...(scene.value.data || {}),
            character_scale: characterScale.value
        };

        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type,
                data: updatedData
            })
        });

        if (!response.ok) throw new Error('Save failed');

        // Also update local scene object just in case
        scene.value.data = updatedData;

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Scale saved successfully',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save scale', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const handleDeleteScene = async () => {
    if (!confirm(t('scenes.edit.confirm_delete'))) return;
    deleting.value = true;
    try {
        await fetch(`/api/scenes/${sceneId}`, { method: 'DELETE' });
        router.push('/scenes');
    } catch (error) {
        console.error(error);
    } finally {
        deleting.value = false;
    }
};

const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;

    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    if (width === 0 || height === 0) return;

    threeCamera.aspect = width / height;
    threeCamera.updateProjectionMatrix();

    renderer.setSize(width, height);

    if (cameraDebugInfo.value.found) {
        cameraDebugInfo.value.containerAspect = width / height;
    }
};

const setupResizeObserver = () => {
    if (resizeObserver) resizeObserver.disconnect();

    resizeObserver = new ResizeObserver(() => {
        handleResize();
    });

    if (canvasContainer.value) {
        resizeObserver.observe(canvasContainer.value);
    }
};

onMounted(() => {
    fetchInitialData();
    window.addEventListener('resize', handleResize);
    setupResizeObserver();
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (resizeObserver) resizeObserver.disconnect();
    if (renderer) {
        renderer.dispose();
    }
});

watch(characterScale, () => {
    updatePlayerScale();
});

</script>

<template>
    <div class="scene-scale-view">
        <EditViewHeader
            v-if="scene"
            backRoute="/scenes"
            parentName="SCENES"
            :itemName="scene.title"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDeleteScene"
        />

        <div v-if="loading" class="loading-state">
            {{ t('scenes.edit.loading') }}
        </div>

        <div v-else-if="scene" class="edit-layout">
            <!-- HEADER HERO -->
            <div class="edit-hero">
                <div class="edit-hero__left">
                    <h1 class="edit-hero__title">{{ scene.title }}</h1>
                </div>
                <div class="edit-hero__right">
                    <div class="scene-nav">
                        <router-link :to="`/scenes/${sceneId}/edit`" class="nav-link">{{ t('scenes.edit.nav_properties') }}</router-link>
                        <template v-if="scene.type === 'vue-component'">
                            <router-link :to="`/scenes/${sceneId}/settings`" class="nav-link">{{ t('scenes.edit.nav_settings') }}</router-link>
                        </template>
                        <template v-else>
                            <router-link :to="`/scenes/${sceneId}/gateway`" class="nav-link">{{ t('scenes.edit.nav_gateway') }}</router-link>
                            <router-link :to="`/scenes/${sceneId}/spawnpoint`" class="nav-link">{{ t('scenes.edit.nav_3d') }}</router-link>
                            <router-link :to="`/scenes/${sceneId}/scale`" class="nav-link active">{{ t('scenes.edit.nav_scale') }}</router-link>
                        </template>
                    </div>
                    <span class="edit-hero__id">ID:{{ sceneId }}</span>
                </div>
            </div>

            <div class="scene-edit-grid">
                <!-- LEFT: 3D VIEWPORT -->
                <div class="three-column">
                    <div
                        class="viewport-container"
                        :style="{
                            backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
                            aspectRatio: backdropAspectRatio
                        }"
                    >
                        <div
                            class="canvas-wrapper"
                            ref="canvasContainer"
                            @mousedown="handleMouseDown"
                        >
                            <!-- Three.js renderer will be injected here -->
                        </div>

                        <div class="drawing-overlay-hint">
                            <i class="pi pi-arrows-alt"></i>
                            <span>CLICK ON FLOOR TO POSITON FIGURE</span>
                        </div>

                        <!-- Camera Debug Overlay -->
                        <!-- <div class="camera-debug-overlay" v-if="cameraDebugInfo.found">
                            <div class="debug-title">CAMERA: {{ cameraDebugInfo.name }}</div>
                            <div class="debug-row">FOV: {{ cameraDebugInfo.fov.toFixed(2) }}° (Vertical)</div>
                            <div class="debug-row">SHIFT X: {{ cameraDebugInfo.shiftX.toFixed(3) }}</div>
                            <div class="debug-row">SHIFT Y: {{ cameraDebugInfo.shiftY.toFixed(3) }}</div>
                        </div>
                        <div class="camera-debug-overlay error" v-else>
                            <div class="debug-title">CANNOT FIND CAMERA IN GLB</div>
                        </div> -->

                        <div v-if="!glbUrl" class="no-glb-warning">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span>NO 3D MODEL LOADED FOR THIS SCENE</span>
                        </div>

                        <div v-if="isGlbLoaded && !floorFound" class="no-glb-warning">
                            <i class="pi pi-exclamation-circle"></i>
                            <span>FLOOR MESH NOT DETECTED (CHECK OBJECT NAMES)</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: SIDEBAR PROPERTIES -->
                <div class="properties-column">
                    <div class="scale-card">
                        <div class="scale-card__header">
                             <i class="pi pi-user"></i>
                             <span>CHARACTER SCALING</span>
                        </div>
                        <div class="scale-card__content">
                            <p class="description">
                                Adjust the height of the playable figure to match the scene's scale.
                                Click on the floor to move the figure for reference.
                            </p>

                            <div class="field">
                                <label>CURRENT SCALE ({{ characterScale.toFixed(2) }})</label>
                                <div class="slider-row">
                                    <Slider v-model="characterScale" :min="0.1" :max="10.0" :step="0.01" class="noir-slider" />
                                    <InputNumber v-model="characterScale" :min="0.1" :max="10.0" :minFractionDigits="2" :maxFractionDigits="2" class="noir-input tiny" :useGrouping="false" />
                                </div>
                            </div>

                            <div class="reference-info">
                                <div class="info-row">
                                    <span class="label">Reference height:</span>
                                    <span class="value">~1.80m (at 1.0 scale)</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">World height:</span>
                                    <span class="value">{{ (1.0 * characterScale).toFixed(2) }} units</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-scale-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-right: 1rem;
}

.edit-hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--color-noir-dark);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    border-left: 4px solid var(--color-noir-accent);
}

.edit-hero__title {
    margin: 0;
    font-size: 2.5rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #fff;
}

.edit-hero__right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.edit-hero__id {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.9rem;
}

.scene-nav {
    display: flex;
    gap: 0.5rem;
}

.nav-link {
    text-decoration: none;
    color: var(--color-noir-muted);
    font-weight: bold;
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.2s;
    border: 1px solid transparent;
}

.nav-link:hover {
    color: var(--color-noir-text);
    background: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
    color: #fff;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid var(--color-noir-accent);
}

.scene-edit-grid {
    display: grid;
    grid-template-columns: 5fr 2fr;
    gap: 1rem;
    flex: 1;
}

.three-column {
    min-width: 0;
}

.viewport-container {
    position: relative;
    width: 100%;
    min-height: 0;
    align-self: start;
    background-color: #000;
    background-size: 100% 100%;
    background-position: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
}

.canvas-wrapper {
    position: absolute;
    inset: 0;
    cursor: crosshair;
}

.canvas-wrapper :deep(canvas) {
    display: block;
}

.drawing-overlay-hint {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: bold;
    color: var(--color-noir-accent);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--color-noir-accent);
    pointer-events: none;
    z-index: 20;
}

.no-glb-warning {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    color: var(--color-noir-warning);
    gap: 1rem;
    pointer-events: none;
}

.no-glb-warning i {
    font-size: 3rem;
}

.properties-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.scale-card {
    background: var(--color-noir-panel);
    border: 1px solid #1f2937;
    border-radius: 4px;
    overflow: hidden;
}

.scale-card__header {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid #1f2937;
    font-weight: bold;
    color: var(--color-noir-accent);
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 1px;
}

.scale-card__content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.description {
    font-size: 0.8rem;
    color: var(--color-noir-muted);
    line-height: 1.4;
    margin: 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.field label {
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
}

.slider-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.noir-slider {
    flex: 1;
    height: 4px;
    background: #1f2937 !important;
    border: none !important;
}

.noir-input.tiny {
    width: 80px !important;
}

.noir-input.tiny :deep(.p-inputnumber-input) {
    width: 100% !important;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: #fff !important;
    padding: 0.4rem !important;
    text-align: center;
    font-size: 0.8rem;
    border-radius: 4px;
}

.reference-info {
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px dashed rgba(255, 255, 255, 0.1);
}

.info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
}

.info-row .label {
    color: var(--color-noir-muted);
}

.info-row .value {
    color: #fff;
    font-family: var(--font-mono);
}

:deep(.p-slider-handle) {
    width: 16px !important;
    height: 16px !important;
    background: #fff !important;
    border: 2px solid var(--color-noir-accent) !important;
    border-radius: 50% !important;
    cursor: grab;
    margin-top: -6px !important;
}

:deep(.p-slider-range) {
    background: var(--color-noir-accent) !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}

.camera-debug-overlay {
    position: absolute;
    top: 4rem;
    left: 1rem;
    background: rgba(0, 0, 0, 0.8);
    padding: 0.75rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: #4ade80;
    pointer-events: none;
    z-index: 30;
    border: 1px solid rgba(74, 222, 128, 0.3);
}

.camera-debug-overlay.error {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.3);
}

.debug-title {
    font-weight: bold;
    margin-bottom: 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 2px;
}
</style>
