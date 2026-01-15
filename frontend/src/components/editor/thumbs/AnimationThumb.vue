<script setup>
import { computed } from 'vue';

const props = defineProps({
    animation: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.animation.media && props.animation.media.length > 0) {
        const file = props.animation.media.find(m => m.type === '2d')?.filepad || props.animation.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.animation.media && props.animation.media.some(m => m.type === '3d');
});
</script>

<template>
    <div class="animation-thumb" :class="animation.type">
        <div class="animation-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Animation Image" class="animation-thumb__image" />
             <div v-else class="animation-thumb__placeholder">
                { animation }
             </div>
        </div>

        <div class="animation-thumb__content">
            <h3 class="animation-thumb__name">{{ animation.name }}</h3>
            <span class="animation-thumb__type">{{ animation.type }}</span>
            <p class="animation-thumb__description">{{ animation.description }}</p>

            <div class="animation-thumb__footer">
                <span class="animation-thumb__id">id: {{ animation.id }}</span>
                <div class="animation-thumb__actions">
                    <Badge v-if="has3dModel"
                        value="3D"
                        severity="contrast"
                        class="global-thumb__badge-3d"
                    />
                    <Button
                        label="EDIT >"
                        severity="warning"
                        outlined
                        class="global-thumb__edit-btn"
                        @click="$router.push(`/animations/${animation.id}/edit`)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animation-thumb {
    background-color: var(--color-noir-panel);
    border: 1px solid var(--color-noir-panel);
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    flex-direction: row;
    gap: 1rem;
    color: var(--color-noir-text);
    height: 100%;
}

.animation-thumb > div {
    width: 50%;
}

.animation-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 1 / 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
    position: relative;
}

.animation-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.animation-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.animation-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.animation-thumb__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.animation-thumb__type {
    font-size: 0.875rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.animation-thumb__description {
    font-size: 0.875rem;
    color: var(--color-noir-text);
    margin: 0;
    margin-bottom: auto;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.animation-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.animation-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.animation-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
}

.animation-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}
</style>
