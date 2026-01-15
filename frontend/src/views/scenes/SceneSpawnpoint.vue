<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
const selectedSpawnPointIndex = ref(-1);
const collapsedStates = ref({});
const backdropAspectRatio = ref(16 / 9);

// Three.js variables
let threeScene, threeCamera, renderer, controls, loader, raycaster, mouse;
let floorMesh = null;
let spawnPointMarkers = [];
let glbModel = null;
let glbCamera = null;
const isGlbLoaded = ref(false);
const floorFound = ref(false);
const isDragging = ref(false);
let draggedIndex = -1;
const projectedSpawnpoints = ref([]);

const spawnPointTypes = [
    { label: 'Entry', value: 'entry' },
    { label: 'Player', value: 'player' },
    { label: 'NPC', value: 'npc' },
    { label: 'Prop', value: 'prop' },
    { label: 'Goto', value: 'goto' }
];

const toggleCollapse = (index) => {
    collapsedStates.value[index] = !collapsedStates.value[index];
};

const fetchInitialData = async () => {
    try {
        const response = await fetch(`/api/scenes/${sceneId}`);
        if (!response.ok) throw new Error('Failed to fetch scene');
        scene.value = await response.json();

        if (!scene.value['3d_spawnpoints']) {
            scene.value['3d_spawnpoints'] = [];
        } else {
            scene.value['3d_spawnpoints'].forEach((sp, index) => {
                collapsedStates.value[index] = true;
            });
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
                nextTick(() => handleResize()); // Resize three.js when aspect changes
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

const onGlbUpload = async (event) => {
    const file = event.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageable_id', sceneId);
    formData.append('imageable_type', 'App\\Models\\Scene');
    formData.append('title', `3D Model for ${scene.value.title}`);

    try {
        const response = await fetch('/api/media', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const newMedia = await response.json();
        if (!scene.value.media) scene.value.media = [];
        // Replace existing 3d model if it exists
        scene.value.media = scene.value.media.filter(m => m.type !== '3d');
        scene.value.media.push(newMedia);

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: '3D model updated',
            life: 3000
        });

        // Refresh scene
        isGlbLoaded.value = false;
        floorFound.value = false;
        if (glbModel) {
            threeScene.remove(glbModel);
            glbModel = null;
        }
        initThree();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload GLB model',
            life: 3000
        });
    }
};

const deleteGlb = async () => {
    const glb = currentGlb.value;
    if (!glb) return;
    if (!confirm('Are you sure you want to delete the 3D model?')) return;

    try {
        const response = await fetch(`/api/media/${glb.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        scene.value.media = scene.value.media.filter(m => m.id !== glb.id);

        // Clear three.js scene
        if (glbModel) {
            threeScene.remove(glbModel);
            glbModel = null;
        }
        floorMesh = null;
        floorFound.value = false;
        isGlbLoaded.value = false;

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: '3D model deleted',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete 3D model',
            life: 3000
        });
    }
};

const initThree = () => {
    if (!canvasContainer.value) return;

    // Setup Scene
    threeScene = new THREE.Scene();

    // Setup Camera
    threeCamera = new THREE.PerspectiveCamera(50, canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 0.1, 1000);
    threeCamera.position.set(0, 5, 10);
    threeCamera.lookAt(0, 0, 0);

    // Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.value.appendChild(renderer.domElement);

    // Setup Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    threeScene.add(dirLight);

    // Grid Helper for visibility (Disabled for final view but kept in code)
    // const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    // threeScene.add(gridHelper);

    // Controls (DIsabled as per user request to lock fSpy view)
    // controls = new OrbitControls(threeCamera, renderer.domElement);
    // controls.enableDamping = true;

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Load Model
    if (glbUrl.value) {
        console.log("Loading GLB from:", glbUrl.value);
        loader = new GLTFLoader();
        loader.load(glbUrl.value, (gltf) => {
            console.log("GLB Loaded successfully");
            glbModel = gltf.scene;

            // Do NOT center model if using fSpy/aligned views, as camera depends on original origin
            // const box = new THREE.Box3().setFromObject(glbModel);
            // const center = box.getCenter(new THREE.Vector3());
            // glbModel.position.sub(center);

            threeScene.add(glbModel);
            isGlbLoaded.value = true;

            // Search for floor and cameras, and set transparency
            glbModel.traverse((child) => {
                if (child.isMesh) {
                    console.log("Found mesh:", child.name);

                    // Apply transparency and colors
                    if (child.material) {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                        child.material.opacity = 0.5;
                        child.material.depthWrite = false;

                        if (child.name.toLowerCase().includes('floor')) {
                            child.material.color.set(0x3b82f6); // Noir Blue
                            floorMesh = child;
                            floorFound.value = true;
                            console.log("Floor detected & colored Blue:", child.name);
                        } else if (child.name.toLowerCase().includes('mask')) {
                            child.material.color.set(0xd946ef); // Noir Magenta
                            console.log("Mask detected & colored Magenta:", child.name);
                        }
                    }
                }
                if (child.isCamera) {
                    glbCamera = child;
                    console.log("Found camera in GLB:", child.name);
                }
            });

            if (!floorMesh) {
                console.warn("No 'floor' object found in GLB for raycasting.");
                // Fallback: try to find any large horizontal plane if no 'floor'
            }

            if (glbCamera) {
                console.log("Updating to GLB camera.");

                // Ensure camera world matrix is correct if it has parents
                threeScene.updateMatrixWorld(true);

                threeCamera = glbCamera;
                threeCamera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
                threeCamera.updateProjectionMatrix();

                // Controls removed as per request
                // if (controls) controls.dispose();
                // controls = new OrbitControls(threeCamera, renderer.domElement);
                // controls.enableDamping = true;

                // Set target removed
                // const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(threeCamera.quaternion);
                // controls.target.copy(threeCamera.position).add(dir.multiplyScalar(5));
                // controls.update();
            } else {
                // Adjust default camera to fit model if no GLB camera
                const box = new THREE.Box3().setFromObject(glbModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                threeCamera.position.z = maxDim * 2;
                threeCamera.position.y = maxDim;
                threeCamera.lookAt(0, 0, 0);
            }

            updateSpawnPointMarkers();
        }, (xhr) => {
            if (xhr.total > 0) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            } else {
                console.log(xhr.loaded + ' bytes loaded');
            }
        }, (error) => {
            console.error("Error loading GLB:", error);
        });
    }

    animate();
};

const updateProjectedCoordinates = () => {
    if (!threeScene || !threeCamera || !canvasContainer.value || !scene.value) return;

    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    const widthHalf = width / 2;
    const heightHalf = height / 2;

    const spawnpoints = scene.value['3d_spawnpoints'] || [];

    projectedSpawnpoints.value = spawnpoints.map((sp, index) => {
        const vector = new THREE.Vector3(sp.x, sp.y + 0.8, sp.z); // 0.8 offset to be above the cone
        vector.project(threeCamera);

        return {
            id: index,
            name: sp.name || `Spawnpoint ${index + 1}`,
            x: (vector.x * widthHalf) + widthHalf,
            y: -(vector.y * heightHalf) + heightHalf,
            visible: vector.z < 1,
            isSelected: selectedSpawnPointIndex.value === index
        };
    });
};

const animate = () => {
    if (!renderer) return;
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(threeScene, threeCamera);
    updateProjectedCoordinates();
};

const handleMouseDown = (event) => {
    if (!canvasContainer.value) return;

    const rect = canvasContainer.value.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, threeCamera);

    // Check if we hit a marker first (for dragging)
    const markerIntersects = raycaster.intersectObjects(spawnPointMarkers, true);
    if (markerIntersects.length > 0) {
        // Find the group parent which has the index
        let obj = markerIntersects[0].object;
        while (obj && !obj.userData || obj.userData.index === undefined) {
            obj = obj.parent;
            if (!obj || obj === threeScene) break;
        }

        if (obj && obj.userData && obj.userData.index !== undefined) {
            draggedIndex = obj.userData.index;
            selectedSpawnPointIndex.value = draggedIndex;
            isDragging.value = true;
            return;
        }
    }

    // If no marker hit, check if we hit the floor (for placement)
    if (floorMesh) {
        const floorIntersects = raycaster.intersectObject(floorMesh);
        if (floorIntersects.length > 0) {
            const point = floorIntersects[0].point;
            addSpawnPoint(point.x, point.y, point.z);
        }
    }
};

const handleMouseMove = (event) => {
    if (!isDragging.value || draggedIndex === -1 || !floorMesh) return;

    const rect = canvasContainer.value.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, threeCamera);
    const intersects = raycaster.intersectObject(floorMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const sp = scene.value['3d_spawnpoints'][draggedIndex];
        sp.x = parseFloat(point.x.toFixed(3));
        sp.y = parseFloat(point.y.toFixed(3)); // Update Y too just in case
        sp.z = parseFloat(point.z.toFixed(3));
        // Markers update automatically via deep watcher
    }
};

const handleMouseUp = () => {
    isDragging.value = false;
    draggedIndex = -1;
};

const addSpawnPoint = (x, y, z) => {
    const newSP = {
        name: `Spawnpoint ${scene.value['3d_spawnpoints'].length + 1}`,
        type: 'player',
        direction: 0,
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        z: parseFloat(z.toFixed(3))
    };

    scene.value['3d_spawnpoints'].push(newSP);
    selectedSpawnPointIndex.value = scene.value['3d_spawnpoints'].length - 1;
    collapsedStates.value[selectedSpawnPointIndex.value] = false;
    updateSpawnPointMarkers();
};

const updateSpawnPointMarkers = () => {
    if (!threeScene) return;

    // Clear old markers
    spawnPointMarkers.forEach(m => threeScene.remove(m));
    spawnPointMarkers = [];

    if (!scene.value || !scene.value['3d_spawnpoints']) return;

    scene.value['3d_spawnpoints'].forEach((sp, index) => {
        const isSelected = selectedSpawnPointIndex.value === index;
        const color = isSelected ? 0x3b82f6 : 0xef4444;

        // Group to hold cone and beak
        const group = new THREE.Group();
        group.position.set(sp.x, sp.y + 0.25, sp.z);

        // Main Cone
        const geometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: isSelected ? 0x1d4ed8 : 0x991b1b,
            emissiveIntensity: 0.5
        });
        const cone = new THREE.Mesh(geometry, material);
        cone.rotation.x = Math.PI; // Invert cone to point down
        group.add(cone);

        // Direction Beak (small cone pointing forward)
        const beakGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
        const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);

        // Position beak at the "front" of the spawnpoint
        beak.position.set(0, 0, -0.25);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Apply orientation to the group
        group.rotateY(sp.direction * (Math.PI / 180));

        group.userData = { index };
        threeScene.add(group);
        spawnPointMarkers.push(group);
    });
};

const deleteSpawnPoint = (index) => {
    scene.value['3d_spawnpoints'].splice(index, 1);
    if (selectedSpawnPointIndex.value === index) selectedSpawnPointIndex.value = -1;
    updateSpawnPointMarkers();
};

const selectSpawnPoint = (index) => {
    selectedSpawnPointIndex.value = index;
    collapsedStates.value[index] = false;
    updateSpawnPointMarkers();
};

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type,
                '3d_spawnpoints': scene.value['3d_spawnpoints']
            })
        });

        if (!response.ok) throw new Error('Save failed');
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Spawnpoints saved successfully',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save spawnpoints', life: 3000 });
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
    threeCamera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
    threeCamera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
};

onMounted(() => {
    fetchInitialData();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (renderer) {
        renderer.dispose();
    }
});

watch(() => selectedSpawnPointIndex.value, () => {
    updateSpawnPointMarkers();
});

watch(() => scene.value?.['3d_spawnpoints'], () => {
    updateSpawnPointMarkers();
}, { deep: true });

</script>

<template>
    <div class="scene-spawnpoint-view">
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
                        <router-link :to="`\/scenes\/${sceneId}\/edit`" class="nav-link">{{ t('scenes.edit.nav_properties') }}</router-link>
                        <template v-if="scene.type === 'vue-component'">
                            <router-link :to="`\/scenes\/${sceneId}\/settings`" class="nav-link">{{ t('scenes.edit.nav_settings') }}</router-link>
                        </template>
                        <template v-else>
                            <router-link :to="`\/scenes\/${sceneId}\/gateway`" class="nav-link">{{ t('scenes.edit.nav_gateway') }}</router-link>
                            <router-link :to="`\/scenes\/${sceneId}\/spawnpoint`" class="nav-link active">{{ t('scenes.edit.nav_3d') }}</router-link>
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
                            @mousemove="handleMouseMove"
                            @mouseup="handleMouseUp"
                            @mouseleave="handleMouseUp"
                        >
                            <!-- Three.js renderer will be injected here -->
                        </div>

                        <!-- Labels Layer -->
                        <div class="labels-layer">
                            <div
                                v-for="sp in projectedSpawnpoints"
                                :key="sp.id"
                                v-show="sp.visible"
                                class="spawnpoint-label"
                                :class="{ 'active': sp.isSelected }"
                                :style="{
                                    left: `${sp.x}px`,
                                    top: `${sp.y}px`
                                }"
                                @click="selectSpawnPoint(sp.id)"
                            >
                                <span class="label-text">{{ sp.name }}</span>
                                <div class="label-anchor"></div>
                            </div>
                        </div>

                        <div class="drawing-overlay-hint">
                            <i class="pi pi-map-marker"></i>
                            <span>CLICK ON FLOOR TO PLACE SPAWNPOINT</span>
                        </div>

                        <div class="glb-actions">
                            <FileUpload
                                mode="basic"
                                name="file"
                                accept=".glb"
                                :maxFileSize="20000000"
                                @uploader="onGlbUpload"
                                customUpload
                                auto
                                severity="secondary"
                                :chooseLabel="glbUrl ? 'CHANGE MODEL' : 'UPLOAD GLB'"
                                icon="pi pi-upload"
                                class="noir-fileupload"
                            />
                            <Button
                                v-if="glbUrl"
                                icon="pi pi-trash"
                                severity="danger"
                                text
                                @click="deleteGlb"
                                class="glb-delete-btn"
                            />
                        </div>

                        <div v-if="!glbUrl" class="no-glb-warning">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span>NO 3D MODEL LOADED FOR THIS SCENE</span>
                        </div>

                        <div v-if="glbUrl && !isGlbLoaded" class="no-glb-warning">
                            <i class="pi pi-spin pi-spinner"></i>
                            <span>LOADING 3D DATA...</span>
                        </div>

                        <div v-if="isGlbLoaded && !floorFound" class="no-glb-warning">
                            <i class="pi pi-exclamation-circle"></i>
                            <span>FLOOR MESH NOT DETECTED (CHECK OBJECT NAMES)</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: SIDEBAR PROPERTIES -->
                <div class="properties-column">
                    <div v-if="scene['3d_spawnpoints'].length === 0" class="no-gateways-hint">
                        No spawnpoints defined yet. Click on the 3D floor to place one.
                    </div>

                    <div
                        v-for="(sp, index) in scene['3d_spawnpoints']"
                        :key="index"
                        class="gateway-card"
                        :class="{ 'active': selectedSpawnPointIndex === index, 'collapsed': collapsedStates[index] }"
                        @click="selectSpawnPoint(index)"
                    >
                        <div class="gateway-card__header" @click.stop="toggleCollapse(index)">
                            <div class="gateway-type-indicator" :class="sp.type"></div>
                            <span class="gateway-card__title">
                                {{ sp.name || 'Unnamed Spawnpoint' }}
                                <span v-if="collapsedStates[index]" class="header-label"> - {{ sp.type }}</span>
                            </span>
                            <div class="header-actions">
                                <Button
                                    :icon="collapsedStates[index] ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
                                    text
                                    class="collapse-btn"
                                    @click.stop="toggleCollapse(index)"
                                />
                                <Button icon="pi pi-trash" severity="danger" text class="gateway-card__delete" @click.stop="deleteSpawnPoint(index)" />
                            </div>
                        </div>

                        <div v-if="!collapsedStates[index]" class="gateway-card__content">
                            <div class="field">
                                <label>IDENTIFICATION</label>
                                <InputText v-model="sp.name" class="noir-input w-full" placeholder="e.g. Player Start" />
                            </div>

                            <div class="field">
                                <label>SPAWN TYPE</label>
                                <Select
                                    v-model="sp.type"
                                    :options="spawnPointTypes"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="noir-select w-full"
                                />
                            </div>

                            <div class="field">
                                <label>DIRECTION ({{ sp.direction }}°)</label>
                                <div class="slider-row">
                                    <Slider v-model="sp.direction" :min="0" :max="360" class="noir-slider" />
                                    <InputNumber v-model="sp.direction" :min="0" :max="360" class="noir-input tiny" :useGrouping="false" />
                                </div>
                            </div>

                            <div class="field-row">
                                <div class="field half">
                                    <label>X POSITION</label>
                                    <InputNumber v-model="sp.x" :minFractionDigits="2" :maxFractionDigits="3" class="noir-input w-full" />
                                </div>
                                <div class="field half">
                                    <label>Z POSITION</label>
                                    <InputNumber v-model="sp.z" :minFractionDigits="2" :maxFractionDigits="3" class="noir-input w-full" />
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
.scene-spawnpoint-view {
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
    /* aspect-ratio will be set dynamically via v-bind or style */
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
    width: 100% !important;
    height: 100% !important;
}

.labels-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    overflow: hidden;
}

.spawnpoint-label {
    position: absolute;
    transform: translate(-50%, -100%);
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: transform 0.1s ease-out;
}

.spawnpoint-label.active .label-text {
    background: var(--color-noir-accent);
    border-color: #fff;
    color: #fff;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
}

.label-text {
    background: rgba(0, 0, 0, 0.85);
    color: var(--color-noir-accent);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
    white-space: nowrap;
    border: 1px solid var(--color-noir-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    backdrop-filter: blur(2px);
}

.label-anchor {
    width: 2px;
    height: 10px;
    background: var(--color-noir-accent);
}

.spawnpoint-label.active .label-anchor {
    background: #fff;
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

.glb-actions {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    z-index: 20;
}

.noir-fileupload :deep(.p-button) {
    background: rgba(0, 0, 0, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: white !important;
    font-size: 0.7rem !important;
    font-weight: bold !important;
}

.noir-fileupload :deep(.p-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
}

.glb-delete-btn {
    background: rgba(220, 38, 38, 0.2) !important;
    border: 1px solid rgba(220, 38, 38, 0.5) !important;
    width: 2.2rem !important;
    height: 2.2rem !important;
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

.no-gateways-hint {
    padding: 2rem;
    text-align: center;
    color: var(--color-noir-muted);
    font-style: italic;
    background: var(--color-noir-panel);
    border-radius: 4px;
}

.gateway-card {
    background: var(--color-noir-panel);
    border: 1px solid #1f2937;
    border-radius: 4px;
    margin-bottom: 1rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
}

.gateway-card.active {
    border-color: var(--color-noir-accent);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);
}

.gateway-card__header {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid #1f2937;
    cursor: pointer;
}

.collapsed .gateway-card__header {
    border-bottom: none;
}

.gateway-type-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.gateway-type-indicator.entry { background: #22c55e; }
.gateway-type-indicator.player { background: #3b82f6; }
.gateway-type-indicator.npc { background: #f59e0b; }
.gateway-type-indicator.prop { background: #8b5cf6; }
.gateway-type-indicator.goto { background: #06b6d4; } /* Cyan */

.gateway-card__title {
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
    flex: 1;
}

.header-label {
    color: var(--color-noir-muted);
    text-transform: none;
    font-weight: normal;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.collapse-btn {
    width: 2rem !important;
    height: 2rem !important;
    color: var(--color-noir-muted) !important;
}

.gateway-card__content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field-row {
    display: flex;
    gap: 0.5rem;
}

.field.half {
    flex: 1;
}

.field label {
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
}

.noir-input, .noir-select {
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}

.slider-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
}

.noir-slider {
    flex: 1;
    height: 4px;
    background: #1f2937 !important;
    border: none !important;
}

.noir-input.tiny {
    width: 70px !important;
}

/* Specific styling for the numeric input field */
.noir-input.tiny :deep(.p-inputnumber-input) {
    width: 100% !important;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
    padding: 0.4rem !important;
    text-align: center;
    font-size: 0.8rem;
    border-radius: 4px;
}

/* Fix Slider Handle */
:deep(.p-slider-handle) {
    width: 16px !important;
    height: 16px !important;
    background: #fff !important;
    border: 2px solid var(--color-noir-accent) !important;
    border-radius: 50% !important;
    cursor: grab;
    margin-top: -6px !important; /* Center on 4px height track */
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
    z-index: 2;
}

:deep(.p-slider-handle:active) {
    cursor: grabbing;
}

:deep(.p-slider-range) {
    background: var(--color-noir-accent) !important;
}
</style>
