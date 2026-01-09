<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import SceneThumb from '../components/thumbs/SceneThumb.vue';
import Select from 'primevue/select';

const scenes = ref([]);
const sectors = ref([]);
const loading = ref(true);

// Initialize from sessionStorage or null
const selectedSector = ref(Number(sessionStorage.getItem('scenes_filter_sector')) || null);
const selectedType = ref(sessionStorage.getItem('scenes_filter_type') || null);

// Watchers for persistence
watch(selectedSector, (newVal) => {
    if (newVal) sessionStorage.setItem('scenes_filter_sector', newVal);
    else sessionStorage.removeItem('scenes_filter_sector');
});

watch(selectedType, (newVal) => {
    if (newVal) sessionStorage.setItem('scenes_filter_type', newVal);
    else sessionStorage.removeItem('scenes_filter_type');
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

const uniqueTypes = computed(() => {
    const types = new Set(scenes.value.map(s => s.type).filter(Boolean));
    return [...types].sort();
});

const filteredScenes = computed(() => {
    return scenes.value.filter(scene => {
        const sectorMatch = !selectedSector.value || scene.sector_id === selectedSector.value;
        const typeMatch = !selectedType.value || scene.type === selectedType.value;
        return sectorMatch && typeMatch;
    });
});

onMounted(() => {
    fetchScenes();
});
</script>

<template>
    <div class="scenes-view">
        <div class="view-header">
            <h1 class="view-title">SCENES</h1>
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
            <Button label="+ new" severity="warning" class="new-btn" />
        </div>

        <div class="scenes-grid">
            <div v-if="loading" class="loading-state">Loading scenes...</div>
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
    color: var(--color-noir-text);
}

.scenes-grid {
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

</style>
