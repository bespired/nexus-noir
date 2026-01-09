<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import DialogThumb from '../components/thumbs/DialogThumb.vue';

const { t } = useI18n();

const dialogs = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('dialogs_sort_by') || 'alphabetical');

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

watch(sortBy, (newVal) => {
    sessionStorage.setItem('dialogs_sort_by', newVal);
});

const fetchDialogs = async () => {
    try {
        const response = await fetch('/api/dialogs');
        if (!response.ok) throw new Error('Failed to fetch dialogs');
        dialogs.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const filteredDialogs = computed(() => {
    let result = [...dialogs.value];

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

onMounted(() => {
    fetchDialogs();
});
</script>

<template>
    <div class="dialogs-view">
        <div class="view-header">
            <h1 class="view-title">DIALOGS</h1>
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

        <div class="dialogs-grid">
            <div v-if="loading" class="loading-state">Loading dialogs...</div>
            <DialogThumb
                v-else
                v-for="dialog in filteredDialogs"
                :key="dialog.id"
                :dialog="dialog"
            />
        </div>
    </div>
</template>

<style scoped>
.dialogs-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--color-noir-text);
}

.dialogs-grid {
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
