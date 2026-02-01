<script setup>
import { ref } from 'vue';
import { useStageManager } from '../composables/useStageManager';
import BackgroundImage from './clickwalk/BackgroundImage.vue';
import ThreejsScene    from './clickwalk/ThreejsScene.vue';
import GatewayLayer    from './clickwalk/GatewayLayer.vue';
import DialogLayer     from './clickwalk/DialogLayer.vue';

// 1. Create the reference to the outer container
const areaRef = ref(null);

// 2. Initialize the manager.
// It will now watch 'areaRef' and update the store automatically.
useStageManager(areaRef);
</script>

<template>
    <div class="walk-area" ref="areaRef">
        <div class="stage-container" :style="stageStyle">
            <background-image />
            <threejs-scene    />
            <gateway-layer    />
            <dialog-layer     />
        </div>
    </div>
</template>

<script>
// Logic to pull the calculated size back out for the CSS
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
    setup() {
        const store = useStore();
        const stageStyle = computed(() => ({
            width:  `${store.state.game.stage.width}px`,
            height: `${store.state.game.stage.height}px`,
            position: 'relative'
        }));
        return { stageStyle };
    }
}
</script>

<style>
#nexus-noir-game {
    .walk-area {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #000; /* True Noir black for letterboxing */
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    /* All internal layers fill the calculated stage-container exactly */
    .stage-container > * {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .three-layer {
      pointer-events: auto; /* Allow clicks for NexusEngine interaction */
      z-index: 5;
    }

    .area-layer {
        pointer-events: none; /* Let clicks pass through to 3D by default */
    }

    .area-layer.hidden {
        opacity: 0;
    }

    .gateway-rect {
        position: absolute;
        border: 2px dashed #00ffc7;
        background: rgba(0, 255, 199, 0.2);
        pointer-events: none; /* Not active by default */
    }
    .gateway-rect.trigger {
        border: 2px dashed #daff00;
        background: #daff0022;
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

    .three-layer.pointer {
        cursor: url('/cursors/pointer.svg') 0 0, auto;
    }
    .three-layer.hover {
        cursor: url('/cursors/hover.svg') 0 0, auto;
    }
    .three-layer.direction {
        cursor: url('/cursors/direction.svg') 0 16, auto;
    }
    .three-layer.walk {
        cursor: url('/cursors/walk.svg') 0 0, auto;
    }
}
</style>