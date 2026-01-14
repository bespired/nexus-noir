<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/customs/EditViewHeader.vue';
import ConfirmationModal from '@components/modals/ConfirmationModal.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sceneId = route.params.id;
const scene = ref(null);
const sectors = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);

const sceneTypes = ref([
    { label: t('scenes.modal.type_walkable'), value: 'walkable-area' },
    { label: t('scenes.modal.type_vue'), value: 'vue-component' },
    { label: t('scenes.modal.type_investigation'), value: 'investigation' },
    { label: t('scenes.modal.type_combat'), value: 'combat' },
    { label: t('scenes.modal.type_cutscene'), value: 'cut-scene' }
]);

const fetchInitialData = async () => {
    try {
        const [sceneRes, sectorsRes] = await Promise.all([
            fetch(`/api/scenes/${sceneId}`),
            fetch('/api/sectors')
        ]);

        if (!sceneRes.ok) throw new Error('Failed to fetch scene');
        if (!sectorsRes.ok) throw new Error('Failed to fetch sectors');

        scene.value = await sceneRes.json();
        sectors.value = await sectorsRes.json();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.error_load'),
            life: 3000
        });
        router.push('/scenes');
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type
            })
        });

        if (!response.ok) throw new Error('Failed to update scene');

        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Success',
            detail: t('scenes.edit.messages.success_update'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const handleSetEntryPoint = async () => {
    if (!scene.value.sector_id) return;

    try {
        const response = await fetch(`/api/sectors/${scene.value.sector_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                name: scene.value.sector.name,
                entry_scene_id: scene.value.id
            })
        });

        if (!response.ok) throw new Error('Failed to update sector');

        // Update local state
        scene.value.sector.entry_scene_id = scene.value.id;

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Current scene is now the sector entry point',
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to set entry point',
            life: 3000
        });
    }
};

const handleDelete = () => {
    showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to delete scene');

        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Deleted',
            detail: t('scenes.edit.messages.success_delete'),
            life: 3000
        });
        router.push('/scenes');
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.error_delete'),
            life: 3000
        });
    } finally {
        deleting.value = false;
    }
};

const currentBackdrop = computed(() => {
    if (scene.value && scene.value.media && scene.value.media.length > 0) {
        return scene.value.media.find(m => m.type === '2d');
    }
    return null;
});

const backdropUrl = computed(() => {
    if (currentBackdrop.value) {
        const file = currentBackdrop.value.filepad;
        if (file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const onFileUpload = async (event) => {
    const file = event.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageable_id', sceneId);
    formData.append('imageable_type', 'App\\Models\\Scene');
    formData.append('title', `Backdrop for ${scene.value.title}`);

    try {
        const response = await fetch('/api/media', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const newMedia = await response.json();
        if (!scene.value.media) scene.value.media = [];
        // Replace existing 2d backdrop if it exists
        scene.value.media = scene.value.media.filter(m => m.type !== '2d');
        scene.value.media.push(newMedia);

        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Uploaded',
            detail: t('scenes.edit.messages.upload_success'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.upload_error'),
            life: 3000
        });
    }
};

const deleteBackdrop = async () => {
    const backdrop = currentBackdrop.value;
    if (!backdrop) return;

    try {
        const response = await fetch(`/api/media/${backdrop.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        scene.value.media = scene.value.media.filter(m => m.id !== backdrop.id);
        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Deleted',
            detail: t('scenes.edit.messages.delete_backdrop_success'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.delete_backdrop_error'),
            life: 3000
        });
    }
};

onMounted(fetchInitialData);
</script>

<template>
    <div class="scene-edit-view">
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
                        <router-link :to="`/scenes/${sceneId}/edit`" class="nav-link active">{{ t('scenes.edit.nav_properties') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/gateway`" class="nav-link">{{ t('scenes.edit.nav_gateway') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/spawnpoint`" class="nav-link">{{ t('scenes.edit.nav_3d') }}</router-link>
                    </div>
                    <span class="edit-hero__id">ID:{{ sceneId }}</span>
                </div>
            </div>

            <div class="scene-edit-grid">
                <!-- LEFT: BACKDROP -->
                <div class="backdrop-column">
                    <div class="backdrop-container" :class="{ 'empty': !backdropUrl }">
                        <img v-if="backdropUrl" :src="backdropUrl" class="backdrop-preview" alt="Scene Backdrop" />
                        <div v-else class="backdrop-placeholder">
                            <i class="pi pi-image"></i>
                            <span>{{ t('scenes.edit.no_backdrop') }}</span>
                        </div>

                        <div class="backdrop-actions">
                            <FileUpload
                                mode="basic"
                                name="file"
                                accept="image/*"
                                :maxFileSize="10000000"
                                @uploader="onFileUpload"
                                customUpload
                                auto
                                class="upload-btn"
                                :chooseLabel="backdropUrl ? t('scenes.edit.btn_change') : t('scenes.edit.btn_upload')"
                            />
                            <Button
                                v-if="backdropUrl"
                                icon="pi pi-trash"
                                severity="danger"
                                text
                                @click="deleteBackdrop"
                                class="delete-backdrop-btn"
                            />
                        </div>
                    </div>
                </div>

                <!-- RIGHT: PROPERTIES -->
                <div class="properties-column">
                    <div class="field">
                        <label>{{ t('scenes.modal.label_title') }}</label>
                        <InputText v-model="scene.title" class="noir-input w-full" />
                    </div>

                    <div class="field">
                        <label>{{ t('scenes.edit.label_type') }}</label>
                        <Select
                            v-model="scene.type"
                            :options="sceneTypes"
                            optionLabel="label"
                            optionValue="value"
                            class="noir-select w-full"
                        />
                    </div>

                    <div class="field">
                        <label>{{ t('scenes.edit.label_sector') }}</label>
                        <div class="duo-fields">
                        <div class="sector-field">
                            <Select
                                v-model="scene.sector_id"
                                :options="sectors"
                                optionLabel="name"
                                optionValue="id"
                                class="noir-select flex-grow"
                                :placeholder="t('scenes.edit.label_sector')"
                                showClear
                            />
                            <Button :label="t('scenes.edit.btn_sector')" severity="info" class="sector-btn" @click="router.push(`/sectors/${scene.sector_id}`)" :disabled="!scene.sector_id" />
                        </div>
                        <div v-if="scene.sector_id" class="entry-point-action">
                            <div v-if="scene.sector?.entry_scene_id === scene.id" class="entry-point-badge">
                                <i class="pi pi-check-circle"></i>
                                SECTOR ENTRY POINT
                            </div>
                            <Button
                                v-else
                                label="SET AS SECTOR ENTRY POINT"
                                severity="success"
                                text
                                size="small"
                                icon="pi pi-map-marker"
                                class="entry-btn"
                                @click="handleSetEntryPoint"
                            />
                        </div>
                        </div>
                    </div>

                    <div class="field">
                        <label>{{ t('scenes.edit.label_description') }}</label>
                        <Textarea v-model="scene.description" rows="8" class="noir-input w-full" :placeholder="t('scenes.modal.placeholder_description')" />
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="confirmDelete"
            :message="t('scenes.edit.confirm_delete')"
        />
    </div>
</template>

<style scoped>
.scene-edit-view {
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

.backdrop-container {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.backdrop-container.empty {
    justify-content: center;
    align-items: center;
}

.backdrop-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.backdrop-placeholder {
    color: var(--color-noir-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.backdrop-placeholder i {
    font-size: 3rem;
}

.backdrop-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.5rem;
}

.upload-btn :deep(.p-button) {
    background: rgba(0, 0, 0, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    font-size: 0.7rem !important;
    font-weight: bold !important;
}

.delete-backdrop-btn {
    background: rgba(239, 68, 68, 0.2) !important;
    border: 1px solid var(--color-noir-danger) !important;
    color: var(--color-noir-danger) !important;
}

.properties-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.field label {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
}

.sector-field {
    display: flex;
    gap: 0.5rem;
}

.duo-fields {
    display: flex;
}

.duo-fields > div {
    margin-right: 8px;
}


.sector-btn {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border: 1px solid #3b82f6 !important;
    color: #3b82f6 !important;
    font-weight: bold !important;
    font-size: 0.75rem !important;
}

.entry-point-action {
    margin-top: 0.5rem;
}

.entry-point-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid #22c55e;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
}

.entry-btn {
    font-size: 0.7rem !important;
    padding: 0 !important;
}

.noir-input, .noir-select {
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
    font-style: italic;
}
</style>
