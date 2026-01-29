<script setup>
import { onMounted, onUnmounted,  computed } from 'vue';
import { useStore } from 'vuex';
import { useSceneResolver } from './composables/useSceneResolver';

import LoadStatus   from './helpers/LoadStatus.vue';
import DebugConsole from './helpers/DebugConsole.vue';

const store = useStore();
const loading = computed(() => store.state.game.loading);
const { resolvedComponent, currentSceneId } = useSceneResolver();

const props = defineProps({
    emanator: { type: Boolean, default: false },
});

const handleNextScene = (payload) => {
    if (payload && payload.targetSceneId) {
        store.commit('game/DEBUGGER_INFO', `GOTO SCENE ${ payload.targetSceneId }`);
        store.dispatch('game/loadScene', { sceneId: payload.targetSceneId });
    }
};

onMounted(async () => {
    await store.dispatch('game/fetchAllData');
    await store.dispatch('game/loadOpeningScene');
});

onUnmounted(() => {
    store.dispatch('game/resetAllData');
});

</script>

<template>
  <div id="nexus-noir-game" :class="{ 'is-emanator': emanator }">
    <load-status />

    <!-- <transition name="scene-fade" mode="out-in"> -->
    <component
        v-if="resolvedComponent && !loading"
        :is="resolvedComponent"
        :key="currentSceneId"
        @next-scene="handleNextScene"
    />
    <!-- </transition> -->

    <debug-console v-if="emanator" />
  </div>
</template>

<style>

#nexus-noir-game {
  font-family: wallace, helvetica;
  background: #000;
  color: #fff;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
  cursor: url('/cursors/pointer.svg') 0 0, auto;

  &.is-emanator {
    height: calc(100vh - 84px);
  }

  .scene-presenter {
      height: 100%;
      width: 100%;
  }
}
</style>
