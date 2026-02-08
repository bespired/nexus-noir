<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SoundThumb from '@components/editor/thumbs/SoundThumb.vue';

const { t } = useI18n();

const sounds = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('sound_sort_by') || 'alphabetical');
const showCreateModal = ref(false);

const newSound = ref({ name: '', description: '' });

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

watch(sortBy, (newVal) => {
    sessionStorage.setItem('sound_sort_by', newVal);
});

const fetchSounds = async () => {
    try {
        const response = await fetch('/api/sounds');
        if (!response.ok) throw new Error('Failed to fetch sounds');
        sounds.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const createSound = async () => {
    try {
        const response = await fetch('/api/sounds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSound.value)
        });
        if (!response.ok) throw new Error('Failed to create sound');
        const data = await response.json();
        sounds.value.push(data);
        showCreateModal.value = false;
        newSound.value = { name: '', description: '' };
    } catch (error) {
        console.error(error);
    }
};

const filteredSounds = computed(() => {
    let result = [...sounds.value];

    return result.sort((a, b) => {
        if (sortBy.value === 'alphabetical') {
            return a.name.localeCompare(b.name);
        } else if (sortBy.value === 'date') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy.value === 'id') {
            return a.id - b.id;
        }
        return 0;
    });
});

onMounted(() => {
    fetchSounds();
});
</script>

<template>
    <div class="audio-view">
        <div class="view-header">
            <h1 class="view-title">SOUND ARCHIVE</h1>
            <Button label="NEW SOUND" severity="warning" class="new-btn" @click="showCreateModal = true" />
            <Select
                v-model="sortBy"
                :options="sortOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="SORT BY"
                class="noir-select sort-select"
            />
        </div>

        <Dialog v-model:visible="showCreateModal" modal header="CREATE NEW SOUND EFFECT" :style="{ width: '450px' }" class="noir-modal">
            <div class="form-column">
                <div class="field">
                    <label class="noir-label">SOUND NAME</label>
                    <InputText v-model="newSound.name" class="noir-input" placeholder="Enter sound name..." />
                </div>
                <div class="field">
                    <label class="noir-label">DESCRIPTION</label>
                    <Textarea v-model="newSound.description" rows="3" class="noir-input" placeholder="Enter description..." />
                </div>
                <div class="modal-actions">
                    <Button label="CANCEL" text plain @click="showCreateModal = false" class="cancel-btn" />
                    <Button label="CREATE SOUND" severity="success" @click="createSound" class="save-btn" />
                </div>
            </div>
        </Dialog>

        <div class="audio-grid">
            <div v-if="loading" class="loading-state">LOADING SOUNDS...</div>
            <SoundThumb
                v-else
                v-for="sound in filteredSounds"
                :key="sound.id"
                :sound="sound"
            />
        </div>
    </div>
</template>

<style scoped>
.audio-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.audio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.5rem;
}

.loading-state {
    color: var(--color-noir-muted);
    font-size: 1.2rem;
    text-align: center;
    grid-column: 1 / -1;
    padding: 2rem;
}

.sort-select {
    width: 155px !important;
    margin-left: 0.5rem;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}
</style>
