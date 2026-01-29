<script setup>
import { ref, onMounted, shallowRef, defineAsyncComponent, markRaw, computed } from 'vue';
import { useStore } from 'vuex';
import WalkableAreaScene from './subsidairy/WalkableAreaScene.vue';

const props = defineProps({
    emanator: { type: Boolean, default: false },
});

const store = useStore();
const currentScene = computed(() => store.state.game.currentScene);
const loading = computed(() => store.state.game.loading);
const error = computed(() => store.state.game.error);

const currentSceneComponent = shallowRef(null);
const debugInfo = ref(['DEBUG CONSOLE'])
const debugView = ref('console'); // 'console' or 'inventory'

const debugMode = computed({
    get: () => store.state.game.debug,
    set: (val) => store.commit('game/SET_DEBUG', val)
});

const inventoryClues = computed(() => {
    const allClues = store.state.game.clues;
    const invIds = store.state.game.inventory;
    return allClues.filter(c => invIds.includes(c.id));
});

const toggleDebug = () => {
    debugMode.value = !debugMode.value;
    debuggerInfo(`DEBUG MODE: ${debugMode.value ? 'ON' : 'OFF'}`);
};

const loadScene = async (sceneId, targetSpawnPoint = null, lastTriggeredGatewayId = null) => {
    if (!sceneId) return;

    try {
        debuggerInfo('LOAD ID ' + sceneId)
        const sceneData = await store.dispatch('game/fetchScene', { sceneId, targetSpawnPoint, lastTriggeredGatewayId });
        if (!sceneData) return;

        // Merge transient state (we keep this local as it's engine-specific)
        // Actually, we should probably just pass targetSpawnPoint as a prop

        if (sceneData.type === 'vue-component' && sceneData.data?.component?.name) {
            const compPath = sceneData.data.component.name;
            const cleanName = compPath.replace('game/', '').replace('.vue', '');

            debuggerInfo('LOAD SCENE ' + cleanName)

            try {
                currentSceneComponent.value = defineAsyncComponent(() =>
                    import(`./subsidairy/${cleanName}.vue`)
                );
            } catch (e) {
                console.error(`Failed to load component: ${compPath}`, e);
            }
        } else if (sceneData.type === 'walkable-area') {
            debuggerInfo('LOAD SCENE WalkableAreaScene')
            currentSceneComponent.value = markRaw(WalkableAreaScene);
        } else {
            currentSceneComponent.value = null;
        }
    } catch (err) {
        console.error("Error loading scene in engine:", err);
    }
};

const debuggerInfo = (line) => {
  debugInfo.value.push(line)
  debugInfo.value = debugInfo.value.slice(-10)
}

const handleGiveClue = (clueId) => {
    const clue = store.state.game.clues.find(c => String(c.id) === String(clueId));
    const name = clue ? clue.title : clueId;
    
    debuggerInfo(`[INVENTORY] Added Clue: ${name}`);
    store.commit('game/ADD_TO_INVENTORY', clueId);
};

const handleNextScene = (payload) => {
    console.log("Scene complete, payload:", payload);
    if (payload && payload.targetSceneId) {
        debuggerInfo('GOTO SCENE ' + payload.targetSceneId)
        loadScene(payload.targetSceneId, payload.targetSpawnPoint, payload.lastTriggeredGatewayId);
    }
};

onMounted(async () => {
    // 1. Fetch all global game data
    await store.dispatch('game/fetchAllData');

    // 2. Fetch opening scene ID from config
    try {
        const openingSceneId = store.state.game.configs.opening_scene;
        if (openingSceneId) {
            await loadScene(openingSceneId);
        }
    } catch (err) {
        console.error("Failed to load opening scene config", err);
    }
});
</script>

<template>
  <div id="nexus-noir-game" :class="{ 'is-emanator': emanator }">
    <div v-if="loading && !currentScene" class="engine-status">
        <div class="status-box">
            <i class="pi pi-spin pi-spinner mr-2"></i>
            INITIALIZING ENGINE...
        </div>
    </div>

    <div v-else-if="error" class="engine-error">
        <div class="error-box">
            <h2>SYSTEM ERROR</h2>
            <p>{{ error }}</p>
        </div>
    </div>

    <div v-else-if="currentSceneComponent" class="scene-presenter">
        <component
            :is="currentSceneComponent"
            :key="currentScene.id"
            v-bind="currentScene.data"
            @next-scene="handleNextScene"
            @debug="debuggerInfo"
            @give-clue="handleGiveClue"
        />
    </div>

    <div v-else class="engine-status">
        <div class="status-box">
            NO SCENE LOADED
        </div>
    </div>
  </div>

  <div class="debug-console" v-if="emanator">
      <div class="debug-header mb-2">
          <div class="debug-tabs">
              <button 
                  @click="debugView = 'console'" 
                  :class="{'active': debugView === 'console'}"
              >CONSOLE</button>
              <button 
                  @click="debugView = 'inventory'" 
                  :class="{'active': debugView === 'inventory'}"
              >INVENTORY ({{ inventoryClues.length }})</button>
          </div>
          <button @click="toggleDebug" :class="{'active': debugMode}" class="toggle-btn">
              <i class="pi pi-eye"></i> {{ debugMode ? 'HIDE HELPERS' : 'SHOW HELPERS' }}
          </button>
      </div>

      <div v-if="debugView === 'console'" class="console-output">
          <div v-for="(line, idx) in debugInfo" :key="idx" class="console-line">{{ line }}</div>
      </div>
      
      <div v-else class="inventory-output">
          <div v-if="inventoryClues.length === 0" class="empty-inv">NO CLUES COLLECTED</div>
          <div v-for="clue in inventoryClues" :key="clue.id" class="clue-item">
              <div class="clue-title">{{ clue.title }}</div>
              <div class="clue-desc">{{ clue.description }}</div>
          </div>
      </div>
  </div>
</template>

<style >

  .debug-console {
    position: absolute;
    top: 0; right: 0;
    border: 1px solid rgba(0, 255, 0, 0.3);
    padding: 12px;
    color: #00ff00;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: auto;
    z-index: 9999;
    min-width: 300px;
    max-width: 400px;
    font-family: 'Courier New', Courier, monospace;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  }

  .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      padding-bottom: 8px;
  }

  .debug-tabs {
      display: flex;
      gap: 4px;
  }

  .debug-tabs button, .toggle-btn {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid lime;
      color: lime;
      padding: 4px 8px;
      font-size: 9px;
      cursor: pointer;
      text-transform: uppercase;
  }

  .debug-tabs button.active {
      background: lime;
      color: black;
  }

  .console-output {
      max-height: 200px;
      overflow-y: auto;
  }

  .console-line {
      padding: 2px 0;
      border-bottom: 1px solid rgba(0, 255, 0, 0.05);
  }

  .inventory-output {
      max-height: 300px;
      overflow-y: auto;
      padding-top: 8px;
  }

  .clue-item {
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
  }

  .clue-title {
      font-weight: bold;
      color: #fff;
      text-transform: uppercase;
      margin-bottom: 2px;
  }

  .clue-desc {
      color: #aaa;
      font-style: italic;
      line-height: 1.2;
  }

  .empty-inv {
      text-align: center;
      padding: 20px;
      color: rgba(0, 255, 0, 0.5);
  }

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

  .engine-status, .engine-error {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, monospace);
      letter-spacing: 2px;
  }

  .status-box {
      padding: 2rem;
      border: 1px solid var(--color-noir-accent, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-noir-accent, #3b82f6);
  }

  .error-box {
      padding: 2rem;
      border: 1px solid var(--color-noir-danger, #ef4444);
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-noir-danger, #ef4444);
      max-width: 80%;
  }

  .mr-2 { margin-right: 0.5rem; }

  .scene-presenter {
      height: 100%;
      width: 100%;
  }
}
</style>
