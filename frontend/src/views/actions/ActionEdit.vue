<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/customs/EditViewHeader.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const actionId = route.params.id;
const action = ref(null);
const characters = ref([]);
const dialogs = ref([]);
const scenes = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

const actionTypes = [
    { type: 'WALK_TO_POSITION', svg: 'walk',     icon: 'pi pi-directions', label: 'walk_to' },
    { type: 'LOOK_AT_TARGET',   svg: 'look',     icon: 'pi pi-eye',        label: 'look_at' },
    { type: 'IDLE_WAIT',        svg: 'idle',     icon: 'pi pi-clock',      label: 'idle'    },
    { type: 'START_DIALOGUE',   svg: 'dialogue', icon: 'pi pi-comments',   label: 'talk'    },
    { type: 'CUSTOM_COMMAND',   svg: 'cog',      icon: 'pi pi-cog',        label: 'custom_command' }
];

const fetchInitialData = async () => {
    try {
        const [actionRes, charactersRes, dialogsRes, scenesRes] = await Promise.all([
            fetch(`/api/actions/${actionId}`),
            fetch('/api/characters'),
            fetch('/api/dialogs'),
            fetch('/api/scenes')
        ]);

        if (!actionRes.ok) throw new Error('Failed to fetch action');
        action.value = await actionRes.json();
        if (!action.value.actions) action.value.actions = [];

        const charData = await charactersRes.json();
        characters.value = Array.isArray(charData) ? charData : [];

        const dialogData = await dialogsRes.json();
        dialogs.value = Array.isArray(dialogData) ? dialogData : [];

        const sceneData = await scenesRes.json();
        scenes.value = Array.isArray(sceneData) ? sceneData : [];
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load action editor data', life: 3000 });
        router.push('/actions');
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/actions/${actionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(action.value)
        });

        if (!response.ok) throw new Error('Failed to update action');

        toast.add({ severity: 'success', summary: 'Success', detail: 'Action updated successfully', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save action', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this action sequence?')) return;
    deleting.value = true;
    try {
        const response = await fetch(`/api/actions/${actionId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to delete');
        router.push('/actions');
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete action', life: 3000 });
    } finally {
        deleting.value = false;
    }
};

const addActionStep = (type) => {
    action.value.actions.push({
        type: type,
        data: {}
    });
};

const removeStep = (index) => {
    action.value.actions.splice(index, 1);
};

const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= action.value.actions.length) return;
    const step = action.value.actions.splice(index, 1)[0];
    action.value.actions.splice(newIndex, 0, step);
};

const spawnPointTypes = [
    { label: 'Entry', value: 'entry' },
    { label: 'Player', value: 'player' },
    { label: 'NPC', value: 'npc' },
    { label: 'Prop', value: 'prop' },
    { label: 'Goto', value: 'goto' }
];

const getSpawnpointsByType = (type) => {
    const points = [];
    scenes.value.forEach(scene => {
        if (scene['3d_spawnpoints']) {
            scene['3d_spawnpoints'].forEach(sp => {
                if (!type || sp.type === type) {
                    points.push({
                        label: `${scene.title} - ${sp.name}`,
                        value: sp.name,
                        scene_id: scene.id,
                        type: sp.type
                    });
                }
            });
        }
    });
    return points;
};

const filteredSpawnpoints = ref([]);
const searchSpawnpoints = (event, stepType) => {
    const allForType = getSpawnpointsByType(stepType);
    if (!event.query.trim().length) {
        filteredSpawnpoints.value = [...allForType];
    } else {
        filteredSpawnpoints.value = allForType.filter((p) => {
            return p.label.toLowerCase().includes(event.query.toLowerCase());
        });
    }
};

const characterOptions = computed(() => {
    return [
        { name: 'PLAYER', id: 'PLAYER' },
        ...characters.value.filter(c => c.type === 'person')
    ];
});

onMounted(fetchInitialData);
</script>

<template>
    <div class="action-edit-view">
        <EditViewHeader
            v-if="action"
            backRoute="/actions"
            parentName="ACTIONS"
            :itemName="action.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        />

        <div v-if="loading" class="loading-state">Loading sequence...</div>

        <div v-else-if="action" class="edit-layout">
            <div class="main-column">
                <div class="sequence-card card">
                    <div class="card-header">
                        <span class="header-title">ACTION SEQUENCE</span>
                        <span class="step-count">{{ action.actions.length }} STEPS TOTAL</span>
                    </div>

                    <div class="sequence-list">
                        <div v-if="action.actions.length === 0" class="empty-sequence">
                            No actions defined. Add one from the panel on the right.
                        </div>
                        <div v-for="(step, index) in action.actions" :key="index" class="sequence-step">
                            <div class="step-index">{{ String(index + 1).padStart(2, '0') }}</div>
                            <div class="step-icon">
                                <i :class="actionTypes.find(t => t.type === step.type)?.icon"></i>
                            </div>
                            <div class="step-content">
                                <div class="step-row">
                                    <div class="step-label">{{ actionTypes.find(t => t.type === step.type)?.label }}</div>

                                    <!-- Step editors -->
                                    <div v-if="step.type === 'WALK_TO_POSITION'" class="step-editor-group">
                                        <Select
                                            v-model="step.data.spawn_type"
                                            :options="spawnPointTypes"
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Type"
                                            class="noir-select type-select"
                                        />
                                        <AutoComplete
                                            v-model="step.data.spawnpoint"
                                            :suggestions="filteredSpawnpoints"
                                            optionLabel="label"
                                            optionValue="value"
                                            @complete="(e) => searchSpawnpoints(e, step.data.spawn_type)"
                                            placeholder="Pick a spawnpoint"
                                            forceSelection
                                            class="noir-autocomplete"
                                        />
                                    </div>

                                    <div v-else-if="step.type === 'IDLE_WAIT'" class="step-editor-group">
                                        <InputNumber v-model="step.data.duration" class="noir-input tiny-input seconds-input" :min="0" />
                                        <span class="unit-label ml-2">SECONDS</span>
                                    </div>

                                    <div v-else-if="step.type === 'LOOK_AT_TARGET'" class="step-editor">
                                        <Select
                                            v-model="step.data.target_id"
                                            :options="characterOptions"
                                            optionLabel="name"
                                            optionValue="id"
                                            placeholder="Pick a character"
                                            filter
                                            class="noir-select"
                                        />
                                    </div>

                                    <div v-else-if="step.type === 'START_DIALOGUE'" class="step-editor">
                                        <Select
                                            v-model="step.data.dialog_id"
                                            :options="dialogs"
                                            optionLabel="title"
                                            optionValue="id"
                                            placeholder="Pick a dialog"
                                            filter
                                            class="noir-select"
                                        />
                                    </div>

                                    <div v-else-if="step.type === 'CUSTOM_COMMAND'" class="step-editor">
                                        <InputText v-model="step.data.command" class="noir-input w-full" placeholder="Command string..." />
                                    </div>
                                </div>
                            </div>

                            <div class="step-actions">
                                <Button icon="pi pi-chevron-up" text @click="moveStep(index, -1)" :disabled="index === 0" />
                                <Button icon="pi pi-chevron-down" text @click="moveStep(index, 1)" :disabled="index === action.actions.length - 1" />
                                <Button icon="pi pi-trash" severity="danger" text @click="removeStep(index)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="side-column">
                <div class="properties-card card">
                    <span class="section-label">PROPERTIES</span>
                    <div class="field mt-3">
                        <label>NAME</label>
                        <InputText v-model="action.name" class="noir-input w-full" />
                    </div>
                    <div class="field">
                        <label>DESCRIPTION</label>
                        <Textarea v-model="action.description" rows="5" class="noir-input w-full" />
                    </div>
                </div>

                <div class="add-actions-card card">
                    <span class="section-label">ADD ACTIONS</span>
                    <div class="add-buttons mt-3">
                        <button
                            v-for="at in actionTypes"
                            :key="at.type"
                            class="add-action-btn"
                            @click="addActionStep(at.type)"
                        >
                            <i :class="at.icon" class="mr-2"></i>
                            {{ at.label }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.action-edit-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-right: 1rem;
    overflow-y: auto;
}

.edit-layout {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 1.5rem;
    padding: 1rem 0;
}

.card {
    background: var(--color-noir-panel);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 1rem;
}

.header-title {
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--color-noir-muted);
}

.step-count {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

.sequence-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.sequence-step {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 1rem;
    transition: all 0.2s;
}

.sequence-step:hover {
    background: rgba(255, 255, 255, 0.03);
}

.step-index {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.8rem;
    width: 30px;
    text-align: center;
}

.step-icon {
    width: 40px;
    height: 40px;
    background: var(--color-noir-dark);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-noir-accent);
    font-size: 1.2rem;
}

.step-content {
    flex: 1;
}

.step-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.step-label {
    font-size: 0.7rem;
    font-weight: bold;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
    width: 120px;
    flex-shrink: 0;
}

.step-editor-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.type-select {
    width: 120px !important;
}


.tiny-input :deep(input) {
    width: 80px !important;
    text-align: center;
}

#app .sequence-step .seconds-input {
    padding: 0 !important;
}
.add-action-btn i {
    margin-right: 8px;
}
.step-actions {
    display: flex;
    gap: 0.25rem;
}

.section-label {
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--color-noir-accent);
    letter-spacing: 1px;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
}

.add-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.add-action-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--color-noir-text);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: bold;
}

.add-action-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-noir-accent);
}

.add-action-btn i {
    color: var(--color-noir-accent);
}

.noir-input, :deep(.p-inputtext), :deep(.p-select), :deep(.p-autocomplete-input) {
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.noir-autocomplete {
    width: 100%;
}

:deep(.p-autocomplete) {
    width: 100%;
}

.unit-label {
    font-size: 0.7rem;
    color: var(--color-noir-muted);
}

.empty-sequence {
    text-align: center;
    padding: 3rem;
    color: var(--color-noir-muted);
    font-style: italic;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}
</style>
