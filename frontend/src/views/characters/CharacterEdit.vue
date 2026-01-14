<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import ConfirmationModal from '@components/editor/modals/ConfirmationModal.vue';
import MediaUpload from '@components/editor/MediaUpload.vue';
import ThreePreview from '@components/editor/ThreePreview.vue';

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
const threePreview = ref(null);

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

const handleCaptureScreenshot = async () => {
    if (!threePreview.value) return;

    const dataUrl = threePreview.value.captureScreenshot();
    if (!dataUrl) return;

    // Convert base64 to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `thumb_${characterId}.png`, { type: 'image/png' });

    // If existing 2D media exists, delete it first
    if (current2dMedia.value) {
        await deleteMedia(current2dMedia.value);
    }

    // Upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageable_id', characterId);
    formData.append('imageable_type', isVehicle.value ? 'App\\Models\\Character' : 'App\\Models\\Character'); // Both use Character model in current DB
    formData.append('title', '3D_SCAN_THUMB');

    try {
        const response = await fetch('/api/media', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Upload failed');

        const newMedia = await response.json();
        handleMediaUploaded(newMedia);

        toast.add({
            severity: 'success',
            summary: 'Thumbnail Captured',
            detail: 'New 2D preview generated from 3D view.',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Capture Error',
            detail: 'Could not generate thumbnail.',
            life: 3000
        });
    }
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
                                        <ThreePreview ref="threePreview" :modelUrl="mediaUrl3d" :title="t(`${i18nPrefix}.edit.media.header_3d`)">
                                            <template #header-actions>
                                                <Button
                                                    v-if="!current3dMedia"
                                                    :label="t(`${i18nPrefix}.edit.media.btn_add_3d`)"
                                                    text
                                                    class="upload-trigger-btn"
                                                    @click="triggerUpload('3d')"
                                                />
                                                <div v-else class="flex gap-2">
                                                    <Button
                                                        icon="pi pi-camera"
                                                        severity="secondary"
                                                        text
                                                        class="upload-trigger-btn"
                                                        v-tooltip.top="'CAPTURE_THUMB'"
                                                        @click="handleCaptureScreenshot"
                                                    />
                                                    <Button
                                                        icon="pi pi-trash"
                                                        severity="danger"
                                                        text
                                                        class="upload-trigger-btn"
                                                        @click="deleteMedia(current3dMedia)"
                                                    />
                                                </div>
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
            @accept="confirmDelete"
            :message="t(`${i18nPrefix}.messages.confirm_delete`) || 'Are you sure you want to delete this?'"
        />
    </div>
</template>

<style scoped>
.character-edit-view {
    padding: 0 1rem 0 0;
    height: 100%;
    overflow-y: auto;
}

/* Media Column specific */
.media-column {
    width: 100%;
}

.previews-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.image-wrapper {
    width: 100%;
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
</style>
