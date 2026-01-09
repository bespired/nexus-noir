<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import Button from 'primevue/button';
import ClueThumb from '@components/thumbs/ClueThumb.vue';

const { t } = useI18n();
const clues = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('clues_sort_by') || 'alphabetical');

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
            <Button :label="t('common.actions.new')" severity="warning" class="new-btn" />
            <Select
                v-model="sortBy"
                :options="sortOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('common.sorting.title')"
                class="noir-select sort-select"
            />
        </div>

        <div class="clues-grid">
            <div v-if="loading" class="loading-state">{{ t('common.views.clues.loading') }}</div>
            <ClueThumb
                v-else
                v-for="clue in filteredClues"
                :key="clue.id"
                :clue="clue"
            />
        </div>
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
