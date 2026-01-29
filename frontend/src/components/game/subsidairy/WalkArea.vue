<script setup>
import { ref } from 'vue';
import { useStageManager } from '../composables/useStageManager'; // adjust path
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

<style scoped>
.walk-area {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #000; /* True Noir black for letterboxing */
    background-color: #02210; /* DeGemini fucking up my colors  */
/*    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;*/
}

/* All internal layers fill the calculated stage-container exactly */
#nexus-noir-game .stage-container > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

#nexus-noir-game .three-layer {
  pointer-events: none; /* Let clicks pass through for now */
  z-index: 5;
}
</style>