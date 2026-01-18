<script setup>
import { computed } from 'vue';

const props = defineProps({
    character: {
        type: Object,
        required: true
    }
});

const thumbUrl = computed(() => {
    if (props.character.media && props.character.media.length > 0) {
        const file = props.character.media.find(m => m.type === '2d')?.filepad || props.character.media[0].filepad;
        if(file.startsWith('http')) return file;
        return `/storage/${file}`;
    }
    return null;
});

const has3dModel = computed(() => {
    return props.character.media && props.character.media.some(m => m.type === '3d');
});

const hasBones = computed(() => {
    return props.character.media && props.character.media.some(m => m.type === '3d' && m.data && m.data.hasBones);
});

const isPlayable = computed(() => props.character.is_playable);
</script>

<template>
    <div class="character-thumb" :class="[{ 'is-playable': isPlayable}, character.type ]">
        <div class="character-thumb__image-wrapper">
             <img v-if="thumbUrl" :src="thumbUrl" alt="Character Image" class="character-thumb__image" />
             <div v-else class="character-thumb__placeholder">
                { portrait }
             </div>
             <div v-if="isPlayable" class="character-thumb__badge">PLAYABLE</div>
        </div>

        <div class="character-thumb__content">
            <h3 class="character-thumb__name">{{ character.name }}</h3>
            <span class="character-thumb__role">{{ character.role }}</span>
            <p class="character-thumb__description">{{ character.description }}</p>

            <div class="character-thumb__badges">
                <Badge v-if="hasBones"
                    value="bones"
                    severity="contrast"
                    class="character-thumb__badge-item"
                >
                    <img src="/icons/bone.svg" class="badge-icon" />
                </Badge>
                <Badge v-if="has3dModel"
                    value="3D"
                    severity="contrast"
                    class="character-thumb__badge-item"
                >
                    <img src="/icons/3d.svg" class="badge-icon" />GLB
                </Badge>
            </div>

            <div class="character-thumb__footer">
                <span class="character-thumb__id">id: {{ character.id }}</span>
                <div class="character-thumb__actions">
                    <Button
                        label="EDIT >"
                        severity="warning"
                        outlined
                        class="global-thumb__edit-btn"
                        @click="$router.push(`/characters/${character.id}/edit`)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

.badge-icon {
    filter: invert(1);
    min-width: 12px;
    margin:0 4px;
}
.character-thumb {
    background-color: var(--color-noir-panel);
    border: 1px solid var(--color-noir-panel);
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    flex-direction: row;
    gap: 1rem;
    color: var(--color-noir-text);
    height: 100%;
}

.character-thumb > div {
    width: 50%;
}

.character-thumb.is-playable {
    border-color: var(--color-noir-accent);
}

.character-thumb__image-wrapper {
    background-color: #374151;
    aspect-ratio: 3 / 4;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 2px;
    position: relative;
}

.character-thumb__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.character-thumb__placeholder {
    color: var(--color-noir-muted);
    font-family: monospace;
}

.character-thumb__badge {
    position: absolute;
    top: 0;
    right: 0;
    background: var(--color-noir-accent);
    color: #000;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: bold;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 20% 100%);
    padding-left: 1rem;
}

.character-thumb__content {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.character-thumb__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
}

.character-thumb__role {
    font-size: 0.875rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.character-thumb__description {
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

.character-thumb__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--color-noir-dark);
    padding-top: 0.5rem;
}

.character-thumb__badges {
    display: flex;
    justify-content: flex-end;
    /*gap: 0.5rem;*/
    margin-bottom: 0.5rem;
    margin-top: 1rem;
}

.character-thumb__badge-item {
    font-size: 0.65rem !important;
    font-weight: bold;
    background-color: #0b0f19 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
    border-radius: 4px !important;
    /*padding: 0.2rem 0.6rem !important;*/
}

.character-thumb__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.character-thumb__id {
    font-size: 0.75rem;
    color: var(--color-noir-muted);
}

</style>
