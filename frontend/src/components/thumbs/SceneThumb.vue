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
        const file = props.scene.media.find(m => m.type === '2d')?.filepad || props.scene.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    // Check if any media has type '3d'
    // Also check scene.type for 'walkable-area' which often implies 3D,
    // but the user specifically asked for "when a 3d model exists".
    return props.scene.media && props.scene.media.some(m => m.type === '3d');
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
            <div class="scene-thumb__tags">
                <Badge :value="scene.type" severity="secondary" class="scene-thumb__tag-badge scene-thumb__tag-badge--type" />
                <Badge v-if="scene.sector" :value="scene.sector.name" severity="info" class="scene-thumb__tag-badge scene-thumb__tag-badge--sector" />
            </div>
            <p class="scene-thumb__description">{{ scene.description }}</p>

            <div class="scene-thumb__footer">
                <span class="scene-thumb__id">id: {{ scene.id }}</span>
                <div class="scene-thumb__actions">
                    <Badge v-if="has3dModel" value="3D" severity="contrast" class="scene-thumb__badge-3d" />
                    <Button label="EDIT >" size="small" severity="warning" outlined class="scene-thumb__edit-btn" />
                </div>
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

.scene-thumb__tags {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.scene-thumb__tag-badge {
    font-size: 0.7rem !important;
    font-weight: normal;
}

.scene-thumb__tag-badge--sector {
    background-color: rgba(59, 130, 246, 0.1) !important;
    /*border: 1px solid var(--color-noir-accent) !important;*/
    color: var(--color-noir-accent) !important;
}

.scene-thumb__tag-badge--type {
    background-color: var(--color-noir-dark) !important;
    border: 1px solid var(--color-noir-dark) !important;
    color: var(--color-noir-muted) !important;
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

.scene-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.scene-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
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
