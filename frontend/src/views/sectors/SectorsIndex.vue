<script setup>
import { ref, onMounted } from 'vue';
import SectorThumb from '@components/thumbs/SectorThumb.vue';

const sectors = ref([]);
const loading = ref(true);

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

onMounted(() => {
    fetchSectors();
});
</script>

<template>
    <div class="sectors-view">
        <div class="view-header">
            <h1 class="view-title">SECTORS</h1>
            <Button label="+ new" severity="warning" class="new-btn" />
        </div>

        <div class="sectors-grid">
            <div v-if="loading" class="loading-state">Loading sectors...</div>
            <SectorThumb
                v-else
                v-for="sector in sectors"
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
    color: var(--color-noir-text);
}


.sectors-grid {
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
