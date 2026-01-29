<script setup>
import { onMounted, onUnmounted, ref, computed, watch, shallowRef, nextTick } from 'vue';
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

    // Ensure DOM is ready and bounds are updated via StageManager
    await nextTick();

    // Collect all characters to preload their animations
    const charactersToPreload = [];
    const playerData = store.state.game.player || JSON.parse(localStorage.getItem('player'));
    if (playerData) charactersToPreload.push(playerData);

    if (scene.npcs && Array.isArray(scene.npcs)) {
        scene.npcs.forEach(npc => {
            if (npc.character_id) {
                const charData = store.state.game.characters.find(c => c.id === npc.character_id);
                if (charData) charactersToPreload.push(charData);
            }
        });
    }

    if (charactersToPreload.length > 0) {
        await engine.value.animations.preloadAnimations(charactersToPreload);
    }

    // Load the 3D world
    await engine.value.world.loadScene(scene);

    // Spawn the player if we have player data
    if (playerData) {
        // Find suitable spawn point from metadata or default to first player point
        const target = store.state.game.targetSpawnPoint;
        let spawnPoint = { x: 0, y: 0, z: 0, direction: 180 };

        if (target && target.name && scene['3d_spawnpoints']) {
            const found = scene['3d_spawnpoints'].find(sp => sp.name === target.name);
            if (found) {
                spawnPoint = { ...found };
                console.log(`[SPAWN] Resolved target spawnpoint: ${target.name}`, spawnPoint);
            } else {
                console.warn(`[SPAWN] targetSpawnPoint '${target.name}' not found in scene. Using fallback.`);
            }
        } else if (scene['3d_spawnpoints'] && scene['3d_spawnpoints'].length > 0) {
            // Default to first 'player' or 'entry' point
            const defaultPoint = scene['3d_spawnpoints'].find(sp => sp.type === 'player' || sp.type === 'entry') || scene['3d_spawnpoints'][0];
            spawnPoint = { ...defaultPoint };
            console.log(`[SPAWN] Using default spawnpoint: ${spawnPoint.name || 'unnamed'}`, spawnPoint);
        }

        await engine.value.characters.spawnPlayer(playerData, spawnPoint);
        
        // Clear target spawn point after use to avoid re-spawning there if reloading scene metadata
        store.commit('game/SET_TARGET_SPAWN_POINT', null);
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

const handleFocus = () => {
    if (engine.value) {
        // Use current stage bounds to recalibrate
        engine.value.resize(store.state.game.stage.width, store.state.game.stage.height);
    }
};

onMounted(() => {
    init();
    window.addEventListener('focus', handleFocus);
});

onUnmounted(() => {
    window.removeEventListener('focus', handleFocus);
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

