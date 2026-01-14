<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import EditViewHeader from '@components/customs/EditViewHeader.vue';

const { t } = useI18n();
const toast = useToast();
const router = useRouter();

const scenes = ref([]);
const sectors = ref([]);
const mapBackground = ref('');
const loading = ref(true);
const mapContainer = ref(null);
const draggingScene = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const hasMoved = ref(false);
const isDragging = ref(false); 
const showBackdropModal = ref(false);
const backdropFile = ref(null);
const spreading = ref(false);
const saving = ref(false);
const cleanupMenu = ref(null);
const cleanupItems = computed(() => [
    { label: t('scenes.map.cleanup_by_name'), icon: 'pi pi-sort-alpha-down', command: () => cleanup('name') },
    { label: t('scenes.map.cleanup_by_sector'), icon: 'pi pi-map', command: () => cleanup('sector') },
    { label: t('scenes.map.cleanup_on_grid'), icon: 'pi pi-table', command: () => cleanup('grid') }
]);

// Map Canvas dimensions (Maintains 16:9)
const canvasSize = ref({ w: 0, h: 0 });
const mapAspectRatio = 16 / 9;

const selectedSectorId = ref(Number(sessionStorage.getItem('scenes_map_filter_sector')) || null);

watch(selectedSectorId, (val) => {
    if (val) sessionStorage.setItem('scenes_map_filter_sector', val);
    else sessionStorage.removeItem('scenes_map_filter_sector');
});

const updateCanvasSize = () => {
    if (!mapContainer.value) return;
    const cw = mapContainer.value.clientWidth;
    const ch = mapContainer.value.clientHeight;
    if (!cw || !ch) return;

    const contAR = cw / ch;
    if (contAR > mapAspectRatio) {
        canvasSize.value = { w: ch * mapAspectRatio, h: ch };
    } else {
        canvasSize.value = { w: cw, h: cw / mapAspectRatio };
    }
};

const canvasStyle = computed(() => ({
    width: `${canvasSize.value.w}px`,
    height: `${canvasSize.value.h}px`,
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#000'
}));

const onBackdropFileChange = (event) => {
    backdropFile.value = event.target.files[0];
};

const updateBackdrop = async () => {
    if (!backdropFile.value) return;
    try {
        const formData = new FormData();
        formData.append('image', backdropFile.value);
        const res = await fetch('/api/configs/upload-backdrop', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Failed to upload');
        const data = await res.json();
        mapBackground.value = data.value;
        showBackdropModal.value = false;
        backdropFile.value = null;
        toast.add({ severity: 'success', summary: 'Success', detail: 'Backdrop updated.', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed.' });
    }
};

const fetchMapData = async () => {
    try {
        const [scenesRes, sectorsRes, configRes] = await Promise.all([
            fetch('/api/scenes'),
            fetch('/api/sectors'),
            fetch('/api/configs/map_backdrop')
        ]);
        scenes.value = await scenesRes.json();
        sectors.value = await sectorsRes.json();
        if (configRes.ok) {
            const configData = await configRes.json();
            mapBackground.value = configData?.value || '';
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Data fetch failed.' });
    } finally {
        loading.value = false;
        updateCanvasSize();
    }
};

const backgroundUrl = computed(() => {
    if (!mapBackground.value) return '';
    return mapBackground.value.startsWith('http') ? mapBackground.value : `/storage/${mapBackground.value}`;
});

const filteredScenes = computed(() => {
    if (!selectedSectorId.value) return scenes.value;
    return scenes.value.filter(s => s.sector_id === selectedSectorId.value);
});

const getScenePosition = (scene) => {
    const dims = scene.thumb_dimensions || { x: 50, y: 50 };
    return { x: Number(dims.x), y: Number(dims.y) };
};

const getSceneStyle = (scene) => {
    const pos = getScenePosition(scene);
    return {
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: '6.6%' // Shrinking to 2/3 of 10%
    };
};

const startDrag = (event, scene) => {
    event.preventDefault();
    draggingScene.value = scene;
    isDragging.value = true;
    hasMoved.value = false;

    const canvasRect = mapContainer.value.querySelector('.map-canvas').getBoundingClientRect();
    const sceneRect = event.currentTarget.getBoundingClientRect();
    
    dragOffset.value = {
        x: ((event.clientX - sceneRect.left) / canvasRect.width) * 100,
        y: ((event.clientY - sceneRect.top) / canvasRect.height) * 100
    };

    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', stopDrag);
};

const onDragging = (event) => {
    if (!draggingScene.value || !mapContainer.value) return;

    const canvasElement = mapContainer.value.querySelector('.map-canvas');
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    
    let mx = ((event.clientX - rect.left) / rect.width) * 100;
    let my = ((event.clientY - rect.top) / rect.height) * 100;

    if (!draggingScene.value.thumb_dimensions) draggingScene.value.thumb_dimensions = { x: 0, y: 0 };
    
    // Limits: thumb width 6.6%, Height approx 10%
    draggingScene.value.thumb_dimensions.x = Math.max(0, Math.min(93, mx - dragOffset.value.x));
    draggingScene.value.thumb_dimensions.y = Math.max(0, Math.min(90, my - dragOffset.value.y));
    
    hasMoved.value = true;
};

const stopDrag = async () => {
    window.removeEventListener('mousemove', onDragging);
    window.removeEventListener('mouseup', stopDrag);
    isDragging.value = false;

    if (draggingScene.value && hasMoved.value) {
        await saveScenePosition(draggingScene.value);
    }
    draggingScene.value = null;
};

const saveScenePosition = async (scene) => {
    try {
        await fetch(`/api/scenes/${scene.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: scene.title,
                type: scene.type,
                thumb_dimensions: scene.thumb_dimensions
            })
        });
    } catch (e) {}
};

const cleanup = async (mode) => {
    if (filteredScenes.value.length === 0) return;
    
    spreading.value = true;
    
    let sorted = [];
    if (mode === 'name') {
        sorted = [...filteredScenes.value].sort((a, b) => a.title.localeCompare(b.title));
    } else if (mode === 'sector') {
        sorted = [...filteredScenes.value].sort((a, b) => {
            const sA = sectors.value.find(s => s.id === a.sector_id)?.name || '';
            const sB = sectors.value.find(s => s.id === b.sector_id)?.name || '';
            if (sA !== sB) return sA.localeCompare(sB);
            return a.title.localeCompare(b.title);
        });
    }

    const count = filteredScenes.value.length;
    // Automatic sorting modes use a tighter 16/9 grid
    // Grid alignment mode uses a coarser grid (fewer columns) to make snapping more obvious
    const aspectRatioFactor = mode === 'grid' ? 1.0 : 1.77; 
    const cols = Math.ceil(Math.sqrt(count * aspectRatioFactor));
    const rows = Math.ceil(count / cols);
    
    const hPadding = 8;
    const vPadding = 12;
    const usableWidth = 100 - (2 * hPadding);
    const usableHeight = 100 - (2 * vPadding);
    
    const colSpacing = usableWidth / Math.max(1, cols - 1 || 1);
    const rowSpacing = usableHeight / Math.max(1, rows - 1 || 1);

    if (mode === 'grid') {
        const gridPoints = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let x = hPadding + (c * colSpacing);
                let y = vPadding + (r * rowSpacing);
                if (cols === 1) x = 50 - 3.3;
                if (rows === 1) y = 45;
                gridPoints.push({ x, y, occupied: false });
            }
        }

        const scenesToAssign = [...filteredScenes.value].sort((a, b) => {
            const posA = getScenePosition(a);
            const posB = getScenePosition(b);
            if (posA.y !== posB.y) return posA.y - posB.y;
            return posA.x - posB.x;
        });

        scenesToAssign.forEach(scene => {
            const currentPos = getScenePosition(scene);
            let bestPoint = null;
            let minDist = Infinity;

            gridPoints.forEach(point => {
                if (point.occupied) return;
                const dist = Math.sqrt(Math.pow(point.x - currentPos.x, 2) + Math.pow(point.y - currentPos.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    bestPoint = point;
                }
            });

            if (bestPoint) {
                bestPoint.occupied = true;
                const updatedScene = scenes.value.find(s => s.id === scene.id);
                if (updatedScene) {
                    updatedScene.thumb_dimensions = { 
                        x: Math.max(2, Math.min(91, bestPoint.x)), 
                        y: Math.max(2, Math.min(88, bestPoint.y)) 
                    };
                }
            }
        });
    } else {
        sorted.forEach((scene, index) => {
            const c = index % cols;
            const r = Math.floor(index / cols);
            
            let x = hPadding + (c * colSpacing);
            let y = vPadding + (r * rowSpacing);

            if (cols === 1) x = 50 - 3.3; 
            if (rows === 1) y = 45;

            const updatedScene = scenes.value.find(s => s.id === scene.id);
            if (updatedScene) {
                updatedScene.thumb_dimensions = { 
                    x: Math.max(2, Math.min(91, x)), 
                    y: Math.max(2, Math.min(88, y)) 
                };
            }
        });
    }

    spreading.value = false;
    await saveAllPositions();
};

const saveAllPositions = async () => {
    saving.value = true;
    try {
        const data = filteredScenes.value.map(s => ({
            id: s.id,
            thumb_dimensions: s.thumb_dimensions
        }));

        const res = await fetch('/api/scenes/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenes: data })
        });

        if (res.ok) {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Layout optimized and saved.', life: 3000 });
        }
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save layout.' });
    } finally {
        saving.value = false;
    }
};

const getThumbUrl = (scene) => {
    if (scene.media && scene.media.length > 0) {
        const thumb = scene.media.find(m => m.type === '2d') || scene.media[0];
        const file = thumb.filepad;
        return file.startsWith('http') ? file : `/storage/${file}`;
    }
    return null;
};

const connections = computed(() => {
    const list = [];
    const sceneMap = {};
    filteredScenes.value.forEach(s => sceneMap[s.id] = s);
    filteredScenes.value.forEach(scene => {
        if (scene['2d_gateways']) {
            scene['2d_gateways'].forEach(gw => {
                const targetId = Number(gw.target_scene_id);
                if (targetId && sceneMap[targetId]) {
                    list.push({ from: scene.id, to: targetId, id: `${scene.id}-${targetId}` });
                }
            });
        }
    });
    return list;
});

const getLinePath = (conn) => {
    const fromScene = scenes.value.find(s => s.id === conn.from);
    const toScene = scenes.value.find(s => s.id === conn.to);
    if (!fromScene || !toScene || !canvasSize.value.w) return '';

    const cw = canvasSize.value.w;
    const ch = canvasSize.value.h;
    const fp = getScenePosition(fromScene);
    const tp = getScenePosition(toScene);

    // Thumb dimensions in pixels (6.6% width)
    const tw = cw * 0.066;
    const th = (tw * 9 / 16) + 26; // Reduced height offset (ID removed)

    // Centers in absolute pixel space
    const fPx = { x: (fp.x * cw / 100) + tw/2, y: (fp.y * ch / 100) + th/2 };
    const tPx = { x: (tp.x * cw / 100) + tw/2, y: (tp.y * ch / 100) + th/2 };

    const dx = tPx.x - fPx.x;
    const dy = tPx.y - fPx.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < tw) return '';

    const angle = Math.atan2(dy, dx);
    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    
    // Intersection with rect in uniform pixel space
    const hw = tw / 2;
    const hh = th / 2;
    const scale = (hw * absSin <= hh * absCos) ? (hw / absCos) : (hh / absSin);

    // Intersection points in pixels
    const sPx = { x: fPx.x + Math.cos(angle) * scale, y: fPx.y + Math.sin(angle) * scale };
    const ePx = { x: tPx.x - Math.cos(angle) * (scale + 8), y: tPx.y - Math.sin(angle) * (scale + 8) };

    // Use absolute pixel coordinates for the path, but match SVG's coordinate system
    // We'll update the SVG to use viewBox=canvasSize pixels to avoid distortion
    return `M ${sPx.x} ${sPx.y} L ${ePx.x} ${ePx.y}`;
};

onMounted(() => {
    fetchMapData();
    window.addEventListener('resize', updateCanvasSize);
});

onUnmounted(() => {
    window.removeEventListener('mousemove', onDragging);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('resize', updateCanvasSize);
});
</script>

<template>
    <div class="scene-map-view" :class="{ 'is-dragging': isDragging }">
        <EditViewHeader 
            backRoute="/scenes" 
            parentName="SCENES" 
            itemName="MAP" 
            :saving="saving" 
            @save="saveAllPositions"
            :showDelete="false"
            ref="header"
        >
            <template #extra-actions>
                <div class="header-filters">
                    <Select v-model="selectedSectorId" :options="sectors" optionLabel="name" optionValue="id" placeholder="All Sectors" showClear class="noir-select" />
                    <Button type="button" :label="t('scenes.map.cleanup')" severity="secondary" class="header-btn" icon="pi pi-th-large" @click="(event) => cleanupMenu.toggle(event)" :loading="spreading || saving" />
                    <Menu ref="cleanupMenu" :model="cleanupItems" :popup="true" class="noir-menu" />
                    <Button label="UPDATE BACKDROP" severity="info" class="header-btn" icon="pi pi-image" @click="showBackdropModal = true" />
                </div>
            </template>
        </EditViewHeader>

        <Dialog v-model:visible="showBackdropModal" modal header="UPLOAD MAP BACKDROP" :style="{ width: '400px' }" class="noir-modal">
            <div class="backdrop-modal-content">
                <div class="field">
                    <label class="noir-label">SELECT IMAGE</label>
                    <input type="file" @change="onBackdropFileChange" accept="image/*" class="noir-file-input mb-4" />
                </div>
                <div class="modal-actions">
                    <Button label="CANCEL" text plain @click="showBackdropModal = false" class="cancel-btn" />
                    <Button label="UPLOAD" severity="success" @click="updateBackdrop" class="save-btn" />
                </div>
            </div>
        </Dialog>

        <div class="map-viewport" ref="mapContainer">
            <div class="map-canvas" :style="canvasStyle">
                <div class="map-backdrop" :style="`background-image: url(${backgroundUrl});`" />
                
                <!-- Matching viewBox to pixel size of canvas to fix arrow distortion -->
                <svg class="map-connections" :viewBox="`0 0 ${canvasSize.w} ${canvasSize.h}`">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                            <path d="M0,0 L0,10 L10,5 Z" fill="var(--color-noir-accent)" opacity="0.8" />
                        </marker>
                    </defs>
                    <path v-for="conn in connections" :key="conn.id" :d="getLinePath(conn)" class="connection-line" marker-end="url(#arrowhead)" />
                </svg>

                <div v-for="scene in filteredScenes" :key="scene.id"
                     class="map-scene-thumb"
                     :class="{ 'entry-point': (sectors.find(s => s.id === scene.sector_id)?.entry_scene_id === scene.id) }"
                     :style="getSceneStyle(scene)"
                     @mousedown="startDrag($event, scene)"
                >
                    <div class="thumb-header">
                         <span class="scene-type">{{ scene.type }}</span>
                         <div v-if="sectors.find(s => s.id === scene.sector_id)?.entry_scene_id === scene.id" class="entry-indicator" />
                    </div>
                    <div class="thumb-media">
                        <img v-if="getThumbUrl(scene)" :src="getThumbUrl(scene)" draggable="false" />
                        <div v-else class="no-thumb">NO IMAGE</div>
                    </div>
                    <div class="thumb-footer">
                        <div class="scene-title" @click.stop="router.push(`/scenes/${scene.id}/edit`)">
                            {{ scene.title }}
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="loading" class="loading-overlay">LOADING ARCHIVE DATA...</div>
        </div>
    </div>
</template>

<style scoped>
.scene-map-view {
    height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    padding-right: 1rem;
}

.scene-map-view.is-dragging,
.scene-map-view.is-dragging * {
    cursor: grabbing !important;
}

.map-viewport {
    flex: 1;
    position: relative;
    background: #000;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.map-canvas {
    position: relative;
    overflow: hidden;
}

.map-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(8px) brightness(0.25);
    opacity: 0.6;
}

.map-connections {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.connection-line {
    fill: none;
    stroke: var(--color-noir-accent);
    stroke-width: 1.5; /* SVG now in pixels */
    stroke-dasharray: 4;
    opacity: 0.6;
}

.is-dragging .connection-line {
    transition: none !important;
}

.map-scene-thumb {
    position: absolute;
    background: rgba(11, 15, 25, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: grab;
    z-index: 10;
    user-select: none;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    overflow: hidden;
}

.is-dragging .map-scene-thumb {
    cursor: grabbing;
    opacity: 0.9;
}

.map-scene-thumb:hover {
    border-color: var(--color-noir-accent);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    z-index: 20;
}

.map-scene-thumb.entry-point {
    border-color: #22c55e;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
}

.thumb-header {
    padding: 2px 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
}

.scene-type { font-size: 0.4rem; text-transform: uppercase; color: var(--color-noir-muted); }
.entry-indicator { width: 4px; height: 4px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 4px #22c55e; }

.thumb-media { aspect-ratio: 16 / 9; background: #05070a; overflow: hidden; cursor: pointer; }
.thumb-media img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
.no-thumb { font-size: 0.4rem; color: var(--color-noir-muted); display: flex; align-items: center; justify-content: center; height: 100%; }

.thumb-footer { padding: 4px; }
.scene-title { 
    font-size: 0.5rem; 
    font-weight: bold; 
    color: white; 
    text-transform: uppercase; 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis;
    cursor: pointer;
    transition: color 0.15s;
}

.scene-title:hover {
    color: var(--color-noir-accent);
}

.header-filters { 
    display: flex; 
    align-items: center; 
    gap: 0.75rem; 
    flex-wrap: wrap; 
}
.backdrop-modal-content { padding-top: 1rem; }
.noir-label { font-size: 0.75rem; color: var(--color-noir-muted); }
.noir-file-input { width: 100%; padding: 1rem; background: #000; border: 1px solid #1f2937; color: white; border-radius: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.save-btn { background-color: var(--color-noir-success) !important; color: #000 !important; }

.loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-noir-muted);
    letter-spacing: 3px;
    z-index: 100;
}
</style>
