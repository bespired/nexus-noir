<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const gateways  = computed(() => store.state.game.currentScene?.['2d_gateways'] || []);
const showDebug = computed(() => store.state.game.debug);

const inventory = computed(() => store.state.game.inventory || []);

const stage = computed(() => store.state.game.stage);
const stagestyle = computed(() => `
    width:  ${stage.value.width}px;
    height: ${stage.value.height}px;
`);

const gateway = (gw) => {
    return `
        left: ${gw.x}%;
        top:  ${gw.y}%;
        width:  ${gw.width }%;
        height: ${gw.height}%;`
}

const active = (gw) => {
    // are there triggers that activate this gateway
    let active = false
    gw.triggers.forEach(t => {
        switch(t.condition){
            case 'always': active = true; break;
            case 'has':
                if (inventory.value.includes(t.clue_id)) active = true
                break;
            case 'has-not':
                if (!inventory.value.includes(t.clue_id)) active = true
                break;
        }
    })
    return active ? 'active' : ''
}

</script>

<template>
    <div class="area-layer" :class="{hidden:!showDebug}" :style="stagestyle">
        <div
            v-for="(gw, index) in gateways"
            class="gateway-rect"
            :class="`${gw.type} ${active(gw)}`"
            :key="index"
            :style="gateway(gw)"
            @click="activateGateway(index)"
        >
            <span class="gateway-label">
                {{ gw.label }} {{ gw.triggers.length }}
            </span>
            <div v-for="t in gw.triggers">
                {{ t.clue_id }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.area-layer.hidden {
    opacity: 0;
}

.gateway-rect {
    pointer-events: none;
    position: absolute;
    border: 2px dashed #00ffc7;
    background: rgba(0, 255, 199, 0.2);
}
.gateway-rect.trigger {
    border: 2px dashed #daff00;
    background: #daff0022;
}
.gateway-rect.active {
    pointer-events: auto;
}
.gateway-rect:not(.active) {
    opacity: 0.5;
}

.gateway-label {
    pointer-events: none;
    position: absolute;
    top: -20px;
    background: #00ffc7;
    color: #000;
    font-size: 10px;
    padding: 2px 4px;
    white-space: nowrap;
}

.gateway-rect.trigger .gateway-label {
    background: #daff00;
}

.gateway-rect.scene:hover {
    cursor: url('/cursors/direction.svg') 0 16, auto;
}
.gateway-rect.trigger:hover {
    cursor: url('/cursors/hover.svg') 0 0, auto;
}
</style>