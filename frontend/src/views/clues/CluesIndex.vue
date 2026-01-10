<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ClueThumb from '@components/thumbs/ClueThumb.vue';
import CreateClueModal from '@components/modals/CreateClueModal.vue';
import MediaUpload from '@components/customs/MediaUpload.vue';

const { t } = useI18n();
const clues = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('clues_sort_by') || 'alphabetical');
const showCreateModal = ref(false);
const showUploadDialog = ref(false);
const selectedClueForUpload = ref(null);

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

const fetchClues = async () => {
    try {
        const response = await fetch('/api/clues');
        if (!response.ok) throw new Error('Failed to fetch clues');
        clues.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const onClueCreated = (newClue) => {
    clues.value.push(newClue);
    // Sort logic handled by computed filteredClues
};

const handleRequestUpload = (clue) => {
    selectedClueForUpload.value = clue;
    showUploadDialog.value = true;
};

const onMediaUploaded = (newMedia) => {
    const clue = clues.value.find(c => c.id === selectedClueForUpload.value.id);
    if (clue) {
        if (!clue.media) clue.media = [];
        clue.media.unshift(newMedia);
    }
    showUploadDialog.value = false;
    selectedClueForUpload.value = null;
};

const filteredClues = computed(() => {
    let result = [...clues.value];

    return result.sort((a, b) => {
        if (sortBy.value === 'alphabetical') {
            return a.title.localeCompare(b.title);
        } else if (sortBy.value === 'date') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy.value === 'id') {
            return a.id - b.id;
        }
        return 0;
    });
});

watch(sortBy, (newVal) => {
    sessionStorage.setItem('clues_sort_by', newVal);
});

onMounted(() => {
    fetchClues();
});
</script>

<template>
    <div class="clues-view">
        <div class="view-header">
            <h1 class="view-title">{{ t('common.views.clues.title') }}</h1>
            <Button :label="t('common.actions.new')" severity="warning" class="new-btn" @click="showCreateModal = true" />
            <Select
                v-model="sortBy"
                :options="sortOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('common.sorting.title')"
                class="noir-select sort-select"
            />
        </div>

        <CreateClueModal 
            v-model:visible="showCreateModal"
            @created="onClueCreated"
        />

        <div class="clues-grid">
            <div v-if="loading" class="loading-state">{{ t('common.views.clues.loading') }}</div>
            <ClueThumb
                v-else
                v-for="clue in filteredClues"
                :key="clue.id"
                :clue="clue"
                @request-upload="handleRequestUpload"
            />
        </div>

        <Dialog v-model:visible="showUploadDialog" modal header="Upload Thumbnail" :style="{ width: '50vw' }" class="noir-dialog">
            <MediaUpload 
                v-if="selectedClueForUpload"
                :modelId="selectedClueForUpload.id" 
                modelType="App\Models\Clue"
                accept="image/*"
                label="UPLOAD THUMBNAIL"
                @uploaded="onMediaUploaded"
                @close="showUploadDialog = false"
            />
        </Dialog>
    </div>
</template>

<style scoped>
.clues-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.clues-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
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
</style>
