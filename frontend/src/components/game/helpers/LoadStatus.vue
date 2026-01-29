<script setup>

import NeoTokyoPolice from './NeoTokyoPolice.vue';

import { computed } from 'vue';
import { useStore } from 'vuex';

const store        = useStore();
const currentScene = computed(() => store.state.game.currentScene);
const loading      = computed(() => store.state.game.loading);
const error        = computed(() => store.state.game.error);
const progress     = computed(() => store.state.game.progress);

</script>
<template>
  <template v-if="!currentScene">
    <div class="engine-status" v-if="!loading">
        <div class="status-box">
            <neo-tokyo-police type="no-scene" />
        </div>
    </div>
    <div v-else-if="error" class="engine-error">
        <div class="status-box">
            <neo-tokyo-police type="error" :label="error" />
        </div>
    </div>
    <div v-else class="engine-status">
        <div class="status-box">
            <neo-tokyo-police type="loading" :loaded="progress" :key="progress"/>
        </div>
    </div>
  </template>
</template>
<style>
.empty-inv {
    text-align: center;
    padding: 20px;
    color: rgba(0, 255, 0, 0.5);
}


.engine-status,
.engine-error {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    letter-spacing: 2px;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
}


</style>