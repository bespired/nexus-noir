<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import EditViewHeader from '@components/customs/EditViewHeader.vue';

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

const sizex = ref(100.0);
const sizey = ref(100.0);

const setZoom = (value) => {
    zoom.value = Math.max(0.2, Math.min(5, value));
    updateWrapperSize();
};

const fetchMapData = async () => {
    try {
        const [sectorsRes, configRes] = await Promise.all([
            fetch('/api/sectors'),
            fetch('/api/configs/map_backdrop')
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

        // Fetch dimensions
        const dimRes = await fetch('/api/configs/map_dimensions');
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
    // Prevent native dragging
    event.preventDefault();

    draggingSector.value = sector;
    hasMoved.value = false;
    startPos.value = { x: event.clientX, y: event.clientY };

    // Calculate offset relative to the thumb's top-left in pixels
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
    updateWrapperSize();
};

const stopPan = () => {
    isPanning.value = false;
    window.removeEventListener('mousemove', onPanning);
    window.removeEventListener('mouseup', stopPan);
};

const onDragging = (event) => {
    if (!draggingSector.value || !mapContainer.value) return;

    const deltaX = event.clientX - startPos.value.x;
    const deltaY = event.clientY - startPos.value.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved.value = true;
    }

    // Use WRAPPER (the image area) dimensions for responsive scaling
    // This ensures coordinates are relative to the image pixels
    const wrapper = document.querySelector('.map-wrapper');
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const newX = ((event.clientX - rect.left - dragOffset.value.x) / rect.width) * 100;
    const newY = ((event.clientY - rect.top - dragOffset.value.y) / rect.height) * 100;

    if (!draggingSector.value.thumb_dimensions) {
        draggingSector.value.thumb_dimensions = { x: 0, y: 0, width: 150, height: 100 };
    }

    // Clamp to 0-100 range and 2 decimal precision
    draggingSector.value.thumb_dimensions.x = Math.max(0, Math.min(100, parseFloat(newX.toFixed(2))));
    draggingSector.value.thumb_dimensions.y = Math.max(0, Math.min(100, parseFloat(newY.toFixed(2))));
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

    let factorX = sizex.value / mapDimensions.value.width
    let factorY = sizey.value / mapDimensions.value.height

    let factor  = Math.max(factorX, factorY)

    // All coordinates are now relative %
    return {
        position: 'absolute',
        left: `${dims.x * factor }px`,
        top: `${dims.y * factor}px`,
        width: `${dims.width * factor|| 150}px`,
        height: `${dims.height * factor|| 100}px`,
        cursor: 'move',
        transform: 'translate(-50%, -50%)', // Center the thumb on the coordinate
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
    router.push(`/sectors/${sector.id}`);
};

const handleBack = () => {
    router.push('/sectors');
};

const onSectorCreated = (newSector) => {
    // Add default dimensions if missing
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

        // First, get dimensions of the image
        const img = new Image();
        const objectUrl = URL.createObjectURL(backdropFile.value);

        const dims = await new Promise((resolve) => {
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        });

        // Upload image
        const res = await fetch('/api/configs/upload-backdrop', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Failed to upload backdrop');

        const data = await res.json();
        mapBackground.value = data.value;
        mapDimensions.value = dims;

        // Save dimensions to config
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

    const contW = canvas.value?.clientWidth || 0;
    const contH = canvas.value?.clientHeight || 0;

    sizex.value = contW;
    sizey.value = contH;

    if (!contW || !contH) return;

    const imgW = mapDimensions.value.width;
    const imgH = mapDimensions.value.height;
    const imgAR = imgW / imgH;
    const contAR = contW / contH;

    let displayW, displayH;

    // "Contain" logic to prevent deformation (matching user request)
    if (contAR > imgAR) {
        displayH = contH;
        displayW = contH * imgAR;
    } else {
        displayW = contW;
        displayH = contW / imgAR;
    }

    // Apply zoom and pan
    const finalW = displayW * zoom.value;
    const finalH = displayH * zoom.value;

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

        <div class="map-container">
            <div v-if="loading" class="loading-overlay">
                LOADING ARCHIVE DATA...
            </div>
        </div>

    </div>
    <div class="sector-map-view" ref="canvas"
            :style="`background-image: url(${backgroundUrl});`">
        <div class="map-size">{{sizex}}, {{sizey}} </div>

        <div
            v-for="sector in sectors"
            :key="sector.id"
            class="map-sector-thumb"
            :style="getSectorStyle(sector)"
            @mousedown="startDrag($event, sector)"
            @click="openSector(sector)"
        >
                <div class="thumb-inner" draggable="false">
                    <div class="thumb-image-box" draggable="false">
                        <img v-if="getThumbUrl(sector)"
                            :src="getThumbUrl(sector)"
                            class="thumb-img" draggable="false" />
                        <div v-else class="thumb-placeholder">{ NO DATA }</div>
                    </div>
                    <div class="thumb-label">
                        <span class="sector-id">SEC-{{ sector.id }}</span>
                        <span class="sector-name">{{ sector.name }}</span>
                    </div>
                </div>
        </div>


    </div>
</template>

<style scoped>
.sector-map-view {
    display: flex;
    position: relative;
    flex-direction: column;
    height: calc(100vh - 180px);
    padding: 1.5rem;
    background-color: #05070a;
    background-size: cover;
    border-radius: 10px;
    overflow: hidden;
}

.map-size {
    position: absolute;
    right: 0;
    top: 0;
    color: green;
}

.map-container {
    flex: 1;
    position: relative;
    overflow: hidden; /* Changed from auto to hide clipped parts of the cover */
    border: 1px solid rgba(255, 255, 255, 0.05);
    background-color: #000;
    cursor: grab;
}

.map-container.is-panning {
    cursor: grabbing;
}

.map-wrapper {
    /* Style is mostly handled by :style="wrapperStyle" */
    overflow: hidden;
    line-height: 0;
}

.map-backdrop {
    width: 100%;
    height: 100%;
    display: block;
    user-select: none;
    pointer-events: none;
    object-fit: contain; /* Prevent deformation */
}

.map-sectors-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.map-sector-thumb {
    pointer-events: auto;
    user-select: none;
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 10;
}

.map-sector-thumb:hover {
    transform: translate(0%, 0%) scale(1.05); /* Adjusted for center transform */
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

.thumb-label {
    display: flex;
    flex-direction: column;
    padding: 0.4rem;
}

.sector-id {
    font-size: 0.5rem;
    color: var(--color-noir-muted);
}

.sector-name {
    font-size: 0.7rem;
    color: white;
    text-transform: uppercase;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tech-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 6px;
    height: 6px;
    background: #4b5563;
    border-radius: 50%;
}

.tech-dot--active {
    background: #ef4444;
    box-shadow: 0 0 5px #ef4444;
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

.zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 0 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.zoom-percentage {
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    min-width: 2.5rem;
    text-align: center;
}

.zoom-btn {
    padding: 0.25rem !important;
    width: 2rem !important;
}

.backdrop-btn {
    border: 1px solid var(--color-noir-accent) !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
    color: var(--color-noir-accent) !important;
}

.add-sector-btn {
    background-color: var(--color-noir-warning) !important;
    color: #000 !important;
}

.backdrop-modal-content {
    padding-top: 1rem;
}

.backdrop-modal-content .field {
    margin-bottom: 2rem;
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
