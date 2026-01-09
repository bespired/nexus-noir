<script setup>
import { computed } from 'vue';

const props = defineProps({
    clue: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.clue.media && props.clue.media.length > 0) {
        const file = props.clue.media.find(m => m.type === '2d')?.filepad || props.clue.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.clue.media && props.clue.media.some(m => m.type === '3d');
});
</script>

<template>
    <div class="clue-thumb">
        <div class="clue-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Clue Image" class="clue-thumb__image" />
             <div v-else class="clue-thumb__placeholder">
                { clue image }
             </div>
        </div>

        <div class="clue-thumb__content">
            <h3 class="clue-thumb__title">{{ clue.title }}</h3>
            <span class="clue-thumb__type">{{ clue.type }}</span>
            <p class="clue-thumb__description">{{ clue.description }}</p>
            
            <div class="clue-thumb__footer">
                <span class="clue-thumb__id">id: {{ clue.id }}</span>
                <div class="clue-thumb__actions">
                    <Badge v-if="has3dModel" value="3D" severity="contrast" class="clue-thumb__badge-3d" />
                    <Button label="EDIT >" size="small" severity="warning" outlined class="clue-thumb__edit-btn" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.clue-thumb {
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

.clue-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 1 / 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.clue-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.clue-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.clue-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.clue-thumb__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.clue-thumb__type {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}

.clue-thumb__description {
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

.clue-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.clue-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.clue-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
}

.clue-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

.clue-thumb__edit-btn {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
}
</style>
