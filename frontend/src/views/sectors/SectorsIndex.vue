<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import Button from 'primevue/button';
import SectorThumb from '@components/thumbs/SectorThumb.vue';

const { t } = useI18n();
const sectors = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('sectors_sort_by') || 'alphabetical');
const showCreateModal = ref(false);

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

const fetchSectors = async () => {
    try {
        const response = await fetch('/api/sectors');
        if (!response.ok) throw new Error('Failed to fetch sectors');
        sectors.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const onSectorCreated = (newSector) => {
    sectors.value.push(newSector);
};

const filteredSectors = computed(() => {
    let result = [...sectors.value];

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

watch(sortBy, (newVal) => {
    sessionStorage.setItem('sectors_sort_by', newVal);
});

onMounted(() => {
    fetchSectors();
});
</script>

<template>
    <div class="sectors-view">
        <div class="view-header">
            <h1 class="view-title">{{ t('common.views.sectors.title') }}</h1>
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

        <CreateSectorModal 
            v-model:visible="showCreateModal"
            @created="onSectorCreated"
        />

        <div class="sectors-grid">
            <div v-if="loading" class="loading-state">{{ t('common.views.sectors.loading') }}</div>
            <SectorThumb
                v-else
                v-for="sector in filteredSectors"
                :key="sector.id"
                :sector="sector"
            />
        </div>
    </div>
</template>

<style scoped>
.sectors-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.sectors-grid {
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
