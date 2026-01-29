// useStageManager.js
import { ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';

export function useStageManager(containerRef) {
    const store = useStore();

    const updateBounds = () => {
        if (!containerRef.value) return;

        const { width, height } = containerRef.value.getBoundingClientRect();
        const assetRatio = 1218 / 832;

        let renderW, renderH;

        // Calculate the "Contain" box manually
        if (width / height > assetRatio) {
            renderH = height;
            renderW = height * assetRatio;
        } else {
            renderW = width;
            renderH = width / assetRatio;
        }

        store.commit('game/SET_STAGE_BOUNDS', {
            width: renderW,
            height: renderH
        });
    };

    const observer = new ResizeObserver(updateBounds);

    onMounted(() => observer.observe(containerRef.value));
    onUnmounted(() => observer.disconnect());
}