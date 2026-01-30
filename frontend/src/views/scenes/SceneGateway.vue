<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';

// Explicit PrimeVue imports to avoid auto-import lifecycle issues
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sceneId = computed(() => route.params.id);
const scene = ref(null);
const scenes = ref([]);
const characters = ref([]);
const actions = ref([]);
const clues = ref([]);
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
const spawnpointsCache = ref({});

const toggleCollapse = (index) => {
    collapsedStates.value[index] = !collapsedStates.value[index];
};

const fetchData = async () => {
    if (!sceneId.value) return;
    
    loading.value = true;
    try {
        const [sceneRes, scenesRes, charsRes, actionsRes, cluesRes] = await Promise.all([
            fetch(`/api/scenes/${sceneId.value}`),
            fetch('/api/scenes'),
            fetch('/api/characters'),
            fetch('/api/actions'),
            fetch('/api/clues')
        ]);

        if (!sceneRes.ok) throw new Error('Failed to fetch scene');
        
        // Consume all JSON first
        const [sceneData, scenesData, charactersData, actionsData, cluesData] = await Promise.all([
            sceneRes.json(),
            scenesRes.json(),
            charsRes.json(),
            actionsRes.json(),
            cluesRes.json()
        ]);

        // Initializing gateways
        const gateways = sceneData['2d_gateways'] || [];
        const initialCollapsedStates = {};

        gateways.forEach((gw, index) => {
            if (!gw.triggers) {
                gw.triggers = [];
                if (gw.action_id || gw.target_scene_id || gw.behavior_id) {
                    gw.triggers.push({
                        condition: 'always',
                        clue_id: null,
                        type: gw.type === 'trigger' ? 'action' : 'scene',
                        action_id: gw.action_id || gw.behavior_id,
                        target_scene_id: gw.target_scene_id,
                        target_spawn_point: gw.target_spawn_point,
                        target_character: gw.target_character
                    });
                }
            }
            if (gw.type) initialCollapsedStates[index] = true;
        });

        // Batch update reactive state
        scenes.value = scenesData;
        characters.value = charactersData;
        actions.value = actionsData;
        clues.value = cluesData;
        collapsedStates.value = initialCollapsedStates;
        
        // Final assignment to scene
        sceneData['2d_gateways'] = gateways;
        scene.value = sceneData;

        // Fetch spawnpoints
        gateways.forEach(gw => {
            if (gw.target_scene_id) fetchSpawnpoints(gw.target_scene_id);
            if (gw.triggers) {
                gw.triggers.forEach(t => {
                    if (t.target_scene_id) fetchSpawnpoints(t.target_scene_id);
                });
            }
        });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load data', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const fetchSpawnpoints = async (targetSceneId) => {
    if (!targetSceneId || spawnpointsCache.value[targetSceneId]) return;

    try {
        const response = await fetch(`/api/scenes/${targetSceneId}`);
        if (!response.ok) throw new Error('Failed to fetch target scene');
        const targetScene = await response.json();
        spawnpointsCache.value[targetSceneId] = targetScene['3d_spawnpoints'] || [];
    } catch (error) {
        console.error(`Error fetching spawnpoints for scene ${targetSceneId}:`, error);
    }
};

const gotoSceneGateway = (targetId) => {
    if (!targetId) return;
    router.push(`/scenes/${targetId}/gateway`);
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
        isDraggingExisting.value = true;
        draggingIndex.value = index;
        selectedGatewayIndex.value = index;
        collapsedStates.value[index] = false;
        const gw = scene.value['2d_gateways'][index];
        const mousePctX = ((e.clientX - rect.left) / rect.width) * 100;
        const mousePctY = ((e.clientY - rect.top) / rect.height) * 100;
        dragOffset.value = {
            x: mousePctX - gw.x,
            y: mousePctY - gw.y
        };
    } else {
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
            triggers: []
        };
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
};

const addTriggerOutcome = (gw) => {
    if (!gw.triggers) gw.triggers = [];
    gw.triggers.push({
        condition: 'always',
        clue_id: clues.value[0]?.id || null,
        type: 'action',
        action_id: null,
        target_scene_id: null,
        target_spawn_point: null,
        target_character: null
    });
};

const removeTriggerOutcome = (gw, index) => {
    gw.triggers.splice(index, 1);
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
        // Sync first trigger to top-level for backward compatibility
        const gateways = scene.value['2d_gateways'].map(gw => {
            const syncedGw = { ...gw };
            if (gw.triggers && gw.triggers.length > 0) {
                const first = gw.triggers[0];
                syncedGw.action_id = first.type === 'action' ? first.action_id : null;
                syncedGw.target_scene_id = first.type === 'scene' ? first.target_scene_id : null;
                syncedGw.target_spawn_point = first.type === 'scene' ? first.target_spawn_point : null;
                syncedGw.target_character = first.type === 'action' ? first.target_character : null;
            }
            return syncedGw;
        });

        const response = await fetch(`/api/scenes/${sceneId.value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type,
                '2d_gateways': gateways
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
        await fetch(`/api/scenes/${sceneId.value}`, { method: 'DELETE' });
        router.push('/scenes');
    } catch (error) {
        console.error(error);
    } finally {
        deleting.value = false;
    }
};

onMounted(fetchData);
watch(sceneId, fetchData);
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
                        <template v-if="scene.type === 'vue-component'">
                            <router-link :to="`/scenes/${sceneId}/settings`" class="nav-link">{{ t('scenes.edit.nav_settings') }}</router-link>
                        </template>
                        <template v-else>
                            <router-link :to="`/scenes/${sceneId}/gateway`" class="nav-link active">{{ t('scenes.edit.nav_gateway') }}</router-link>
                            <router-link :to="`/scenes/${sceneId}/spawnpoint`" class="nav-link">{{ t('scenes.edit.nav_3d') }}</router-link>
                            <router-link :to="`/scenes/${sceneId}/scale`" class="nav-link">{{ t('scenes.edit.nav_scale') }}</router-link>
                        </template>
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

                            <!-- TRIGGER OUTCOMES -->
                            <div class="field">
                                <label>TRIGGER OUTCOMES</label>
                                <div class="triggers-list">
                                    <div v-for="(trig, tIndex) in gw.triggers" :key="tIndex" class="trigger-outcome-card">
                                        <div class="trigger-outcome-header">
                                            <span class="outcome-index">#{{ tIndex + 1 }}</span>
                                            <Button icon="pi pi-times" text severity="danger" class="p-0 m-0" @click="removeTriggerOutcome(gw, tIndex)" />
                                        </div>

                                        <!-- Condition Row -->
                                        <div class="outcome-row">
                                            <Select
                                                v-model="trig.condition"
                                                :options="[{label: 'ALWAYS', value: 'always'}, {label: 'HAS', value: 'has'}, {label: 'HAS NOT', value: 'has-not'}]"
                                                optionLabel="label"
                                                optionValue="value"
                                                class="noir-select compact-select"
                                            />
                                            <Select
                                                v-if="trig.condition !== 'always'"
                                                v-model="trig.clue_id"
                                                :options="clues"
                                                optionLabel="title"
                                                optionValue="id"
                                                placeholder="Pick clue"
                                                class="noir-select flex-1"
                                                filter
                                                showClear
                                            />
                                        </div>

                                        <!-- Outcome Row -->
                                        <div class="outcome-row">
                                            <Select
                                                v-model="trig.type"
                                                :options="[{label: 'SCENE', value: 'scene'}, {label: 'ACTION', value: 'action'}]"
                                                optionLabel="label"
                                                optionValue="value"
                                                class="noir-select compact-select"
                                            />

                                            <!-- Scenario A: Action -->
                                            <Select
                                                v-if="trig.type === 'action'"
                                                v-model="trig.action_id"
                                                :options="actions"
                                                optionLabel="name"
                                                optionValue="id"
                                                class="noir-select flex-1"
                                                filter
                                                placeholder="Action"
                                            />

                                            <!-- Scenario B: Scene -->
                                            <Select
                                                v-if="trig.type === 'scene'"
                                                v-model="trig.target_scene_id"
                                                :options="filteredScenes"
                                                optionLabel="displayName"
                                                optionValue="id"
                                                class="noir-select flex-1"
                                                filter
                                                placeholder="Scene"
                                                @change="fetchSpawnpoints(trig.target_scene_id)"
                                            />
                                        </div>

                                        <!-- Target Row (Contextual) -->
                                        <div class="outcome-row" v-if="trig.type === 'action'">
                                            <span class="row-label">TARGET CHARACTER</span>
                                            <Select
                                                v-model="trig.target_character"
                                                :options="characters"
                                                optionLabel="name"
                                                optionValue="id"
                                                class="noir-select flex-1"
                                                filter
                                                showClear
                                                placeholder="Optional"
                                            />
                                        </div>

                                        <div class="outcome-row" v-if="trig.type === 'scene'">
                                            <span class="row-label">SPAWN POINT</span>
                                            <Select
                                                v-model="trig.target_spawn_point"
                                                :options="spawnpointsCache[trig.target_scene_id] || []"
                                                optionLabel="name"
                                                optionValue="name"
                                                class="noir-select flex-1"
                                                filter
                                                showClear
                                                :disabled="!trig.target_scene_id"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    label="ADD OUTCOME"
                                    icon="pi pi-plus"
                                    text
                                    class="add-outcome-btn w-full mt-2"
                                    @click="addTriggerOutcome(gw)"
                                />
                            </div>
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

.drawing-column {
    min-width: 0;
}

.drawing-backdrop {
    position: relative;
    /*aspect-ratio: 16 / 9;*/
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

/* Layout classes */
.outcome-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}

.noir-select {
    flex: 1;
    min-width: 0; /* Allow shrinking */
}

.compact-select {
    width: 130px !important;
    flex: 0 0 130px !important;
}

.flex-1 {
    flex: 1 !important;
}


.triggers-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.trigger-outcome-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.trigger-outcome-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    padding-bottom: 0.25rem;
    margin-bottom: 0.25rem;
}

.outcome-index {
    font-size: 0.65rem;
    font-weight: bold;
    color: var(--color-noir-muted);
}

.outcome-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.row-label {
    font-size: 0.6rem;
    color: var(--color-noir-muted);
    min-width: 100px;
}

.compact-select-alt {
    width: 130px !important;
    font-size: 0.75rem !important;
}

.add-outcome-btn {
    font-size: 0.75rem !important;
    border: 1px dashed rgba(255, 255, 255, 0.2) !important;
}

.add-outcome-btn:hover {
    border-style: solid !important;
    background: rgba(255, 255, 255, 0.05) !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}

.field-row-inline {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.noir-button-small {
    background: var(--color-noir-accent) !important;
    border: none !important;
    width: 2.2rem !important;
    height: 2.2rem !important;
    flex-shrink: 0;
}

.noir-button-small:hover {
    filter: brightness(1.2);
}
</style>
