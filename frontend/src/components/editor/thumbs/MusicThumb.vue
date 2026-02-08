<script setup>
import { computed } from 'vue';

const props = defineProps({
    music: {
        type: Object,
        required: true
    }
});

</script>

<template>
    <div class="audio-thumb music">
        <div class="audio-thumb__icon-wrapper">
             <i class="pi pi-volume-up audio-thumb__icon"></i>
             <div class="audio-thumb__type-label">MUSIC</div>
        </div>

        <div class="audio-thumb__content">
            <h3 class="audio-thumb__name">{{ music.name }}</h3>
            <p class="audio-thumb__description">{{ music.description || 'No description' }}</p>

            <div class="audio-thumb__footer">
                <span class="audio-thumb__id">id: {{ music.id }}</span>
                <div class="audio-thumb__actions">
                    <Button
                        label="EDIT >"
                        severity="warning"
                        outlined
                        class="global-thumb__edit-btn"
                        @click="$router.push(`/music/${music.id}/edit`)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.audio-thumb {
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

.audio-thumb__icon-wrapper {
    background-color: #0b0f19;
    aspect-ratio: 1 / 1;
    width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 4px;
    position: relative;
    border: 1px solid rgba(255,255,255,0.05);
}

.audio-thumb__icon {
    font-size: 2rem;
    color: var(--color-noir-accent);
}

.audio-thumb__type-label {
    font-size: 0.6rem;
    color: var(--color-noir-muted);
    margin-top: 0.5rem;
    letter-spacing: 1px;
}

.audio-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.audio-thumb__name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: normal;
}

.audio-thumb__description {
    font-size: 0.8rem;
    color: var(--color-noir-muted);
    margin: 0.25rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
}

.audio-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.audio-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}
</style>
