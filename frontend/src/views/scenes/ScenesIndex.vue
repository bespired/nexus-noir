<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SceneThumb from '@components/thumbs/SceneThumb.vue';

const { t } = useI18n();

const scenes = ref([]);
const sectors = ref([]);
const loading = ref(true);

// Initialize from sessionStorage or null
const selectedSector = ref(Number(sessionStorage.getItem('scenes_filter_sector')) || null);
const selectedType = ref(sessionStorage.getItem('scenes_filter_type') || null);
const sortBy = ref(sessionStorage.getItem('scenes_sort_by') || 'alphabetical');
const showCreateModal = ref(false);

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' },
    { label: t('common.sorting.sector'), value: 'sector' }
]);

// Watchers for persistence
watch(selectedSector, (newVal) => {
    if (newVal) sessionStorage.setItem('scenes_filter_sector', newVal);
    else sessionStorage.removeItem('scenes_filter_sector');
});

watch(selectedType, (newVal) => {
    if (newVal) sessionStorage.setItem('scenes_filter_type', newVal);
    else sessionStorage.removeItem('scenes_filter_type');
});

watch(sortBy, (newVal) => {
    sessionStorage.setItem('scenes_sort_by', newVal);
});

const fetchScenes = async () => {
    try {
        const [scenesRes, sectorsRes] = await Promise.all([
            fetch('/api/scenes'),
            fetch('/api/sectors')
        ]);

        if (!scenesRes.ok) throw new Error('Failed to fetch scenes');
        if (!sectorsRes.ok) throw new Error('Failed to fetch sectors');

        scenes.value = await scenesRes.json();
        sectors.value = await sectorsRes.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const onSceneCreated = (newScene) => {
    scenes.value.push(newScene);
};

const uniqueTypes = computed(() => {
    const types = new Set(scenes.value.map(s => s.type).filter(Boolean));
    return [...types].sort();
});

const filteredScenes = computed(() => {
    let result = scenes.value.filter(scene => {
        const sectorMatch = !selectedSector.value || scene.sector_id === selectedSector.value;
        const typeMatch = !selectedType.value || scene.type === selectedType.value;
        return sectorMatch && typeMatch;
    });

    // Apply sorting
    return result.sort((a, b) => {
        if (sortBy.value === 'alphabetical') {
            return a.title.localeCompare(b.title);
        } else if (sortBy.value === 'date') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy.value === 'id') {
            return a.id - b.id;
        } else if (sortBy.value === 'sector') {
            const sectorA = sectors.value.find(s => s.id === a.sector_id)?.name || '';
            const sectorB = sectors.value.find(s => s.id === b.sector_id)?.name || '';
            const sectorCompare = sectorA.localeCompare(sectorB);
            if (sectorCompare !== 0) return sectorCompare;
            return a.title.localeCompare(b.title);
        }
        return 0;
    });
});

onMounted(() => {
    fetchScenes();
});
</script>

<template>
    <div class="scenes-view">
        <div class="view-header">
            <h1 class="view-title">{{ t('common.views.scenes.title') }}</h1>
            <div class="filters">
                <Select
                    v-model="selectedSector"
                    :options="sectors"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="All Sectors"
                    showClear
                    class="noir-select"
                />
                <Select
                    v-model="selectedType"
                    :options="uniqueTypes"
                    placeholder="All Types"
                    showClear
                    class="noir-select"
                />
            </div>
            <div class="header-actions">
                <Button label="MAP" severity="info" class="map-btn" icon="pi pi-map" @click="$router.push('/scenes/map')" />
                <Button :label="t('common.actions.new')" severity="warning" class="new-btn" @click="showCreateModal = true" />
            </div>
            <Select
                v-model="sortBy"
                :options="sortOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('common.sorting.title')"
                class="noir-select sort-select"
            />
        </div>

        <CreateSceneModal 
            v-model:visible="showCreateModal"
            @created="onSceneCreated"
        />

        <div class="scenes-grid">
            <div v-if="loading" class="loading-state">{{ t('common.views.scenes.loading') }}</div>
            <SceneThumb
                v-else
                v-for="scene in filteredScenes"
                :key="scene.id"
                :scene="scene"
            />
        </div>
    </div>
</template>

<style scoped>
.scenes-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.scenes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

.header-actions {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
}

.new-btn {
    margin-left: 0 !important;
}

.sort-select {
    width: 155px !important;
}
</style>
