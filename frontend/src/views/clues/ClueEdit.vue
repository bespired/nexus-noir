<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/customs/EditViewHeader.vue';
import MediaUpload from '@components/customs/MediaUpload.vue';
import ThreePreview from '@components/customs/ThreePreview.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const clueId = route.params.id;
const clue = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const showUpload = ref(false);

const typeOptions = ref([
    { label: 'Image',     value: 'image' },
    { label: '3D Object', value: 'object' },
    { label: 'GameState', value: 'gamestate' }
]);

const fetchClue = async () => {
    try {
        const response = await fetch(`/api/clues/${clueId}`);
        if (!response.ok) throw new Error('Failed to fetch clue');
        clue.value = await response.json();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('clues.messages.error_summary'),
            detail: 'Could not load clue',
            life: 3000
        });
        router.push('/clues');
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    if (!clue.value.title || !clue.value.description) {
        toast.add({
            severity: 'warn',
            summary: t('clues.messages.error_summary'),
            detail: t('clues.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch(`/api/clues/${clueId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(clue.value)
        });

        if (!response.ok) throw new Error('Failed to update clue');

        toast.add({
            severity: 'success',
            summary: t('clues.messages.success_summary'),
            detail: 'Clue updated successfully',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('clues.messages.error_summary'),
            detail: t('clues.messages.error_save'),
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
        const response = await fetch(`/api/clues/${clueId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) throw new Error('Failed to delete clue');

        toast.add({
            severity: 'success',
            summary: t('clues.messages.success_summary'),
            detail: 'Clue deleted successfully',
            life: 3000
        });

        router.push('/clues');
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('clues.messages.error_summary'),
            detail: 'Could not delete clue',
            life: 3000
        });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const current3dMedia = computed(() => {
    if (!clue.value || !clue.value.media) return null;
    return clue.value.media.find(m => m.type === '3d');
});

const current2dMedia = computed(() => {
    if (!clue.value || !clue.value.media) return null;
    return clue.value.media.find(m => m.type === '2d');
});

const mediaUrl3d = computed(() => {
    if (!current3dMedia.value) return null;
    const file = current3dMedia.value.filepad;
    if (file.startsWith('http')) return file;
    return `/storage/${file}`;
});

const mediaUrl2d = computed(() => {
    if (!current2dMedia.value) return null;
    const file = current2dMedia.value.filepad;
    if (file.startsWith('http')) return file;
    return `/storage/${file}`;
});

const handleMediaUploaded = (newMedia) => {
    if (!clue.value.media) clue.value.media = [];
    // Remove old media of same type if we want 1-per-type
    clue.value.media = clue.value.media.filter(m => m.type !== newMedia.type);
    clue.value.media.push(newMedia);
    showUpload.value = false;
};

const deleteMedia = async (mediaItem) => {
    if (!mediaItem) return;

    try {
        const response = await fetch(`/api/media/${mediaItem.id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete media');

        clue.value.media = clue.value.media.filter(m => m.id !== mediaItem.id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Media removed.', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete media.', life: 3000 });
    }
};

const uploadType = ref('2d');
const triggerUpload = (type) => {
    uploadType.value = type;
    showUpload.value = true;
};

onMounted(() => {
    fetchClue();
});
</script>

<template>
    <div class="clue-edit-view">
        <EditViewHeader
            v-if="clue"
            backRoute="/clues"
            :parentName="t('common.sidebar.clues')"
            :itemName="clue.title"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        />

        <div v-if="loading" class="loading-state">
            {{ t('common.views.clues.loading') }}
        </div>

        <div v-else-if="clue" class="edit-layout">
            <!-- HEADER HERO -->
            <div class="edit-hero">
                <h1 class="edit-hero__title">{{ clue.title }}</h1>
                <span class="edit-hero__id">ID:{{ clue.id }}</span>
            </div>

            <div class="edit-grid">
                <!-- LEFT SIDE: MEDIA -->
                <div class="media-column">
                    <div v-if="showUpload" class="upload-wrapper card shadow-lg">
                        <MediaUpload
                            :modelId="clue.id"
                            modelType="App\Models\Clue"
                            :accept="uploadType === '3d' ? '.glb' : 'image/*'"
                            :label="uploadType === '3d' ? 'UPLOAD .GLB MODEL' : 'UPLOAD THUMBNAIL'"
                            @uploaded="handleMediaUploaded"
                            @close="showUpload = false"
                        />
                    </div>

                    <div v-else class="previews-container">
                        <Tabs v-if="clue.type === 'object'" value="0" class="noir-tabs">
                            <TabList>
                                <Tab value="0">{{ t('clues.edit.media.tabs.neural') }}</Tab>
                                <Tab value="1">{{ t('clues.edit.media.tabs.visual') }}</Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel value="0">
                                    <div class="preview-section 3d-section">
                                        <ThreePreview :modelUrl="mediaUrl3d" :title="t('clues.edit.media.header_3d')">
                                            <template #header-actions>
                                                <Button
                                                    v-if="!current3dMedia"
                                                    :label="t('clues.edit.media.btn_add_3d')"
                                                    text
                                                    class="upload-trigger-btn"
                                                    @click="triggerUpload('3d')"
                                                />
                                                <Button
                                                    v-else
                                                    icon="pi pi-trash"
                                                    severity="danger"
                                                    text
                                                    class="upload-trigger-btn"
                                                    @click="deleteMedia(current3dMedia)"
                                                />
                                            </template>
                                        </ThreePreview>
                                    </div>
                                </TabPanel>
                                <TabPanel value="1">
                                    <div class="preview-section thumb-section">
                                        <div class="image-wrapper card shadow-lg">
                                            <div class="header-overlay">
                                                <span class="header-title">{{ t('clues.edit.media.header_2d') }}</span>
                                                <div class="header-actions">
                                                    <Button
                                                        v-if="current2dMedia"
                                                        icon="pi pi-trash"
                                                        severity="danger"
                                                        text
                                                        class="delete-media-btn"
                                                        @click="deleteMedia(current2dMedia)"
                                                    />
                                                    <Button
                                                        v-else
                                                        :label="t('clues.edit.media.btn_add_2d')"
                                                        text
                                                        class="upload-trigger-btn"
                                                        @click="triggerUpload('2d')"
                                                    />
                                                </div>
                                            </div>
                                            <div v-if="current2dMedia" class="image-display">
                                                <img :src="mediaUrl2d" alt="Clue Thumbnail" class="clue-image" />
                                            </div>
                                            <div v-else class="no-media-state mini">
                                                <span class="no-visual-data small">{{ t('clues.edit.media.no_2d') }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>

                        <!-- fallback for non-object types or if tabs are not desired -->
                        <div v-else class="preview-section thumb-section">
                            <div class="image-wrapper card shadow-lg">
                                <div class="header-overlay">
                                    <span class="header-title">{{ t('clues.edit.media.header_2d') }}</span>
                                    <div class="header-actions">
                                        <Button
                                            v-if="current2dMedia"
                                            icon="pi pi-trash"
                                            severity="danger"
                                            text
                                            class="delete-media-btn"
                                            @click="deleteMedia(current2dMedia)"
                                        />
                                        <Button
                                            v-else
                                            :label="t('clues.edit.media.btn_add_2d')"
                                            text
                                            class="upload-trigger-btn"
                                            @click="triggerUpload('2d')"
                                        />
                                    </div>
                                </div>
                                <div v-if="current2dMedia" class="image-display">
                                    <img :src="mediaUrl2d" alt="Clue Thumbnail" class="clue-image" />
                                </div>
                                <div v-else class="no-media-state mini">
                                    <span class="no-visual-data small">{{ t('clues.edit.media.no_2d') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT SIDE: FORM -->
                <div class="form-column">
                    <div class="field">
                        <label for="title">EVIDENCE</label>
                        <InputText id="title" v-model="clue.title" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="description">DESCRIPTION</label>
                        <Textarea id="description" v-model="clue.description" rows="5" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="type">TYPE</label>
                        <Select
                            id="type"
                            v-model="clue.type"
                            :options="typeOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="noir-input noir-select"
                        />
                    </div>

                    <div class="field checkbox-field">
                        <Checkbox id="initial" v-model="clue.initial" :binary="true" />
                        <label for="initial" class="checkbox-label">INITIAL IN POSSESSION OF PLAYER</label>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>


.clue-edit-view {
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
}

.edit-layout {
    max-width: 1400px;
    margin: 0 auto;
}

.edit-hero {
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
}

.edit-hero__id {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.9rem;
}

.edit-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 3rem;
    align-items: start;
}

/* Media Column */
.media-column {
    width: 100%;
}

.previews-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.thumb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.section-label {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.8rem;
    letter-spacing: 1px;
}

.card {
    background-color: var(--color-noir-panel);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.image-wrapper {
    width: 100%;
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
    background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
    z-index: 10;
}

.header-title {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.8rem;
    letter-spacing: 2px;
}

.image-display {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
}

.clue-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: #000;
}

.no-media-state {
    aspect-ratio: 1/1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    background-color: #0b0f19;
}

.no-media-state.mini {
    aspect-ratio: 1 / 1;
    gap: 1rem;
}

.no-visual-data {
    font-family: var(--font-mono);
    font-size: 1.25rem;
    color: var(--color-noir-muted);
    font-style: italic;
}

.no-visual-data.small {
    font-size: 0.9rem;
}

.scan-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
}

.upload-trigger-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
    font-size: 0.8rem !important;
    color: var(--color-noir-accent) !important;
}

/* Form Column */
.form-column {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.field label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.noir-input {
    width: 100%;
    background: #0b0f19 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
    padding: 1rem !important;
}

.checkbox-field {
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: rgba(255,255,255,0.02);
    padding: 1rem;
    border-radius: 4px;
}

.checkbox-label {
    margin-bottom: 0 !important;
    cursor: pointer;
    font-size: 0.8rem !important;
    color: var(--color-noir-muted) !important;
}

.loading-state {
    text-align: center;
    padding: 5rem;
    color: var(--color-noir-muted);
    font-size: 1.2rem;
}

/* Tabs Styling */
.noir-tabs {
    background: transparent !important;
}

:deep(.p-tablist-tab-list) {
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid rgba(255,255,255,0.05) !important;
}

:deep(.p-tab) {
    background: transparent !important;
    color: var(--color-noir-muted) !important;
    border: none !important;
    font-family: var(--font-mono) !important;
    font-size: 0.8rem !important;
    letter-spacing: 1.5px !important;
    padding: 0 2rem 1rem 2rem !important;
    transition: all 0.3s ease;
    border-bottom: 2px solid transparent !important;
    margin-bottom: -2px; /* overlap the tablist border */
}

:deep(.p-tab:not(.p-tab-active):hover) {
    color: var(--color-noir-text) !important;
}

:deep(.p-tab-active) {
    background: transparent !important;
    color: var(--color-noir-accent) !important;
    border-bottom: 2px solid var(--color-noir-accent) !important;
}

:deep(.p-tabpanels) {
    background: transparent !important;
    padding: 2rem 0 !important;
}

:deep(.p-select-label) {
    color: white !important;
}
</style>
