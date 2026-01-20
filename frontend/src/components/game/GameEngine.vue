<script setup>
import { ref, onMounted, shallowRef, defineAsyncComponent, markRaw } from 'vue';
import WalkableAreaScene from './WalkableAreaScene.vue';

const props = defineProps({
    emanator: { type: Boolean, default: false },
});

const currentScene = ref(null);
const currentSceneComponent = shallowRef(null);
const loading = ref(true);
const error = ref(null);

const debugInfo = ref(['DEBUG CONSOLE'])
const debugMode = ref(false); // Toggle for visual debugging

const toggleDebug = () => {
    debugMode.value = !debugMode.value;
    debuggerInfo(`DEBUG MODE: ${debugMode.value ? 'ON' : 'OFF'}`);
};

const loadScene = async (sceneId, targetSpawnPoint = null) => {
    if (!sceneId) return;
    loading.value = true;
    error.value = null;

    try {
        debuggerInfo('LOAD ID ' + sceneId)
        const response = await fetch(`/api/scenes/${sceneId}`);
        if (!response.ok) throw new Error(`Scene ${sceneId} not found`);

        const sceneData = await response.json();
        // Merge transient state
        currentScene.value = { ...sceneData, targetSpawnPoint };

        if (sceneData.type === 'vue-component' && sceneData.data?.component?.name) {
            const compPath = sceneData.data.component.name;
            // Name example: "game/DemoTitleScene.vue"
            // Since we are in src/components/game, we strip "game/" and ".vue"
            const cleanName = compPath.replace('game/', '').replace('.vue', '');

            debuggerInfo('LOAD SCENE ' + cleanName)

            try {
                // Vite dynamic import hint: needs a relatively static path
                currentSceneComponent.value = defineAsyncComponent(() =>
                    import(`./${cleanName}.vue`)
                );
            } catch (e) {
                console.error(`Failed to load component: ${compPath}`, e);
                error.value = `Component not found: ${compPath}`;
            }
        } else if (sceneData.type === 'walkable-area') {

            debuggerInfo('LOAD SCENE WalkableAreaScene')

            currentSceneComponent.value = markRaw(WalkableAreaScene);

        } else {
            // Fallback or other types
            currentSceneComponent.value = null;
        }
    } catch (err) {
        console.error("Error loading scene:", err);
        error.value = err.message;
    } finally {
        loading.value = false;
    }
};

const debuggerInfo = (line) => {
  debugInfo.value.push(line)
  debugInfo.value = debugInfo.value.slice(-5)
}

const handleNextScene = (payload) => {
    console.log("Scene complete, payload:", payload);
    if (payload && payload.targetSceneId) {
        debuggerInfo('GOTO SCENE ' + payload.targetSceneId)
        loadScene(payload.targetSceneId, payload.targetSpawnPoint);
    }
};

onMounted(async () => {
    // Fetch opening scene ID from config
    try {
        const configRes = await fetch('/api/configs/opening_scene');
        if (configRes.ok) {
            const config = await configRes.json();
            if (config && config.value) {
                await loadScene(config.value);
            }
        }
    } catch (err) {
        console.error("Failed to load opening scene config", err);
        error.value = "Failed to load engine configuration";
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
            v-bind="currentScene.data?.data || currentScene" 
            :id="currentScene.id"
            :sector_id="currentScene.sector_id"
            :media="currentScene.media"
            :scene="currentScene"
            :is_engine="true" 
            :debug="debugMode"
            :targetSpawnPoint="currentScene.targetSpawnPoint" 
            :nextSceneId="currentScene.data?.nextSceneId"
            @next-scene="handleNextScene"
        />
    </div>

    <div v-else class="engine-status">
        <div class="status-box">
            NO SCENE LOADED
        </div>
    </div>
  </div>

  <div class="debug-console" v-if="emanator">
      <div class="debug-controls mb-2">
          <button @click="toggleDebug" :class="{'active': debugMode}">
              <i class="pi pi-eye"></i> TOGGLE DEBUG
          </button>
      </div>
      <div v-for="line in debugInfo">{{ line }} </div>
  </div>
</template>

<style >

  .debug-console {
    position: absolute;
    top: 0; right: 0;
    border:1px solid green;
    padding: 12px;
    color: green;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 9999;
  }
  
  .debug-controls {
      pointer-events: auto;
      margin-bottom: 8px;
  }
  
  .debug-controls button {
      background: rgba(0, 255, 0, 0.2);
      border: 1px solid lime;
      color: lime;
      padding: 4px 8px;
      font-size: 10px;
      cursor: pointer;
      font-family: monospace;
  }
  
  .debug-controls button.active {
      background: lime;
      color: black;
  }

#nexus-noir-game {
  font-family: wallace, helvetica;
  background: #000;
  color: #fff;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;

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
