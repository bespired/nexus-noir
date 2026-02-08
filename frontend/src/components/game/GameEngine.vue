<script setup>
import { onMounted, onUnmounted,  computed } from 'vue';
import { useStore } from 'vuex';
import { useSceneResolver } from './composables/useSceneResolver';
import { useAudioManager } from './composables/useAudioManager';
import { useSFXManager } from './composables/useSFXManager';

import NeoTokyoPolice from './helpers/NeoTokyoPolice.vue';
import LoadStatus     from './helpers/LoadStatus.vue';
import DebugConsole   from './helpers/DebugConsole.vue';

const store = useStore();
const loading = computed(() => store.state.game.loading);
const { resolvedComponent, currentSceneId } = useSceneResolver();

// Initialize audio and SFX managers
const { audioUnlocked, unlockAudio } = useAudioManager();
const { playSoundByTag } = useSFXManager();

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

    <div v-if="!loading && !audioUnlocked" class="engine-error">
        <div class="status-box" @click="unlockAudio" data-sfx-click="sfx-button">
            <neo-tokyo-police type="audio" label="start" />
        </div>
    </div>

    <transition name="scene-fade" mode="out-in">
      <component
          v-if="resolvedComponent && !loading && audioUnlocked"
          :is="resolvedComponent"
          :key="currentSceneId"
          @next-scene="handleNextScene"
      />
    </transition>

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

  .game-start-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    background: rgba(0,0,0,0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(8px);
  }

  .start-content {
    background: #0a0a0a;
    border: 1px solid var(--color-noir-accent);
    text-align: center;
    min-width: 400px;
  }

  .start-btn {
    background: var(--color-noir-accent) !important;
    border: none !important;
    letter-spacing: 4px;
  }
}
</style>
