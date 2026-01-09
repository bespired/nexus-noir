<script setup>
import { computed } from 'vue';

const props = defineProps({
    scene: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.scene.media && props.scene.media.length > 0) {
        // Adjust based on how filepad is stored (relative or absolute)
        // Assuming filepad is stored as 'storage/...' or relative to public/storage
        // If filepad starts with 'http', return as is.
        // Otherwise, prepend '/storage/' if not present, or handled by the backend 'url' accessor if available.
        // For now, assuming raw path from import: 'glb/filename.glb' or similar.
        // But media is usually images. GLBs are media too.
        // Let's check for an image type if possible, or just take the first one.
        const file = props.scene.media[0].filepad;
        if(file.startsWith('http')) return file;
        
        // If it's a glb, we might not have a thumb unless generated. 
        // For this task, we display whatever we have.
        // The proxy handles /storage -> localhost:8000/storage
        // Ensure path logic matches backend storage linking.
        return `/storage/${file}`; 
    }
    return null;
});
</script>

<template>
    <div class="scene-thumb">
        <div class="scene-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Scene Thumbnail" class="scene-thumb__image" />
             <div v-else class="scene-thumb__placeholder">
                { 2d image }
             </div>
        </div>

        <div class="scene-thumb__content">
            <h3 class="scene-thumb__title">{{ scene.title }}</h3>
            <span class="scene-thumb__type">{ {{ scene.type }} }</span>
            <p class="scene-thumb__description">{{ scene.description }}</p>
            
            <div class="scene-thumb__footer">
                <span class="scene-thumb__id">id: {{ scene.id }}</span>
                <Button label="EDIT >" size="small" severity="warning" outlined class="scene-thumb__edit-btn" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-thumb {
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

.scene-thumb__image-wrapper {
    background-color: #374151; /* Gray-700 placeholder */
    aspect-ratio: 16 / 9;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.scene-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.scene-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.scene-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.scene-thumb__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.scene-thumb__type {
    font-size: 0.875rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
}

.scene-thumb__description {
    font-size: 0.875rem;
    color: var(--color-noir-text);
    margin: 0;
    margin-bottom: auto; /* Push footer down */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.scene-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.scene-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

.scene-thumb__edit-btn {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
}
</style>
