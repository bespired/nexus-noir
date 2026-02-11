<script setup>
import { useStore } from 'vuex';
import { ref, computed } from 'vue';

const store = useStore();

const debugMode = computed({
    get: () => store.state.game.debug,
    set: (val) => store.commit('game/SET_DEBUG', val)
});

const toggleDebug = () => {
    debugMode.value = !debugMode.value
    const val = `DEBUG MODE: ${debugMode.value ? 'ON' : 'OFF'}`
    store.commit('game/DEBUGGER_INFO', val)
};

const debugInfo = computed(() => store.state.game.debugInfo)
const debugView = ref('console'); // 'console' or 'inventory'

const inventoryClues = computed(() => {
    const allClues = store.state.game.clues;
    const invIds = store.state.game.inventory;
    return allClues.filter(c => invIds.includes(c.id));
});

const consoleMode = computed(() => debugView.value === 'console')
const inventoryMode = computed(() => debugView.value === 'inventory')
const isFolded = ref(false);
</script>
<template>
    <div class="debug-console" :class="{ folded: isFolded }">
        <div class="debug-header mb-2">
            <button @click="isFolded = !isFolded" class="fold-btn">
                <i :class="isFolded ? 'pi pi-chevron-down' : 'pi pi-chevron-up'" />
            </button>

            <div class="debug-tabs">
                <template v-if="!isFolded">
                    <button @click="debugView = 'console'" :class="{active: consoleMode }">
                        CONSOLE
                    </button>
                    <button @click="debugView = 'inventory'" :class="{active: inventoryMode}">
                        INVENTORY ({{ inventoryClues.length }})
                    </button>
                    <button @click="store.dispatch('game/togglePenfield')" :class="{active: store.state.game.penfieldActive}" class="toggle-btn">
                        {{ store.state.game.penfieldActive ? 'OFF' : 'PENFIELD' }} <i class="pi pi-cog" />
                    </button>
                    <button @click="toggleDebug" :class="{active: debugMode}" class="toggle-btn">
                        {{ debugMode ? 'HIDE HELPERS' : 'SHOW HELPERS' }} <i class="pi pi-eye" />
                    </button>
                </template>
                <div v-else class="folded-label">DEBUG CONSOLE</div>
            </div>

        </div>

        <div v-if="!isFolded" class="debug-content">
            <div v-if="debugView === 'console'" class="console-output">
                <div v-for="(line, idx) in debugInfo" :key="idx" class="console-line">
                    {{ line }}
                </div>
            </div>
            <div v-else class="inventory-output">
                <div v-if="inventoryClues.length === 0" class="empty-inv">
                    NO CLUES COLLECTED
                </div>
                <div v-for="clue in inventoryClues" :key="clue.id" class="clue-item">
                    <div class="clue-title">{{ clue.title }}</div>
                    <div class="clue-desc">{{ clue.description }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
:root {
    --neon-mint: #25fbc3;
    --neon-mint4: #25fbc344;
    --neon-mint1: #25fbc311;
}

.debug-console {
    position: absolute;
    top: 0;
    right: 0;
    border: 1px solid var(--neon-mint4);
    padding: 12px;
    color: #00ff00;
    font-size: 10px;
    background: #3e4846a3;
    pointer-events: auto;
    z-index: 9999;
    min-width: 300px;
    max-width: 500px;
    font-weight: 300;
    letter-spacing: -0.5px;
    transition: min-width 0.3s ease;
}

.debug-console.folded {
    min-width: 150px;
}

.debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--neon-mint4);
    padding-bottom: 8px;
}

.folded .debug-header {
    border-bottom: none;
    padding-bottom: 0;
}

.debug-tabs {
    display: flex;
    gap: 4px;
    align-items: center;
}

.folded-label {
    color: var(--neon-mint);
    padding: 4px 8px;
    font-weight: bold;
}

.fold-btn {
    background: transparent;
    border: 1px solid var(--neon-mint4);
    color: var(--neon-mint);
    cursor: pointer;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    .pi { font-size: 10px }
}

.fold-btn:hover {
    background: var(--neon-mint1);
}

.debug-tabs button,
.toggle-btn {
    background: var(--neon-mint1);
    border: 1px solid var(--neon-mint);
    color: var(--neon-mint);
    padding: 4px 8px;
    font-size: 9px;
    cursor: pointer;
    text-transform: uppercase;
    min-width: 80px;
    display: flex;
    align-items: center;
    margin-left: 8px;

    .pi {
        margin-left: 3px;
        margin-right: -3px;
        font-size: 11px;
    }

}

.debug-tabs button.active {
    background: var(--neon-mint);
    color: black;
}

/*.debug-tabs */

.console-output {
    max-height: 200px;
    overflow-y: auto;

}

.console-line {
    padding: 2px 0;
    border-bottom: 1px solid var(--neon-mint1);
    color: var(--neon-mint);

}

.inventory-output {
    max-height: 300px;
    overflow-y: auto;
    padding-top: 8px;
}

.clue-item {
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--neon-mint4);

}

.clue-title {
    font-weight: bold;
    color: #fff;
    text-transform: uppercase;
    margin-bottom: 2px;
    color: var(--neon-mint);
}

.clue-desc {
    color: #aaa;
    font-style: italic;
    line-height: 1.2;
    color: var(--neon-mint);
    opacity: 0.7;
}

.empty-inv {
    text-align: center;
    padding: 20px;
    color: var(--neon-mint4);
}
</style>