<script setup>
import { computed } from 'vue';

const props = defineProps({
    vehicle: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.vehicle.media && props.vehicle.media.length > 0) {
        const file = props.vehicle.media.find(m => m.type === '2d')?.filepad || props.vehicle.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.vehicle.media && props.vehicle.media.some(m => m.type === '3d');
});
</script>

<template>
    <div class="vehicle-thumb">
        <div class="vehicle-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Vehicle Image" class="vehicle-thumb__image" />
             <div v-else class="vehicle-thumb__placeholder">
                { vehicle image }
             </div>
        </div>

        <div class="vehicle-thumb__content">
            <h3 class="vehicle-thumb__name">{{ vehicle.name }}</h3>
            <span class="vehicle-thumb__role">{{ vehicle.role }}</span>
            <p class="vehicle-thumb__description">{{ vehicle.description }}</p>

            <div class="vehicle-thumb__footer">
                <span class="vehicle-thumb__id">id: {{ vehicle.id }}</span>
                <div class="vehicle-thumb__actions">
                    <Badge v-if="has3dModel"
                        value="3D"
                        severity="contrast"
                        class="global-thumb__badge-3d"
                    />
                    <Button label="EDIT >"
                        severity="warning"
                        outlined
                        class="global-thumb__edit-btn"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.vehicle-thumb {
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

.vehicle-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 16 / 9;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
}

.vehicle-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.vehicle-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.vehicle-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.vehicle-thumb__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.vehicle-thumb__role {
    font-size: 0.875rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.vehicle-thumb__description {
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

.vehicle-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.vehicle-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.vehicle-thumb__badge-3d {
    font-size: 0.65rem !important;
    font-weight: bold;
}

.vehicle-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

</style>
