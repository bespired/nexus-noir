import { computed, defineAsyncComponent, markRaw } from 'vue';
import { useStore } from 'vuex';

// Vite Glob: This stays outside the function so it's only initialized once
const componentRegistry = import.meta.glob('../subsidairy/*.vue');

export function useSceneResolver() {
    const store = useStore();
    const currentScene = computed(() => store.state.game.currentScene);

    const resolvedComponent = computed(() => {
        const scene = currentScene.value;
        if (!scene) return null;

        let path = '';
        if (scene.type === 'vue-component') {
            path = `../subsidairy/${scene.data.component.name}.vue`;

        } else if (scene.type === 'walkable-area') {

            path = `../subsidairy/WalkArea.vue`;
        }

        const loader = componentRegistry[path];
        if (!loader) {
            console.error(`[SceneResolver] Path not found: ${path}`);
            return null;
        }

        // Return the clean, non-reactive async component
        return markRaw(defineAsyncComponent(loader));
    });

    return {
        resolvedComponent,
        currentSceneId: computed(() => currentScene.value?.id)
    };
}