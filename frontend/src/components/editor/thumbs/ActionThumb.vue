<script setup>
import { computed } from 'vue';

const props = defineProps({
    action: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.action.media && props.action.media.length > 0) {
        const file = props.action.media.find(m => m.type === '2d')?.filepad || props.action.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.action.media && props.action.media.some(m => m.type === '3d');
});
</script>

<template>
    <div class="action-thumb">
        <div class="action-thumb__content">
            <h3 class="action-thumb__name">{{ action.name }}</h3>
            <p class="action-thumb__description">{{ action.description }}</p>

            <div class="action-thumb__footer">
                <span class="action-thumb__id">id: {{ action.id }}</span>
                <div class="action-thumb__actions">
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
                        @click="$router.push(`/actions/${action.id}/edit`)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.action-thumb {
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

.action-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 16 / 9;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.action-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.action-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.action-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.action-thumb__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.action-thumb__description {
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

.action-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.action-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.action-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
}

.action-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

</style>
