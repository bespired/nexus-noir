<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import CharacterThumb from '@components/thumbs/CharacterThumb.vue';

const { t } = useI18n();

const characters = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('characters_sort_by') || 'alphabetical');

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

watch(sortBy, (newVal) => {
    sessionStorage.setItem('characters_sort_by', newVal);
});

const fetchCharacters = async () => {
    try {
        const response = await fetch('/api/characters');
        if (!response.ok) throw new Error('Failed to fetch characters');
        const allCharacters = await response.json();

        // Filter only "person" type
        characters.value = allCharacters.filter(c => c.type === 'person');
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const filteredCharacters = computed(() => {
    let result = [...characters.value];

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
    fetchCharacters();
});
</script>

<template>
    <div class="characters-view">
        <div class="view-header">
            <h1 class="view-title">CHARACTERS</h1>
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

        <div class="characters-grid">
            <div v-if="loading" class="loading-state">Loading characters...</div>
            <CharacterThumb
                v-else
                v-for="character in filteredCharacters"
                :key="character.id"
                :character="character"
            />
        </div>
    </div>
</template>

<style scoped>
.characters-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--color-noir-text);
}

.characters-grid {
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
