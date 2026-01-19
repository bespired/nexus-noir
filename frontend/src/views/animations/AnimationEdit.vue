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

const animationId = route.params.id;
const animation = ref(null);
const characters = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const showUpload = ref(false);
const threePreview = ref(null);
const showSkin = ref(true);
const showSkeleton = ref(true);

const typeOptions = ref([
    { label: 'Mixamo', value: 'mixamo' },
    { label: 'Blender', value: 'blender' },
    { label: 'Other', value: 'other' }
]);

const fetchAnimation = async () => {
    try {
        const response = await fetch(`/api/animations/${animationId}`);
        if (!response.ok) throw new Error('Failed to fetch animation');
        const data = await response.json();
        
        // Convert characters to character_ids for MultiSelect
        data.character_ids = data.characters.map(c => c.id);
        animation.value = data;
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('animations.messages.error_summary'),
            detail: 'Could not load animation',
            life: 3000
        });
        router.push('/animations');
    }
};

const fetchCharacters = async () => {
    try {
        const response = await fetch('/api/characters');
        if (!response.ok) throw new Error('Failed to fetch characters');
        characters.value = await response.json();
    } catch (error) {
        console.error(error);
    }
};

const handleSave = async () => {
    if (!animation.value.name) {
        toast.add({
            severity: 'warn',
            summary: t('animations.messages.error_summary'),
            detail: t('animations.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch(`/api/animations/${animationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(animation.value)
        });

        if (!response.ok) throw new Error('Failed to update animation');

        toast.add({
            severity: 'success',
            summary: t('animations.messages.success_summary'),
            detail: 'Animation updated successfully',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('animations.messages.error_summary'),
            detail: t('animations.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const removeCharacter = (charId) => {
    animation.value.character_ids = animation.value.character_ids.filter(id => id !== charId);
};

const handleDelete = () => {
    showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/animations/${animationId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) throw new Error('Failed to delete animation');

        toast.add({
            severity: 'success',
            summary: t('animations.messages.success_summary'),
            detail: 'Animation deleted successfully',
            life: 3000
        });

        router.push('/animations');
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('animations.messages.error_summary'),
            detail: 'Could not delete animation',
            life: 3000
        });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const current3dMedia = computed(() => {
    if (!animation.value || !animation.value.media) return null;
    return animation.value.media.find(m => m.type === '3d');
});

const current2dMedia = computed(() => {
    if (!animation.value || !animation.value.media) return null;
    return animation.value.media.find(m => m.type === '2d');
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
    if (!animation.value.media) animation.value.media = [];
    animation.value.media = animation.value.media.filter(m => m.type !== newMedia.type);
    animation.value.media.push(newMedia);
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

        animation.value.media = animation.value.media.filter(m => m.id !== mediaItem.id);
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

    // Save current camera state
    threePreview.value.saveCameraState();

    // Prepare Photo-Opp pose and framing
    // Ensure skeleton is detectable (forceSkeleton: true) 
    // and use full body view (isMugshot: false [default])
    threePreview.value.preparePhotoOpp({ 
        forceSkeleton: true 
    });

    const dataUrl = threePreview.value.captureScreenshot();
    
    // Restore camera state
    threePreview.value.restoreCameraState();

    if (!dataUrl) return;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `thumb_animation_${animationId}.png`, { type: 'image/png' });

    if (current2dMedia.value) {
        await deleteMedia(current2dMedia.value);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageable_id', animationId);
    formData.append('imageable_type', 'App\\Models\\Animation');
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

onMounted(async () => {
    await Promise.all([fetchAnimation(), fetchCharacters()]);
    loading.value = false;
});
</script>

<template>
    <div class="animation-edit-view">
        <EditViewHeader
            v-if="animation"
            backRoute="/animations"
            :parentName="t('common.sidebar.animations')"
            :itemName="animation.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        />

        <div v-if="loading" class="loading-state">
            {{ t('common.views.animations.loading') }}
        </div>

        <div v-else-if="animation" class="edit-layout">
            <div class="edit-hero">
                <h1 class="edit-hero__title">{{ animation.name }}</h1>
                <span class="edit-hero__id">ID:{{ animation.id }}</span>
            </div>

            <div class="edit-grid">
                <!-- LEFT SIDE: MEDIA -->
                <div class="media-column">
                    <div v-if="showUpload" class="upload-wrapper card shadow-lg">
                        <MediaUpload
                            :modelId="animation.id"
                            modelType="App\Models\Animation"
                            :accept="uploadType === '3d' ? '.glb,.fbx' : 'image/*'"
                            :label="uploadType === '3d' ? 'UPLOAD 3D MODEL' : 'UPLOAD THUMBNAIL'"
                            @uploaded="handleMediaUploaded"
                            @close="showUpload = false"
                        />
                    </div>

                    <div v-else class="previews-container">
                        <Tabs value="0" class="noir-tabs">
                            <TabList>
                                <Tab value="0">{{ t('animations.edit.media.tabs.neural') }}</Tab>
                                <Tab value="1">{{ t('animations.edit.media.tabs.visual') }}</Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel value="0">
                                    <div class="preview-section 3d-section">
                                        <ThreePreview 
                                            ref="threePreview" 
                                            :modelUrl="mediaUrl3d" 
                                            :title="t('animations.edit.media.header_3d')"
                                            :showSkin="showSkin"
                                            :showSkeleton="showSkeleton"
                                        >
                                            <template #header-actions>
                                                <Button
                                                    icon="pi pi-user"
                                                    :severity="showSkin ? 'primary' : 'secondary'"
                                                    text
                                                    class="toggle-btn"
                                                    v-tooltip.top="'TOGGLE_SKIN'"
                                                    @click="showSkin = !showSkin"
                                                />
                                                <Button
                                                    icon="pi pi-share-alt"
                                                    :severity="showSkeleton ? 'primary' : 'secondary'"
                                                    text
                                                    class="toggle-btn"
                                                    v-tooltip.top="'TOGGLE_SKELETON'"
                                                    @click="showSkeleton = !showSkeleton"
                                                />
                                                <Button
                                                    v-if="!current3dMedia"
                                                    :label="t('animations.edit.media.btn_add_3d')"
                                                    outlined
                                                    class="upload-trigger-btn"
                                                    @click="triggerUpload('3d')"
                                                />
                                                <Button
                                                    v-if="current3dMedia"
                                                    icon="pi pi-camera"
                                                    severity="secondary"
                                                    text
                                                    class="upload-trigger-btn"
                                                    v-tooltip.top="'CAPTURE_THUMB'"
                                                    @click="handleCaptureScreenshot"
                                                />
                                                <Button
                                                    v-if="current3dMedia"
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
                                                <span class="header-title">{{ t('animations.edit.media.header_2d') }}</span>
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
                                                        :label="t('animations.edit.media.btn_add_2d')"
                                                        text
                                                        class="upload-trigger-btn"
                                                        @click="triggerUpload('2d')"
                                                    />
                                                </div>
                                            </div>
                                            <div v-if="current2dMedia" class="image-display">
                                                <img :src="mediaUrl2d" alt="Animation Thumbnail" class="clue-image" />
                                            </div>
                                            <div v-else class="no-media-state mini">
                                                <span class="no-visual-data small">{{ t('animations.edit.media.no_2d') }}</span>
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
                        <label for="name">{{ t('animations.modal.label_name') }}</label>
                        <InputText id="name" v-model="animation.name" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="description">{{ t('animations.modal.label_description') }}</label>
                        <Textarea id="description" v-model="animation.description" rows="5" class="noir-input" />
                    </div>

                    <div class="field">
                        <label for="type">{{ t('animations.modal.label_type') }}</label>
                        <Select
                            id="type"
                            v-model="animation.type"
                            :options="typeOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="noir-input noir-select"
                        />
                    </div>

                    <div class="field">
                        <label for="characters">{{ t('animations.edit.label_characters') }}</label>
                        <div class="badge-view-container card shadow-lg">
                            <div class="badge-list">
                                <template v-if="animation.character_ids && animation.character_ids.length > 0">
                                    <div v-for="charId in animation.character_ids" :key="charId" class="animation-badge">
                                        <span class="badge-text">{{ characters.find(c => c.id === charId)?.name || charId }}</span>
                                        <i class="pi pi-times-circle remove-icon" @click="removeCharacter(charId)"></i>
                                    </div>
                                </template>
                                <div v-else class="no-badges-text">
                                    NO CHARACTERS ASSIGNED
                                </div>
                            </div>
                            <div class="badge-view-actions">
                                <i class="pi pi-chevron-down"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="confirmDelete"
            :message="t('animations.messages.confirm_delete')"
        />
    </div>
</template>

<style scoped>
.animation-edit-view {
    padding: 0 1rem 0 0;
    height: 100%;
    overflow-y: auto;
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
    grid-template-columns: 600px 1fr !important;
    gap: 3rem;
    align-items: start;
}

.media-column {
    width: 100%;
}

.form-column {
    width: 100%;
    max-width: 800px;
}

.previews-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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

.upload-trigger-btn {
    font-family: var(--font-mono);
    font-weight: bold !important;
    font-size: 0.75rem !important;
    letter-spacing: 1px;
    white-space: nowrap;
}

.upload-trigger-btn.p-button-outlined {
    padding: 0.5rem 1.5rem !important;
    background: rgba(var(--color-noir-accent-rgb), 0.1) !important;
    border-color: var(--color-noir-accent) !important;
    color: var(--color-noir-accent) !important;
}

.upload-trigger-btn.p-button-outlined:hover {
    background: rgba(var(--color-noir-accent-rgb), 0.2) !important;
}

.upload-trigger-btn.p-button-text {
    color: var(--color-noir-accent) !important;
}

:deep(.p-select-label), :deep(.p-multiselect-label) {
    color: white !important;
}

/* Badge View Styles */
.badge-view-container {
    background-color: #0b0f19;
    border: 1px solid #1a1f2e;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 3rem;
    border-radius: 4px;
}

.badge-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.animation-badge {
    background-color: #ffffff;
    color: #000000;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-weight: bold;
    font-size: 0.85rem;
    text-transform: uppercase;
}

.remove-icon {
    font-size: 1rem;
    cursor: pointer;
    color: #000000;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.remove-icon:hover {
    opacity: 1;
}

.no-badges-text {
    color: var(--color-noir-muted);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-style: italic;
}

.badge-view-actions {
    color: var(--color-noir-muted);
    margin-left: 1rem;
}
</style>
