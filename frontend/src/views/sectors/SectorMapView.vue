<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import EditViewHeader from '@components/editor/EditViewHeader.vue';

const { t }  = useI18n();
const toast  = useToast();
const router = useRouter();

const sectors = ref([]);
const mapBackground = ref('');
const mapDimensions = ref({ width: 1920, height: 1080 }); // Default
const loading = ref(true);
const showCreateModal   = ref(false);
const showBackdropModal = ref(false);
const backdropFile = ref(null);
const mapContainer = ref(null);
const canvas       = ref(null);
const mapWrapper   = ref(null);
const backdropImg  = ref(null);
const mapLoaded    = ref(false);
const saving       = ref(false);

// Zoom & Pan State
const zoom = ref(1.0);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOffsetStart = ref({ x: 0, y: 0 });

const displayDimensions = ref({ width: 0, height: 0, left: 0, top: 0 });

const setZoom = (value) => {
    zoom.value = Math.max(0.2, Math.min(5, value));
};

const fetchMapData = async () => {
    try {
        const [sectorsRes, configRes, dimRes] = await Promise.all([
            fetch('/api/sectors'),
            fetch('/api/configs/map_backdrop'),
            fetch('/api/configs/map_dimensions')
        ]);

        if (!sectorsRes.ok) throw new Error('Failed to fetch sectors');
        const data = await sectorsRes.json();
        sectors.value = data.map(s => {
            if (s.thumb_dimensions && typeof s.thumb_dimensions === 'string') {
                try {
                    s.thumb_dimensions = JSON.parse(s.thumb_dimensions);
                } catch (e) {
                    s.thumb_dimensions = { x: 100, y: 100, width: 150, height: 100 };
                }
            }
            return s;
        });

        if (configRes.ok) {
            const configData = await configRes.json();
            mapBackground.value = configData?.value || '';
        }

        if (dimRes.ok) {
            const dimData = await dimRes.json();
            if (dimData?.value) {
                try {
                    mapDimensions.value = JSON.parse(dimData.value);
                } catch (e) {
                    console.error("Failed to parse map_dimensions", e);
                }
            }
        }
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load map data.', life: 3000 });
    } finally {
        loading.value = false;
        updateWrapperSize();
    }
};

const backgroundUrl = computed(() => {
    if (!mapBackground.value) return '';
    if (mapBackground.value.startsWith('http')) return mapBackground.value;
    return `/storage/${mapBackground.value}`;
});

// Drag & Drop State
const draggingSector = ref(null);
const dragOffset     = ref({ x: 0, y: 0 });
const hasMoved       = ref(false);
const startPos       = ref({ x: 0, y: 0 });

const startDrag = (event, sector) => {
    event.preventDefault();
    event.stopPropagation();

    draggingSector.value = sector;
    hasMoved.value = false;
    startPos.value = { x: event.clientX, y: event.clientY };

    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset.value = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', stopDrag);
};

const startPan = (event) => {
    if (draggingSector.value || event.button !== 0) return;
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
    panOffsetStart.value = { ...panOffset.value };
    window.addEventListener('mousemove', onPanning);
    window.addEventListener('mouseup', stopPan);
};

const onPanning = (event) => {
    if (!isPanning.value) return;
    const dx = event.clientX - panStart.value.x;
    const dy = event.clientY - panStart.value.y;
    panOffset.value = {
        x: panOffsetStart.value.x + dx,
        y: panOffsetStart.value.y + dy
    };
};

const stopPan = () => {
    isPanning.value = false;
    window.removeEventListener('mousemove', onPanning);
    window.removeEventListener('mouseup', stopPan);
};

const onDragging = (event) => {
    if (!draggingSector.value || !mapWrapper.value) return;

    const deltaX = event.clientX - startPos.value.x;
    const deltaY = event.clientY - startPos.value.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved.value = true;
    }

    const rect = mapWrapper.value.getBoundingClientRect();
    
    // Calculate position in pixels relative to mapWrapper
    const visualWidth = (draggingSector.value.thumb_dimensions?.width || 150) * (displayDimensions.value.width / mapDimensions.value.width);
    const visualHeight = (draggingSector.value.thumb_dimensions?.height || 100) * (displayDimensions.value.height / mapDimensions.value.height);

    const targetCenterX = event.clientX - rect.left - dragOffset.value.x + (visualWidth / 2);
    const targetCenterY = event.clientY - rect.top - dragOffset.value.y + (visualHeight / 2);

    if (!draggingSector.value.thumb_dimensions) {
        draggingSector.value.thumb_dimensions = { x: 0, y: 0, width: 150, height: 100 };
    }

    // Convert pixels to coord system (same as original map dimensions)
    draggingSector.value.thumb_dimensions.x = Math.round((targetCenterX / displayDimensions.value.width) * mapDimensions.value.width);
    draggingSector.value.thumb_dimensions.y = Math.round((targetCenterY / displayDimensions.value.height) * mapDimensions.value.height);
};

const stopDrag = () => {
    if (draggingSector.value && hasMoved.value) {
        saveSectorPosition(draggingSector.value);
    }
    window.removeEventListener('mousemove', onDragging);
    window.removeEventListener('mouseup', stopDrag);
    draggingSector.value = null;
};

const saveSectorPosition = async (sector) => {
    try {
        const response = await fetch(`/api/sectors/${sector.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                name: sector.name,
                thumb_dimensions: sector.thumb_dimensions
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update SEC-${sector.id}`);
        }
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to save position.', life: 3000 });
    }
};

const getSectorStyle = (sector) => {
    const dims = sector.thumb_dimensions || { x: 50, y: 50, width: 150, height: 100 };

    // Position as percentage of the map wrapper
    const leftPx = (dims.x / mapDimensions.value.width) * 100;
    const topPx  = (dims.y / mapDimensions.value.height) * 100;

    // Width/Height scaled to the container
    const factorX = displayDimensions.value.width / mapDimensions.value.width;
    const factorY = displayDimensions.value.height / mapDimensions.value.height;
    
    // We use Math.max(factorX, factorY) if we want uniform scaling, but here we can just scale by container size
    const width = (dims.width || 150) * factorX;
    const height = (dims.height || 100) * factorY;

    return {
        position: 'absolute',
        left: `${leftPx}%`,
        top: `${topPx}%`,
        width: `${width}px`,
        height: `${height}px`,
        cursor: 'move',
        transform: 'translate(-50%, -50%)',
        zIndex: draggingSector.value === sector ? 100 : 10
    };
};

const getThumbUrl = (sector) => {
    if (sector.media && sector.media.length > 0) {
        const file = sector.media[0].filepad;
        if (file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
};

const openSector = (sector) => {
    if (hasMoved.value) return;
    router.push(`/sectors/${sector.id}/edit`);
};

const handleBack = () => {
    router.push('/sectors');
};

const onSectorCreated = (newSector) => {
    if (!newSector.thumb_dimensions) {
        newSector.thumb_dimensions = { x: 50, y: 50, width: 150, height: 100 };
    }
    sectors.value.push(newSector);
    showCreateModal.value = false;
};

const onBackdropFileChange = (event) => {
    backdropFile.value = event.target.files[0];
};

const updateBackdrop = async () => {
    if (!backdropFile.value) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please select an image.', life: 3000 });
        return;
    }

    try {
        const formData = new FormData();
        formData.append('image', backdropFile.value);

        const img = new Image();
        const objectUrl = URL.createObjectURL(backdropFile.value);

        const dims = await new Promise((resolve) => {
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        });

        const res = await fetch('/api/configs/upload-backdrop', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Failed to upload backdrop');

        const data = await res.json();
        mapBackground.value = data.value;
        mapDimensions.value = dims;

        await fetch('/api/configs/map_dimensions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(dims) })
        });

        showBackdropModal.value = false;
        backdropFile.value = null;
        updateWrapperSize();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Backdrop updated.', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed.', life: 3000 });
    }
};

const updateWrapperSize = () => {
    if (!canvas.value) return;

    const contW = canvas.value.clientWidth;
    const contH = canvas.value.clientHeight;

    if (!contW || !contH) return;

    const imgAR = mapDimensions.value.width / mapDimensions.value.height;
    const contAR = contW / contH;

    let displayW, displayH;

    if (contAR > imgAR) {
        displayH = contH;
        displayW = contH * imgAR;
    } else {
        displayW = contW;
        displayH = contW / imgAR;
    }

    displayDimensions.value = {
        width: displayW,
        height: displayH,
        left: (contW - displayW) / 2,
        top: (contH - displayH) / 2
    };
};

const onBackdropLoad = () => {
    mapLoaded.value = true;
    updateWrapperSize();
};

onMounted(() => {
    fetchMapData();
    window.addEventListener('resize', updateWrapperSize);
});

onUnmounted(() => {
    stopDrag();
    window.removeEventListener('resize', updateWrapperSize);
});

</script>

<template>

    <div class="sectors-view">
        <EditViewHeader
            backRoute="/sectors"
            parentName="SECTORS"
            itemName="map"
        >
            <template #extra-actions>
                <Button label="UPDATE BACKDROP"
                severity="info" class="header-btn visual-map-btn"
                @click="showBackdropModal=true" />
            </template>
        </EditViewHeader>

        <CreateSectorModal
            v-model:visible="showCreateModal"
            @created="onSectorCreated"
        />

        <Dialog v-model:visible="showBackdropModal"
            modal header="UPLOAD MAP BACKDROP"
            :style="{ width: '400px' }" class="noir-modal">

            <div class="backdrop-modal-content">
                <div class="field">
                    <label class="noir-label">SELECT IMAGE</label>
                    <input type="file" @change="onBackdropFileChange" accept="image/*" class="noir-file-input mb-4" />
                </div>
                <div class="modal-actions">
                    <Button :label="t('sectors.modal.btn_cancel')" text plain @click="showBackdropModal = false" class="cancel-btn" />
                    <Button label="UPLOAD BACKDROP" severity="success" @click="updateBackdrop" class="save-btn" />
                </div>
            </div>
        </Dialog>

        <div class="map-container" ref="canvas">
            <div v-if="loading" class="loading-overlay">
                LOADING ARCHIVE DATA...
            </div>

            <div v-else class="map-viewport" @mousedown.self="startPan">
                <div 
                    class="map-wrapper" 
                    ref="mapWrapper"
                    :style="{
                        width: displayDimensions.width + 'px',
                        height: displayDimensions.height + 'px',
                        left: displayDimensions.left + 'px',
                        top: displayDimensions.top + 'px',
                        transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`
                    }"
                >
                    <img 
                        :src="backgroundUrl" 
                        class="map-backdrop" 
                        @load="onBackdropLoad"
                        draggable="false"
                    />

                    <div
                        v-for="sector in sectors"
                        :key="sector.id"
                        class="map-sector-thumb"
                        :style="getSectorStyle(sector)"
                        @mousedown="startDrag($event, sector)"
                    >
                        <div class="thumb-inner" draggable="false">
                            <div class="thumb-image-box" draggable="false">
                                <img v-if="getThumbUrl(sector)"
                                    :src="getThumbUrl(sector)"
                                    class="thumb-img" draggable="false" />
                                <div v-else class="thumb-placeholder">{ NO DATA }</div>
                            </div>
                            <div class="sector-id">SEC-{{ sector.id }}</div>
                            <div class="sector-name" @click="openSector(sector)">{{ sector.name }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sector-map-view {
    display: none; /* Removed old container from bottom of file */
}

.map-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background-color: #000;
    height: calc(100vh - 180px);
    border-radius: 10px;
}

.map-viewport {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: auto;
}

.map-wrapper {
    position: absolute;
    transform-origin: 0 0;
}

.map-backdrop {
    width: 100%;
    height: 100%;
    display: block;
    user-select: none;
    pointer-events: none;
}

.map-sector-thumb {
    user-select: none;
    transition: transform 0.2s, box-shadow 0.2s;
}

.map-sector-thumb:hover {
    transform: translate(-50%, -50%) scale(1.05) !important;
    z-index: 50;
}

.thumb-inner {
    width: 100%;
    height: 100%;
    background: rgba(11, 15, 25, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    padding: 0.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}

.thumb-image-box {
    flex: 1;
    overflow: hidden;
    background: #111827;
    position: relative;
}

.thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.7;
    filter: grayscale(0.5);
}

.thumb-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    color: #374151;
}

.sector-id {
    margin-top: -0.5rem;
    font-size: 0.5rem;
    color: var(--color-noir-muted);
    z-index: 2;
}

.sector-name {
    font-size: 0.7rem;
    color: white;
    text-transform: uppercase;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &:hover {
        color:  var(--p-button-info-background);
        cursor: pointer;
    }
}

.loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    color: var(--color-noir-muted);
    z-index: 100;
    letter-spacing: 2px;
}

.backdrop-modal-content {
    padding-top: 1rem;
}

.noir-file-input {
    width: 100%;
    padding: 1rem;
    background: #000;
    border: 1px solid #1f2937;
    color: white;
    cursor: pointer;
    border-radius: 4px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
}

.cancel-btn {
    color: var(--color-noir-muted) !important;
}

.save-btn {
    background-color: var(--color-noir-success) !important;
    color: #000 !important;
    font-weight: bold !important;
}
</style>
