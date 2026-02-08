<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import ConfirmationModal from '@components/editor/modals/ConfirmationModal.vue';
import MediaUpload from '@components/editor/MediaUpload.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const soundId = route.params.id;
const sound = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const showUpload = ref(false);

const triggerOptions = ref([
    'sfx-click',
    'sfx-select',
    'sfx-button',
    'sfx-open',
    'sfx-close',
    'sfx-enter',
    'sfx-leave',
    'sfx-over',
    'sfx-walk',
    'sfx-spinner',
    'sfx-door'
]);

const fetchSound = async () => {
    try {
        const response = await fetch(`/api/sounds/${soundId}`);
        if (!response.ok) throw new Error('Failed to fetch sound');
        sound.value = await response.json();
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load sound', life: 3000 });
        router.push('/sounds');
    }
};

const handleSave = async () => {
    if (!sound.value.name) {
        toast.add({ severity: 'warn', summary: 'Validation', detail: 'Name is required', life: 3000 });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch(`/api/sounds/${soundId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(sound.value)
        });
        if (!response.ok) throw new Error('Failed to update sound');
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Sound updated successfully', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save sound', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const confirmDelete = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/sounds/${soundId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete sound');
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Sound deleted successfully', life: 3000 });
        router.push('/sounds');
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete sound', life: 3000 });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const currentMedia = computed(() => {
    if (!sound.value || !sound.value.media) return null;
    return sound.value.media.find(m => m.type === 'sfx');
});

const audioUrl = computed(() => {
    if (!currentMedia.value) return null;
    const file = currentMedia.value.filepad;
    if (file.startsWith('http')) return file;
    return `/storage/${file}`;
});

const handleMediaUploaded = (newMedia) => {
    console.log('SoundEdit: handleMediaUploaded received', newMedia);
    if (!sound.value.media) sound.value.media = [];
    sound.value.media = [...sound.value.media.filter(m => m.type !== 'sfx'), newMedia];
    showUpload.value = false;
};

const deleteMedia = async (mediaItem) => {
    try {
        const response = await fetch(`/api/media/${mediaItem.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete media');
        sound.value.media = sound.value.media.filter(m => m.id !== mediaItem.id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Media removed', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete media', life: 3000 });
    }
};

onMounted(async () => {
    await fetchSound();
    loading.value = false;
});
</script>

<template>
    <div class="audio-edit-view">
        <EditViewHeader
            v-if="sound"
            backRoute="/sounds"
            parentName="SOUNDS"
            :itemName="sound.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="showDeleteConfirm = true"
        />

        <div v-if="loading" class="loading-state">LOADING SOUND...</div>

        <div v-else-if="sound" class="edit-layout">
            <div class="edit-hero">
                <h1 class="edit-hero__title">{{ sound.name }}</h1>
                <span class="edit-hero__id">ID:{{ sound.id }}</span>
            </div>

            <div class="edit-grid">
                <div class="media-column">
                    <div v-if="showUpload" class="upload-wrapper card shadow-lg">
                        <MediaUpload
                            :modelId="sound.id"
                            modelType="App\Models\Sound"
                            accept=".wav,.mp3"
                            label="UPLOAD SOUND (.WAV, .MP3)"
                            @uploaded="handleMediaUploaded"
                            @close="showUpload = false"
                        />
                    </div>
                    <div v-else class="preview-section card shadow-lg">
                        <div class="header-overlay">
                            <span class="header-title">AUDIO PREVIEW</span>
                            <div class="header-actions">
                                <Button v-if="currentMedia" icon="pi pi-trash" severity="danger" text @click="deleteMedia(currentMedia)" />
                                <Button v-else label="UPLOAD FILE" text @click="showUpload = true" />
                            </div>
                        </div>
                        
                        <div v-if="audioUrl" class="audio-player-container">
                            <i class="pi pi-bolt audio-big-icon"></i>
                            <audio controls :src="audioUrl" class="noir-audio-player"></audio>
                            <div class="file-info">{{ currentMedia.title }}</div>
                        </div>
                        <div v-else class="no-media-state">
                            <i class="pi pi-volume-down no-audio-icon"></i>
                            <span class="no-audio-text">NO AUDIO FILE ATTACHED</span>
                            <Button label="UPLOAD .WAV / .MP3 NOW" severity="warning" outlined @click="showUpload = true" />
                        </div>
                    </div>
                </div>

                <div class="form-column">
                    <div class="field">
                        <label class="noir-label">SOUND NAME</label>
                        <InputText v-model="sound.name" class="noir-input" />
                    </div>
                    <div class="field">
                        <label class="noir-label">DESCRIPTION</label>
                        <Textarea v-model="sound.description" rows="5" class="noir-input" />
                    </div>
                    <div class="field">
                        <label class="noir-label">SFX TRIGGER (EVENT BINDING)</label>
                        <Select 
                            v-model="sound.trigger" 
                            :options="triggerOptions" 
                            class="noir-select" 
                            placeholder="SELECT TRIGGER EVENT"
                            showClear
                        />
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="confirmDelete"
            message="Are you sure you want to delete this sound effect? This cannot be undone."
        />
    </div>
</template>

<style scoped>
.audio-edit-view {
    padding: 0 1rem 0 0;
    height: 100%;
}

.edit-hero {
    background-color: var(--color-noir-dark);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    border-left: 4px solid var(--color-noir-warning);
}

.edit-hero__title {
    margin: 0;
    font-size: 2.5rem;
    text-transform: uppercase;
}

.edit-hero__id {
    color: var(--color-noir-muted);
    font-size: 0.9rem;
}

.edit-grid {
    display: grid;
    grid-template-columns: 500px 1fr;
    gap: 3rem;
}

.preview-section {
    background-color: #0b0f19;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.header-overlay {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: rgba(255,255,255,0.05);
}

.header-title {
    font-size: 0.8rem;
    color: var(--color-noir-muted);
    letter-spacing: 1px;
}

.audio-player-container {
    padding: 3rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.audio-big-icon {
    font-size: 4rem;
    color: var(--color-noir-warning);
    opacity: 0.5;
}

.noir-audio-player {
    width: 100%;
    filter: invert(1) hue-rotate(180deg);
}

.file-info {
    font-size: 0.8rem;
    color: var(--color-noir-muted);
    font-family: monospace;
}

.no-media-state {
    padding: 5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    color: var(--color-noir-muted);
}

.no-audio-icon {
    font-size: 3rem;
    opacity: 0.3;
}

.loading-state {
    color: var(--color-noir-muted);
    font-size: 1.5rem;
    padding: 2rem;
    text-align: center;
}
</style>
