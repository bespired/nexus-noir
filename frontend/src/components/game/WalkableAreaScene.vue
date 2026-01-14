<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
    scene: { type: Object, required: true }
});

const backdropUrl = computed(() => {
    if (props.scene && props.scene.media && props.scene.media.length > 0) {
        const backdrop = props.scene.media.find(m => m.type === '2d');
        if (backdrop) {
            const file = backdrop.filepad;
            if (file.startsWith('http')) return file;
            return `/storage/${file}`;
        }
    }
    return null;
});
</script>

<template>
    <div class="walkable-area-scene">
        <img v-if="backdropUrl" :src="backdropUrl" class="backdrop-img" />
        <div class="overlay-content">
            <h2>{{ scene.title }}</h2>
            <p>Walkable Area Placeholder</p>
        </div>
    </div>
</template>

<style scoped>
.walkable-area-scene {
    width: 100%;
    height: 100vh;
    background: #000;
    color: #eee;
    position: relative;
    overflow: hidden;
}

.backdrop-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.overlay-content {
    position: relative;
    z-index: 2;
    background: rgba(0, 0, 0, 0.5);
    padding: 2rem;
    border-radius: 8px;
    margin: 2rem;
    display: inline-block;
}
</style>
