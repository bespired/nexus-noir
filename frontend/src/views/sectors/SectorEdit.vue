<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import ConfirmationModal from '@components/editor/modals/ConfirmationModal.vue';
import SceneThumb from '@components/editor/thumbs/SceneThumb.vue';
import ClueThumb from '@components/editor/thumbs/ClueThumb.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sectorId = route.params.id;
const sector = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const linkedClues = ref([]);
const allScenes = ref([]);
const allClues = ref([]);
const showScenePicker = ref(false);
const showCluePicker = ref(false);
const showDeleteConfirm = ref(false);

const fetchSector = async () => {
    try {
        const [sectorRes, scenesRes, cluesRes] = await Promise.all([
            fetch(`/api/sectors/${sectorId}`),
            fetch('/api/scenes'),
            fetch('/api/clues')
        ]);

        if (!sectorRes.ok) throw new Error('Failed to fetch sector');
        const data = await sectorRes.json();
        sector.value = data.sector;
        linkedClues.value = data.clues;

        allScenes.value = await scenesRes.json();
        allClues.value = await cluesRes.json();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: t('sectors.messages.error_load'),
            life: 3000
        });
        router.push('/sectors');
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/sectors/${sectorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                name: sector.value.name,
                description: sector.value.description,
                visible_clue_conditions: sector.value.visible_clue_conditions
            })
        });

        if (!response.ok) throw new Error('Failed to update sector');

        toast.add({
            severity: 'success',
            summary: t('sectors.messages.success_summary'),
            detail: t('sectors.messages.success_update'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('sectors.messages.error_summary'),
            detail: t('sectors.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const handleDelete = () => {
    showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/sectors/${sectorId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to delete sector');

        toast.add({
            severity: 'success',
            summary: t('sectors.messages.success_summary'),
            detail: t('sectors.messages.success_delete'),
            life: 3000
        });
        router.push('/sectors');
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('sectors.messages.error_summary'),
            detail: t('sectors.messages.error_delete'),
            life: 3000
        });
    } finally {
        deleting.value = false;
    }
};

const linkScene = async (scene) => {
    try {
        const response = await fetch(`/api/scenes/${scene.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ ...scene, sector_id: sectorId })
        });
        if (!response.ok) throw new Error('Failed to link scene');

        // Refresh local state
        const updatedScene = await response.json();
        if (!sector.value.scenes) sector.value.scenes = [];
        sector.value.scenes.push(updatedScene);
        showScenePicker.value = false;
        toast.add({ severity: 'success', summary: 'Linked', detail: 'Scene added to sector.', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not link scene.', life: 3000 });
    }
};

const unlinkScene = async (sceneId) => {
    try {
        const scene = sector.value.scenes.find(s => s.id === sceneId);
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ ...scene, sector_id: null })
        });
        if (!response.ok) throw new Error('Failed to unlink scene');

        sector.value.scenes = sector.value.scenes.filter(s => s.id !== sceneId);
        toast.add({ severity: 'success', summary: 'Unlinked', detail: 'Scene removed from sector.', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not unlink scene.', life: 3000 });
    }
};

const linkClue = async (clue) => {
    if (!sector.value.visible_clue_conditions) sector.value.visible_clue_conditions = [];
    if (sector.value.visible_clue_conditions.includes(clue.id)) return;

    sector.value.visible_clue_conditions.push(clue.id);
    linkedClues.value.push(clue);
    showCluePicker.value = false;

    // Auto-save the link
    await handleSave();
};

const unlinkClue = async (clueId) => {
    sector.value.visible_clue_conditions = sector.value.visible_clue_conditions.filter(id => id !== clueId);
    linkedClues.value = linkedClues.value.filter(c => c.id !== clueId);

    // Auto-save the unlink
    await handleSave();
};

const availableScenes = computed(() => {
    return allScenes.value.filter(s => s.sector_id != sectorId);
});

const availableClues = computed(() => {
    const linkedIds = sector.value?.visible_clue_conditions || [];
    return allClues.value.filter(c => !linkedIds.includes(c.id));
});

const heroImageUrl = computed(() => {
    if (sector.value && sector.value.media && sector.value.media.length > 0) {
        const file = sector.value.media[0].filepad;
        if (file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

onMounted(fetchSector);
</script>

<template>
    <div class="sector-edit-view">
        <EditViewHeader
            v-if="sector"
            backRoute="/sectors"
            parentName="SECTORS"
            :itemName="sector.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        >
            <template #extra-actions>
                <Button label="VISUAL MAP" severity="info" class="header-btn visual-map-btn" @click="router.push('/sectors/map')" />
            </template>
        </EditViewHeader>

        <div v-if="loading" class="loading-state">
            {{ t('sectors.edit.loading') }}
        </div>

        <div v-else-if="sector" class="edit-layout">
            <!-- HERO SECTION -->
            <div class="sector-hero" :style="heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : {}">
                <div class="sector-hero__overlay">
                    <div class="hero-content">
                        <div class="field title-field">
                            <label class="hero-label">{{ t('sectors.edit.label_name') }}</label>
                            <InputText v-model="sector.name" class="noir-input hero-input name-input" />
                        </div>
                        <div class="field desc-field">
                            <label class="hero-label">{{ t('sectors.edit.label_description') }}</label>
                            <InputText v-model="sector.description" class="noir-input hero-input desc-input" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="sector-edit-grid">
                <!-- SCENES COLUMN -->
                <div class="column">
                    <div class="column-header">
                        <h2>{{ t('sectors.edit.header_scenes') }}</h2>
                        <Button :label="t('sectors.edit.btn_link_scene')" severity="warning" text class="link-btn" @click="showScenePicker = true" />
                    </div>
                    <div class="thumbs-grid">
                        <div v-for="scene in sector.scenes" :key="scene.id" class="thumb-container">
                            <SceneThumb :scene="scene" />
                            <Button icon="pi pi-trash" severity="danger" text class="unlink-btn" @click="unlinkScene(scene.id)" />
                        </div>
                    </div>
                </div>

                <!-- CLUES COLUMN -->
                <div class="column">
                    <div class="column-header">
                        <h2>{{ t('sectors.edit.header_clues') }}</h2>
                        <Button :label="t('sectors.edit.btn_link_clue')" severity="warning" text class="link-btn" @click="showCluePicker = true" />
                    </div>
                    <div class="thumbs-grid">
                        <div v-for="clue in linkedClues" :key="clue.id" class="thumb-container">
                            <ClueThumb :clue="clue" />
                            <Button icon="pi pi-trash" severity="danger" text class="unlink-btn" @click="unlinkClue(clue.id)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- PICKER MODALS -->
        <Dialog v-model:visible="showScenePicker" :header="t('sectors.edit.pickers.scene_title')" modal :style="{ width: '50vw' }" class="noir-dialog">
            <div class="picker-list">
                <div v-for="scene in availableScenes" :key="scene.id" class="picker-item" @click="linkScene(scene)">
                    <span class="picker-item__name">{{ scene.title }}</span>
                    <span class="picker-item__id">ID: {{ scene.id }}</span>
                </div>
                <div v-if="availableScenes.length === 0" class="empty-state">{{ t('sectors.edit.pickers.no_scenes') }}</div>
            </div>
        </Dialog>

        <Dialog v-model:visible="showCluePicker" :header="t('sectors.edit.pickers.clue_title')" modal :style="{ width: '50vw' }" class="noir-dialog">
            <div class="picker-list">
                <div v-for="clue in availableClues" :key="clue.id" class="picker-item" @click="linkClue(clue)">
                    <span class="picker-item__name">{{ clue.title }}</span>
                    <span class="picker-item__id">ID: {{ clue.id }}</span>
                </div>
                <div v-if="availableClues.length === 0" class="empty-state">{{ t('sectors.edit.pickers.no_clues') }}</div>
            </div>
        </Dialog>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="confirmDelete"
            :message="t('sectors.edit.confirm_delete')"
        />
    </div>
</template>

<style scoped>
.sector-edit-view {
    padding: 0 1rem 0 0;
    height: 100%;
    overflow-y: auto;
}

.sector-hero {
    height: 300px;
    background-size: cover;
    background-position: center;
    border-radius: 4px;
    margin-bottom: 3rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.sector-hero__overlay {
    height: 100%;
    background: linear-gradient(90deg, rgba(11, 15, 25, 0.9) 0%, rgba(11, 15, 25, 0.4) 50%, transparent 100%);
    display: flex;
    align-items: center;
    padding: 0 4rem;
}

.hero-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    width: 60%;
}

.hero-label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
}

.hero-input {
    background: rgba(0, 0, 0, 0.4) !important;
    border: none !important;
    border-radius: 2px !important;
    padding: 0.75rem 1.5rem !important;
    width: 100%;
}

.name-input {
    font-size: 2.5rem !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    letter-spacing: 2px !important;
}

.desc-input {
    font-size: 1.1rem !important;
    color: var(--color-noir-text) !important;
}

.hero-input:focus {
    background: rgba(0, 0, 0, 0.6) !important;
}

.sector-edit-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 4rem;
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 1rem;
}

.column-header h2 {
    font-size: 1.25rem;
    letter-spacing: 2px;
    margin: 0;
}

.thumbs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.link-btn {
    font-size: 0.8rem !important;
    font-weight: bold !important;
    background-color: rgba(245, 158, 11, 0.1) !important;
    color: #f59e0b !important;
}

.visual-map-btn {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border: 1px solid #3b82f6 !important;
    color: #3b82f6 !important;
}

.header-btn {
    font-size: 0.8rem !important;
    font-weight: bold !important;
}

.thumb-container {
    position: relative;
}

.unlink-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5) !important;
}

.picker-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
}

.picker-item {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    transition: background 0.2s;
}

.picker-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.picker-item__name {
    font-family: var(--font-mono);
    text-transform: uppercase;
}

.picker-item__id {
    color: var(--color-noir-muted);
    font-size: 0.8rem;
}

.empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--color-noir-muted);
    font-style: italic;
}
</style>
