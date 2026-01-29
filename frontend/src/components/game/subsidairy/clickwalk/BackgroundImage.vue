<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const server   = "http://localhost:3500/storage"
const backdrop = computed(() => store.state.game.currentScene.backdrop_url);
const stage    = computed(() => store.state.game.stage);

const style = computed(() => `
    width:  ${stage.value.width}px;
    height: ${stage.value.height}px;
    background-image: url("${server}/${backdrop.value}")
`);

</script>

<template>
    <div class="background-image" :style="style" />
</template>

<style>
    .background-image {
        background-position: center;
        background-size: contain;
        background-repeat: no-repeat;
        width: 100%;
        height: 100%;
    }
</style>