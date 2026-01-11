<script setup>
import { computed } from 'vue';

const props = defineProps({
    sector: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.sector.media && props.sector.media.length > 0) {
        const file = props.sector.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

// Helper to format conditions nicely if needed, or just show count
const conditionCount = computed(() => {
    if (!props.sector.visible_clue_conditions) return 0;
    // It is cast to array in model, so should be array or object
    return Array.isArray(props.sector.visible_clue_conditions)
        ? props.sector.visible_clue_conditions.length
        : Object.keys(props.sector.visible_clue_conditions || {}).length;
});
</script>

<template>
    <div class="sector-thumb">
        <div class="sector-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Sector Thumbnail" class="sector-thumb__image" />
             <div v-else class="sector-thumb__placeholder">
                { sector image }
             </div>
        </div>

        <div class="sector-thumb__content">
            <h3 class="sector-thumb__title">{{ sector.name }}</h3>
            <span class="sector-thumb__meta">Condities: {{ conditionCount }}</span>
            <p class="sector-thumb__description">{{ sector.description }}</p>

            <div class="sector-thumb__footer">
                <span class="sector-thumb__id">id: {{ sector.id }}</span>
                <Button label="EDIT >"
                    severity="warning"
                    outlined
                    class="global-thumb__edit-btn"
                    @click="$router.push(`/sectors/${sector.id}`)"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.sector-thumb {
    background-color: var(--color-noir-panel);
    border: 1px solid var(--color-noir-panel);
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--color-noir-text);
    height: 100%;
}

.sector-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 16 / 9;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.sector-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sector-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.sector-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.sector-thumb__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.sector-thumb__meta {
    font-size: 0.875rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
}

.sector-thumb__description {
    font-size: 0.875rem;
    color: var(--color-noir-text);
    margin: 0;
    margin-bottom: auto;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sector-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.sector-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

</style>
