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

const musicId = route.params.id;
const music = ref(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const showUpload = ref(false);

const fetchMusic = async () => {
    try {
        const response = await fetch(`/api/musics/${musicId}`);
        if (!response.ok) throw new Error('Failed to fetch music');
        music.value = await response.json();
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load music', life: 3000 });
        router.push('/music');
    }
};

const handleSave = async () => {
    if (!music.value.name) {
        toast.add({ severity: 'warn', summary: 'Validation', detail: 'Name is required', life: 3000 });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch(`/api/musics/${musicId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(music.value)
        });
        if (!response.ok) throw new Error('Failed to update music');
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Music updated successfully', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save music', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const confirmDelete = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/musics/${musicId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete music');
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Music deleted successfully', life: 3000 });
        router.push('/music');
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete music', life: 3000 });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const currentMedia = computed(() => {
    if (!music.value || !music.value.media) return null;
    return music.value.media.find(m => m.type === 'music');
});

const audioUrl = computed(() => {
    if (!currentMedia.value) return null;
    const file = currentMedia.value.filepad;
    if (file.startsWith('http')) return file;
    return `/storage/${file}`;
});

const handleMediaUploaded = (newMedia) => {
    console.log('MusicEdit: handleMediaUploaded received', newMedia);
    if (!music.value.media) music.value.media = [];
    music.value.media = [...music.value.media.filter(m => m.type !== 'music'), newMedia];
    showUpload.value = false;
};

const deleteMedia = async (mediaItem) => {
    try {
        const response = await fetch(`/api/media/${mediaItem.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete media');
        music.value.media = music.value.media.filter(m => m.id !== mediaItem.id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Media removed', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete media', life: 3000 });
    }
};

onMounted(async () => {
    await fetchMusic();
    loading.value = false;
});
</script>

<template>
    <div class="audio-edit-view">
        <EditViewHeader
            v-if="music"
            backRoute="/music"
            parentName="MUSIC"
            :itemName="music.name"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="showDeleteConfirm = true"
        />

        <div v-if="loading" class="loading-state">LOADING TRACK...</div>

        <div v-else-if="music" class="edit-layout">
            <div class="edit-hero">
                <h1 class="edit-hero__title">{{ music.name }}</h1>
                <span class="edit-hero__id">ID:{{ music.id }}</span>
            </div>

            <div class="edit-grid">
                <div class="media-column">
                    <div v-if="showUpload" class="upload-wrapper card shadow-lg">
                        <MediaUpload
                            :modelId="music.id"
                            modelType="App\Models\Music"
                            accept=".ogg,.mp3"
                            label="UPLOAD MUSIC (.OGG, .MP3)"
                            @uploaded="handleMediaUploaded"
                            @close="showUpload = false"
                        />
                    </div>
                    <div v-else class="preview-section card shadow-lg">
                        <div class="header-overlay">
                            <span class="header-title">AUDIO PREVIEW</span>
                            <div class="header-actions">
                                <Button v-if="currentMedia" icon="pi pi-trash" severity="danger" text @click="deleteMedia(currentMedia)" />
                                <Button v-else label="UPLOAD TRACK" text @click="showUpload = true" />
                            </div>
                        </div>
                        
                        <div v-if="audioUrl" class="audio-player-container">
                            <i class="pi pi-volume-up audio-big-icon"></i>
                            <audio controls :src="audioUrl" class="noir-audio-player"></audio>
                            <div class="file-info">{{ currentMedia.title }}</div>
                        </div>
                        <div v-else class="no-media-state">
                            <i class="pi pi-music no-audio-icon"></i>
                            <span class="no-audio-text">NO AUDIO FILE ATTACHED</span>
                            <Button label="UPLOAD .OGG / .MP3 NOW" severity="warning" outlined @click="showUpload = true" />
                        </div>
                    </div>
                </div>

                <div class="form-column">
                    <div class="field">
                        <label class="noir-label">TRACK NAME</label>
                        <InputText v-model="music.name" class="noir-input" />
                    </div>
                    <div class="field">
                        <label class="noir-label">DESCRIPTION</label>
                        <Textarea v-model="music.description" rows="5" class="noir-input" />
                    </div>
                    <div class="field">
                        <label class="noir-label">BPM (BEATS PER MINUTE)</label>
                        <InputNumber v-model="music.data.bpm" class="noir-input" />
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="confirmDelete"
            message="Are you sure you want to delete this music track? This cannot be undone."
        />
    </div>
</template>

<style scoped>
.audio-edit-view {
    padding: 0 1rem 0 0;
    height: 100%;
}

.edit-hero {
    background-color: #0b0f19;
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    border-left: 4px solid var(--color-noir-accent);
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
    color: var(--color-noir-accent);
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
