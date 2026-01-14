<script setup>
import { computed } from 'vue';

const props = defineProps({
    dialog: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.dialog.media && props.dialog.media.length > 0) {
        const file = props.dialog.media.find(m => m.type === '2d')?.filepad || props.dialog.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.dialog.media && props.dialog.media.some(m => m.type === '3d');
});
</script>

<template>
    <div class="dialog-thumb">
        <div class="dialog-thumb__content">
            <h3 class="dialog-thumb__title">{{ dialog.title }}</h3>

            <div class="dialog-thumb__footer">
                <span class="dialog-thumb__id">id: {{ dialog.id }}</span>
                <div class="dialog-thumb__actions">
                    <Badge v-if="has3dModel"
                        value="3D"
                        severity="contrast"
                        class="global-thumb__badge-3d"
                    />
                    <Button label="EDIT >"
                        severity="warning"
                        outlined
                        class="global-thumb__edit-btn"
                        @click="$router.push({ name: 'dialog-edit', params: { id: dialog.id } })"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dialog-thumb {
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

.dialog-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 16 / 9;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.dialog-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.dialog-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.dialog-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.dialog-thumb__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.dialog-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.dialog-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dialog-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
}

.dialog-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

</style>
