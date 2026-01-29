<script setup>
import { onMounted, onUnmounted, ref, computed,watch, shallowRef } from 'vue';
import { useStore } from 'vuex';
import { NexusEngine } from '../../engine/NexusEngine';

const store = useStore();
const canvasRef = ref(null);
const engine = shallowRef(null);

const init = async () => {
    if (!canvasRef.value) return;

    // 1. Initialize Engine
    engine.value = new NexusEngine(canvasRef.value, store);
    engine.value.start();

    // 2. Initial Data Load
    if (store.state.game.currentScene) {
        await handleSceneChange(store.state.game.currentScene);
    }
};

const handleSceneChange = async (scene) => {
    if (!engine.value || !scene) return;

    // Load the 3D world
    await engine.value.world.loadScene(scene);

    // Spawn the player if we have player data
    const playerData = store.state.game.player || JSON.parse(localStorage.getItem('player'));
    if (playerData) {
        // Find suitable spawn point from metadata or default to 0,0,0
        const spawnPoint = store.state.game.targetSpawnPoint || { x: 0, y: 0, z: 0 };
        await engine.value.characters.spawnPlayer(playerData, spawnPoint);
    }

    // Spawn NPCs from scene data
    // (To be implemented: engine.value.characters.spawnNPCs(scene.npcs))

    if (engine.value.debug) {
        engine.value.debug.refresh();
    }
};

// Listen for scene changes
watch(() => store.state.game.currentScene, (newScene) => {
    handleSceneChange(newScene);
});

// Watch for Debug Toggles
watch(() => store.state.game.debug, () => {
    if (engine.value) {
        engine.value.world.refreshMaterials();
        engine.value.debug.refresh();
    }
});

// Watch for Stage Bounds changes from Store
watch(() => store.state.game.stage, (newBounds) => {
    if (engine.value) {
        engine.value.resize(newBounds.width, newBounds.height);
    }
}, { deep: true, immediate: true });

const handleCanvasMouseMove = (event) => {
    if (engine.value) {
        engine.value.interactions.handleMouseMove(event);
    }
};

const handleCanvasClick = (event) => {
    if (engine.value) {
        engine.value.interactions.handleMouseClick(event);
    }
};

onMounted(() => init());

onUnmounted(() => {
    if (engine.value) {
        engine.value.cleanup();
    }
});

const cursor = computed(() => store.state.game.cursor);

</script>

<template>
    <canvas ref="canvasRef"
         class="three-layer"
        :class="cursor"
        @mousemove="handleCanvasMouseMove"
        @click="handleCanvasClick"
    />
</template>

