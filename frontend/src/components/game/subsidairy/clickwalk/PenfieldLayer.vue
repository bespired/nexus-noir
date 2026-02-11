<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const server = "http://localhost:3500/storage"
const stage  = computed(() => store.state.game.stage);
const penfieldActive = computed(() => store.state.game.penfieldActive);

const backdrop = computed(() => ({
    width:  `${stage.value.width}px`,
    height: `${stage.value.height}px`,
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.2)'
}));

const waves = computed(() => `
    background-image: url("${server}/artwork/general/penfield-waves.png")
`);

const frame = computed(() => `
    background-image: url("${server}/artwork/general/penfield-frame.png")
`);



const closePenfield = () => {
    store.dispatch('game/togglePenfield', false);
};

</script>

<template>
    <div v-if="penfieldActive" class="penfield-layer" :style="backdrop" @click.stop>
        <div class="penfield-waves" :style="waves">
            <div class="penfield-screen" >
                <div class="penfield-header">
                    <nexus-font type="blocky" label="penfield organ" />
                </div>
                <br />
                <click-slider />
            </div>
        </div>
        <div class="penfield-frame" :style="frame">
            <div class="penfield-button" @click="closePenfield" data-sfx-click="sfx-button" />
        </div>

        <!-- Preload hover assets -->
        <img :src="`${server}/artwork/gui/penfield/off.png`" style="display:none" aria-hidden="true" />
    </div>
</template>

<style>
     .penfield-layer {
         display: flex;
         align-items: center;
         justify-content: center;
     }

     .penfield-header {
         display: flex;
         justify-content: center;
         align-items: center;
         padding: 10px;
     }

     .penfield-waves {
        margin-left: -1%;
        margin-top:  -1%;
        width: 71%;
        height: 61%;
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        position: relative;
        pointer-events: auto;
     }
    .penfield-screen {
        height: 100%;
        width: 100%;
    }
    .penfield-frame {
        position: absolute;
        left:0; right: 0; top: 0; bottom: 0;
        pointer-events: none;
        background-position: center;
        background-size: contain;
        background-repeat: no-repeat;
    }
    .penfield-button {
        position: absolute;
        top: 79.57%; /* 662px / 832px */
        left: 50%;
        transform: translateX(-50%);
        width: 13.79%; /* 168px / 1218px */
        height: 11.3%; /* 94px / 832px */
        pointer-events: auto;
        cursor: pointer;
        background-image: url("http://localhost:3500/storage/artwork/gui/penfield/on.png");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .penfield-button:hover {
        background-image: url("http://localhost:3500/storage/artwork/gui/penfield/off.png");
    }
</style>