<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/customs/EditViewHeader.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sceneId = route.params.id;
const scene = ref(null);
const scenes = ref([]);
const characters = ref([]);
const actions = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

const backdropContainer = ref(null);
const isDrawing = ref(false);
const isDraggingExisting = ref(false);
const draggingIndex = ref(-1);
const dragOffset = ref({ x: 0, y: 0 });
const startX = ref(0);
const startY = ref(0);
const currentGateway = ref(null);
const selectedGatewayIndex = ref(-1);
const collapsedStates = ref({});

const toggleCollapse = (index) => {
    collapsedStates.value[index] = !collapsedStates.value[index];
};

const fetchInitialData = async () => {
    try {
        const [sceneRes, scenesRes, charsRes, actionsRes] = await Promise.all([
            fetch(`/api/scenes/${sceneId}`),
            fetch('/api/scenes'),
            fetch('/api/characters'),
            fetch('/api/actions')
        ]);

        if (!sceneRes.ok) throw new Error('Failed to fetch scene');
        scene.value = await sceneRes.json();
        
        // Ensure 2d_gateways is an array and initialize collapsed states
        if (!scene.value['2d_gateways']) {
            scene.value['2d_gateways'] = [];
        } else {
            scene.value['2d_gateways'].forEach((gw, index) => {
                if (gw.type) collapsedStates.value[index] = true;
            });
        }

        scenes.value = await scenesRes.json();
        characters.value = await charsRes.json();
        actions.value = await actionsRes.json();
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load data', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const backdropUrl = computed(() => {
    if (scene.value && scene.value.media && scene.value.media.length > 0) {
        const backdrop = scene.value.media.find(m => m.type === '2d');
        if (backdrop) {
            const file = backdrop.filepad;
            if (file.startsWith('http')) return file;
            return `/storage/${file}`;
        }
    }
    return null;
});

const filteredScenes = computed(() => {
    if (!scene.value) return [];
    
    const currentSectorId = scene.value.sector_id;
    
    return scenes.value
        .filter(s => {
            // Never show self
            if (s.id === scene.value.id) return false;
            
            // Always show scenes in the same sector
            if (s.sector_id === currentSectorId) return true;
            
            // For other sectors, ONLY show non-walkable scenes (e.g. cut-scenes, investigations)
            if (s.type !== 'walkable-area') return true;
            
            return false;
        })
        .map(s => ({
            ...s,
            displayName: s.title + (s.type === 'walkable-area' ? ' [Walkable]' : ` [${s.type}]`) + (s.sector_id !== currentSectorId ? ` (${s.sector?.name || 'Other'})` : '')
        }))
        .sort((a, b) => {
            // Same sector first
            if (a.sector_id === currentSectorId && b.sector_id !== currentSectorId) return -1;
            if (a.sector_id !== currentSectorId && b.sector_id === currentSectorId) return 1;
            
            // Then walkable areas
            if (a.type === 'walkable-area' && b.type !== 'walkable-area') return -1;
            if (a.type !== 'walkable-area' && b.type === 'walkable-area') return 1;
            
            return a.title.localeCompare(b.title);
        });
});

// DRAWING & DRAGGING LOGIC
const handleMouseDown = (e, index = -1) => {
    if (!backdropContainer.value) return;
    const rect = backdropContainer.value.getBoundingClientRect();
    
    if (index !== -1) {
        // Start dragging existing gateway
        isDraggingExisting.value = true;
        draggingIndex.value = index;
        selectedGatewayIndex.value = index;
        collapsedStates.value[index] = false; // Expand when selected
        const gw = scene.value['2d_gateways'][index];
        const mousePctX = ((e.clientX - rect.left) / rect.width) * 100;
        const mousePctY = ((e.clientY - rect.top) / rect.height) * 100;
        dragOffset.value = {
            x: mousePctX - gw.x,
            y: mousePctY - gw.y
        };
    } else {
        // Start drawing new gateway
        isDrawing.value = true;
        startX.value = ((e.clientX - rect.left) / rect.width) * 100;
        startY.value = ((e.clientY - rect.top) / rect.height) * 100;

        currentGateway.value = {
            x: startX.value,
            y: startY.value,
            width: 0,
            height: 0,
            type: 'scene',
            label: null,
            target_scene_id: null,
            target_spawn_point: null
        };
    }
};

const handleMouseMove = (e) => {
    if (!backdropContainer.value) return;
    const rect = backdropContainer.value.getBoundingClientRect();
    const currentPctX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentPctY = ((e.clientY - rect.top) / rect.height) * 100;

    if (isDrawing.value && currentGateway.value) {
        currentGateway.value.width = Math.abs(currentPctX - startX.value);
        currentGateway.value.height = Math.abs(currentPctY - startY.value);
        currentGateway.value.x = Math.min(currentPctX, startX.value);
        currentGateway.value.y = Math.min(currentPctY, startY.value);
    } else if (isDraggingExisting.value && draggingIndex.value !== -1) {
        const gw = scene.value['2d_gateways'][draggingIndex.value];
        gw.x = Math.max(0, Math.min(100 - gw.width, currentPctX - dragOffset.value.x));
        gw.y = Math.max(0, Math.min(100 - gw.height, currentPctY - dragOffset.value.y));
    }
};

const handleMouseUp = () => {
    if (isDrawing.value && currentGateway.value && currentGateway.value.width > 2 && currentGateway.value.height > 2) {
        scene.value['2d_gateways'].push({ ...currentGateway.value });
        selectedGatewayIndex.value = scene.value['2d_gateways'].length - 1;
    }
    isDrawing.value = false;
    isDraggingExisting.value = false;
    draggingIndex.value = -1;
    currentGateway.value = null;
};

const deleteGateway = (index) => {
    scene.value['2d_gateways'].splice(index, 1);
    if (selectedGatewayIndex.value === index) selectedGatewayIndex.value = -1;
};

const handleSelect = (index) => {
    selectedGatewayIndex.value = index;
    collapsedStates.value[index] = false;
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
                '2d_gateways': scene.value['2d_gateways']
            })
        });

        if (!response.ok) throw new Error('Save failed');
        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Success',
            detail: t('scenes.edit.messages.gateways_save_success'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.gateways_save_error'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const handleDelete = async () => {
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

onMounted(fetchInitialData);
</script>

<template>
    <div class="scene-gateway-view">
        <EditViewHeader
            v-if="scene"
            backRoute="/scenes"
            parentName="SCENES"
            :itemName="scene.title"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
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
                        <router-link :to="`/scenes/${sceneId}/gateway`" class="nav-link active">{{ t('scenes.edit.nav_gateway') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/spawnpoint`" class="nav-link">{{ t('scenes.edit.nav_3d') }}</router-link>
                    </div>
                    <span class="edit-hero__id">ID:{{ sceneId }}</span>
                </div>
            </div>

            <div class="scene-edit-grid">
                <!-- LEFT: DRAWING AREA -->
                <div class="drawing-column">
                    <div 
                        class="drawing-backdrop" 
                        ref="backdropContainer"
                        @mousedown="handleMouseDown"
                        @mousemove="handleMouseMove"
                        @mouseup="handleMouseUp"
                    >
                        <img v-if="backdropUrl" :src="backdropUrl" class="backdrop-img" draggable="false" />
                        
                        <!-- DRAWN GATEWAYS -->
                        <div 
                            v-for="(gw, index) in scene['2d_gateways']" 
                            :key="index"
                            class="gateway-rect"
                            :class="{ 
                                'selected': selectedGatewayIndex === index, 
                                'trigger': gw.type === 'trigger',
                                'dragging-state': isDraggingExisting && draggingIndex === index
                            }"
                            :style="{
                                left: gw.x + '%',
                                top: gw.y + '%',
                                width: gw.width + '%',
                                height: gw.height + '%'
                            }"
                            @mousedown.stop="handleMouseDown($event, index)"
                            @click.stop="selectedGatewayIndex = index"
                        >
                            <span class="gateway-label">{{ gw.label || (gw.type === 'trigger' ? 'T' : 'G') }}</span>
                            <button class="gw-delete-btn" @click.stop="deleteGateway(index)">×</button>
                        </div>

                        <!-- CURRENT DRAWING RECT -->
                        <div 
                            v-if="isDrawing && currentGateway"
                            class="gateway-rect drawing"
                            :style="{
                                left: currentGateway.x + '%',
                                top: currentGateway.y + '%',
                                width: currentGateway.width + '%',
                                height: currentGateway.height + '%'
                            }"
                        ></div>

                        <div class="drawing-overlay-hint">
                            <i class="pi pi-pencil"></i>
                            <span>{{ t('scenes.edit.draw_hint') || 'CLICK & DRAG TO CREATE GATEWAY' }}</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: SIDEBAR PROPERTIES -->
                <div class="properties-column">
                    <div v-if="scene['2d_gateways'].length === 0" class="no-gateways-hint">
                        {{ t('scenes.edit.no_gateways') || 'No gateways defined yet. Draw one on the backdrop.' }}
                    </div>

                    <div 
                        v-for="(gw, index) in scene['2d_gateways']" 
                        :key="index"
                        class="gateway-card"
                        :class="{ 'active': selectedGatewayIndex === index, 'collapsed': collapsedStates[index] }"
                        @click="handleSelect(index)"
                    >
                        <div class="gateway-card__header" @click.stop="toggleCollapse(index)">
                            <div class="gateway-type-indicator" :class="gw.type"></div>
                            <span class="gateway-card__title">
                                {{ gw.type === 'trigger' ? 'Trigger' : 'Gateway' }}
                                <span v-if="collapsedStates[index] && gw.label" class="header-label"> - {{ gw.label }}</span>
                            </span>
                            <div class="header-actions">
                                <Button 
                                    :icon="collapsedStates[index] ? 'pi pi-chevron-down' : 'pi pi-chevron-up'" 
                                    text 
                                    class="collapse-btn" 
                                    @click.stop="toggleCollapse(index)" 
                                />
                                <Button icon="pi pi-trash" severity="danger" text class="gateway-card__delete" @click.stop="deleteGateway(index)" />
                            </div>
                        </div>

                        <div v-if="!collapsedStates[index]" class="gateway-card__content">
                            <!-- COMMON FIELDS -->
                            <div class="field">
                                <label>{{ t('scenes.edit.gw_label') || 'IDENTIFICATION' }}</label>
                                <InputText v-model="gw.label" class="noir-input w-full" placeholder="e.g. North Exit" />
                            </div>

                            <div class="field">
                                <label>{{ t('scenes.edit.gw_type') || 'PROPERTY_TYPE' }}</label>
                                <Select 
                                    v-model="gw.type" 
                                    :options="[{label: 'Gateway', value: 'scene'}, {label: 'Trigger', value: 'trigger'}]" 
                                    optionLabel="label" 
                                    optionValue="value"
                                    class="noir-select w-full"
                                />
                            </div>

                            <!-- SCENE GATEWAY FIELDS -->
                            <template v-if="gw.type === 'scene'">
                                <div class="field">
                                    <label>{{ t('scenes.edit.target_scene') || 'DESTINATION_SCENE' }}</label>
                                    <Select 
                                        v-model="gw.target_scene_id" 
                                        :options="filteredScenes" 
                                        optionLabel="displayName" 
                                        optionValue="id"
                                        class="noir-select w-full"
                                        filter
                                        showClear
                                    />
                                </div>
                                <div class="field">
                                    <label>{{ t('scenes.edit.target_spawn') || 'SPAWN_POINT' }}</label>
                                    <InputText v-model="gw.target_spawn_point" class="noir-input w-full" placeholder="e.g. south" />
                                </div>
                            </template>

                            <!-- TRIGGER FIELDS -->
                            <template v-if="gw.type === 'trigger'">
                                <div class="field">
                                    <label>{{ t('scenes.edit.behavior') || 'ACTION_BEHAVIOR' }}</label>
                                    <Select 
                                        v-model="gw.gedrag_id" 
                                        :options="actions" 
                                        optionLabel="name" 
                                        optionValue="id"
                                        class="noir-select w-full"
                                        filter
                                        showClear
                                    />
                                </div>
                                <div class="field">
                                    <label>{{ t('scenes.edit.target_character') || 'TARGET_CHARACTER' }}</label>
                                    <Select 
                                        v-model="gw.target_character" 
                                        :options="characters" 
                                        optionLabel="name" 
                                        optionValue="id"
                                        class="noir-select w-full"
                                        filter
                                        showClear
                                    />
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-gateway-view {
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

.drawing-backdrop {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    cursor: crosshair;
}

.backdrop-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
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
    color: var(--color-noir-warning);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--color-noir-warning);
    pointer-events: none;
}

.gateway-rect {
    position: absolute;
    border: 2px solid var(--color-noir-accent);
    background: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
    cursor: grab;
    z-index: 10;
    transition: transform 0.2s, background 0.2s, border 0.2s;
}

.gateway-rect:active {
    cursor: grabbing;
}

.gateway-rect.dragging-state {
    transition: none;
}

.gateway-rect.trigger {
    border-color: var(--color-noir-warning);
    background: rgba(245, 158, 11, 0.1);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
}

.gateway-rect.selected {
    background: rgba(59, 130, 246, 0.4);
    border-width: 3px;
    z-index: 20;
}

.gateway-rect.drawing {
    border-style: dashed;
    pointer-events: none;
}

.gateway-label {
    position: absolute;
    top: -20px;
    left: 0;
    font-size: 0.7rem;
    font-weight: bold;
    color: #fff;
    background: var(--color-noir-accent);
    padding: 2px 6px;
    border-radius: 2px;
    white-space: nowrap;
}

.trigger .gateway-label {
    background: var(--color-noir-warning);
    color: #000;
}

.gw-delete-btn {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-noir-danger);
    color: #fff;
    border: none;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.gateway-rect:hover .gw-delete-btn {
    display: flex;
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
    transition: background 0.2s;
}

.gateway-card__header:hover {
    background: rgba(255, 255, 255, 0.05);
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

.gateway-type-indicator.scene { background: var(--color-noir-accent); }
.gateway-type-indicator.trigger { background: var(--color-noir-warning); }

.gateway-card__title {
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header-label {
    color: var(--color-noir-accent);
    text-transform: none;
    font-weight: normal;
}

.trigger .header-label {
    color: var(--color-noir-warning);
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

.collapse-btn:hover {
    color: #fff !important;
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

.field label {
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
}

.noir-input, .noir-select {
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
    font-size: 0.8rem !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}
</style>
