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

const characterId = route.params.id;
const character = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const showUpload = ref(false);

const isVehicle = computed(() => route.path.includes('/vehicles/'));
const i18nPrefix = computed(() => isVehicle.value ? 'vehicles' : 'characters');
const backRoute = computed(() => isVehicle.value ? '/vehicles' : '/characters');

const fetchCharacter = async () => {
    try {
        const response = await fetch(`/api/characters/${characterId}`);
        if (!response.ok) throw new Error('Failed to fetch character');
        character.value = await response.json();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t(`${i18nPrefix.value}.messages.error_summary`),
            detail: t(`${i18nPrefix.value}.messages.error_load`),
            life: 3000
        });
        router.push(backRoute.value);
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    if (!character.value.name) {
        toast.add({
            severity: 'warn',
            summary: t(`${i18nPrefix.value}.messages.error_summary`),
            detail: t(`${i18nPrefix.value}.messages.error_fill_fields`),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch(`/api/characters/${characterId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(character.value)
        });

        if (!response.ok) throw new Error('Failed to update character');

        toast.add({
            severity: 'success',
            summary: t(`${i18nPrefix.value}.messages.success_summary`),
            detail: t(`${i18nPrefix.value}.messages.success_update`),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t(`${i18nPrefix.value}.messages.error_summary`),
            detail: t(`${i18nPrefix.value}.messages.error_save`),
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
        const response = await fetch(`/api/characters/${characterId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) throw new Error('Failed to delete character');

        toast.add({
            severity: 'success',
            summary: t(`${i18nPrefix.value}.messages.success_summary`),
            detail: t(`${i18nPrefix.value}.messages.success_delete`),
            life: 3000
        });

        router.push(backRoute.value);
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t(`${i18nPrefix.value}.messages.error_summary`),
            detail: t(`${i18nPrefix.value}.messages.error_delete`),
            life: 3000
        });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const current3dMedia = computed(() => {
    if (!character.value || !character.value.media) return null;
    return character.value.media.find(m => m.type === '3d');
});

const current2dMedia = computed(() => {
    if (!character.value || !character.value.media) return null;
    return character.value.media.find(m => m.type === '2d');
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
    if (!character.value.media) character.value.media = [];
    character.value.media = character.value.media.filter(m => m.type !== newMedia.type);
    character.value.media.push(newMedia);
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

        character.value.media = character.value.media.filter(m => m.id !== mediaItem.id);
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

const activeTab = ref("0");

onMounted(async () => {
    await fetchCharacter();
    if (!current3dMedia.value && current2dMedia.value) {
        activeTab.value = "1";
    }
});
</script>

<template>
    <div class="character-edit-view">
        <EditViewHeader
            v-if="character"
            :backRoute="backRoute"
            :parentName="t(`common.sidebar.${i18nPrefix}`)"
            :itemName="character.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        />

        <div v-if="loading" class="loading-state">
            {{ t(`common.views.${i18nPrefix}.loading`) }}
        </div>

        <div v-else-if="character" class="edit-layout">
            <div class="edit-hero">
                <h1 class="edit-hero__title">{{ character.name }}</h1>
                <span class="edit-hero__id">ID:{{ character.id }} / {{ character.type.toUpperCase() }}</span>
            </div>

            <div class="edit-grid">
                <!-- LEFT SIDE: MEDIA -->
                <div class="media-column">
                    <div v-if="showUpload" class="upload-wrapper card shadow-lg">
                        <MediaUpload
                            :modelId="character.id"
                            modelType="App\Models\Character"
                            :accept="uploadType === '3d' ? '.glb' : 'image/*'"
                            :label="uploadType === '3d' ? t(`${i18nPrefix}.edit.media.btn_add_3d`) : t(`${i18nPrefix}.edit.media.btn_add_2d`)"
                            @uploaded="handleMediaUploaded"
                            @close="showUpload = false"
                        />
                    </div>

                    <div v-else class="previews-container">
                        <Tabs v-model:value="activeTab" class="noir-tabs">
                            <TabList>
                                <Tab value="0">{{ t(`${i18nPrefix}.edit.media.tabs.neural`) }}</Tab>
                                <Tab value="1">{{ t(`${i18nPrefix}.edit.media.tabs.visual`) }}</Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel value="0">
                                    <div class="preview-section 3d-section">
                                        <ThreePreview :modelUrl="mediaUrl3d" :title="t(`${i18nPrefix}.edit.media.header_3d`)">
                                            <template #header-actions>
                                                <Button
                                                    v-if="!current3dMedia"
                                                    :label="t(`${i18nPrefix}.edit.media.btn_add_3d`)"
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
                                    <div class="preview-section portrait-section">
                                        <div class="image-wrapper card shadow-lg">
                                            <div class="header-overlay">
                                                <span class="header-title">{{ t(`${i18nPrefix}.edit.media.header_2d`) }}</span>
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
                                                        :label="t(`${i18nPrefix}.edit.media.btn_add_2d`)"
                                                        text
                                                        class="upload-trigger-btn"
                                                        @click="triggerUpload('2d')"
                                                    />
                                                </div>
                                            </div>
                                            <div v-if="current2dMedia" class="image-display">
                                                <img :src="mediaUrl2d" :alt="character.name" class="character-image" />
                                            </div>
                                            <div v-else class="no-media-state">
                                                <span class="no-visual-data small">{{ t(`${i18nPrefix}.edit.media.no_2d`) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </div>
                </div>

                <!-- RIGHT SIDE: FORM -->
                <div class="form-column">
                    <div class="field">
                        <label for="name">{{ i18nPrefix === 'vehicles' ? 'REGISTRATION' : 'PERSON' }}</label>
                        <InputText id="name" v-model="character.name" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="role">{{ i18nPrefix === 'vehicles' ? 'CLASSIFICATION' : 'OCCUPATION' }}</label>
                        <InputText id="role" v-model="character.role" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="description">DESCRIPTION</label>
                        <Textarea id="description" v-model="character.description" rows="5" class="noir-input" />
                    </div>

                    <div v-if="!isVehicle" class="field">
                        <label for="motive">MOTIVE</label>
                        <InputText id="motive" v-model="character.motive" class="noir-input" />
                    </div>

                    <div class="field checkbox-field">
                        <Checkbox id="is_playable" v-model="character.is_playable" :binary="true" />
                        <label for="is_playable" class="checkbox-label">PLAYER_CONTROL_ACCESS</label>
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
.character-edit-view {
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
}

.edit-layout {
    max-width: 1400px;
    margin: 0 auto;
}

.edit-hero {
    display: flex;
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
    margin-left: auto;
}

.edit-grid {
    display: grid;
    /*grid-template-columns: 1fr 2.5fr;*/
    grid-template-columns: 400px 2fr;
    gap: 2rem;
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

.character-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: #000;
}

.no-media-state {
    aspect-ratio: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #0b0f19;
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

.field label:not(.checkbox-label) {
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
    margin-bottom: -2px;
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
</style>
