<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import ActionThumb from '../components/thumbs/ActionThumb.vue';

const { t } = useI18n();

const actions = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('actions_sort_by') || 'alphabetical');

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

watch(sortBy, (newVal) => {
    sessionStorage.setItem('actions_sort_by', newVal);
});

const fetchActions = async () => {
    try {
        const response = await fetch('/api/actions');
        if (!response.ok) throw new Error('Failed to fetch actions');
        actions.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const filteredActions = computed(() => {
    let result = [...actions.value];

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
    fetchActions();
});
</script>

<template>
    <div class="actions-view">
        <div class="view-header">
            <h1 class="view-title">ACTIONS</h1>
            <Button label="+ new" severity="warning" class="new-btn" />
            <Select
                v-model="sortBy"
                :options="sortOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('common.sorting.title')"
                class="noir-select sort-select"
            />
        </div>

        <div class="actions-grid">
            <div v-if="loading" class="loading-state">Loading actions...</div>
            <ActionThumb
                v-else
                v-for="action in filteredActions"
                :key="action.id"
                :action="action"
            />
        </div>
    </div>
</template>

<style scoped>
.actions-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--color-noir-text);
}

.actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
</style>
