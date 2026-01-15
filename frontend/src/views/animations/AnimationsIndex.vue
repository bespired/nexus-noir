<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AnimationThumb from '@components/editor/thumbs/AnimationThumb.vue';
import CreateAnimationModal from '@components/editor/modals/CreateAnimationModal.vue';

const { t } = useI18n();

const animations = ref([]);
const loading = ref(true);
const sortBy = ref(sessionStorage.getItem('animations_sort_by') || 'alphabetical');
const showCreateModal = ref(false);

const sortOptions = computed(() => [
    { label: t('common.sorting.alphabetical'), value: 'alphabetical' },
    { label: t('common.sorting.date'), value: 'date' },
    { label: t('common.sorting.id'), value: 'id' }
]);

watch(sortBy, (newVal) => {
    sessionStorage.setItem('animations_sort_by', newVal);
});

const fetchAnimations = async () => {
    try {
        const response = await fetch('/api/animations');
        if (!response.ok) throw new Error('Failed to fetch animations');
        animations.value = await response.json();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const onAnimationCreated = (newAnimation) => {
    animations.value.push(newAnimation);
};

const filteredAnimations = computed(() => {
    let result = [...animations.value];

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
    fetchAnimations();
});
</script>

<template>
    <div class="animations-view">
        <div class="view-header">
            <h1 class="view-title">{{ t('common.views.animations.title') }}</h1>
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

        <CreateAnimationModal 
            v-model:visible="showCreateModal"
            @created="onAnimationCreated"
        />

        <div class="animations-grid">
            <div v-if="loading" class="loading-state">{{ t('common.views.animations.loading') }}</div>
            <AnimationThumb
                v-else
                v-for="animation in filteredAnimations"
                :key="animation.id"
                :animation="animation"
            />
        </div>
    </div>
</template>

<style scoped>
.animations-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.animations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
