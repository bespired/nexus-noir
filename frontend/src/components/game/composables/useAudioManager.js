import { watch, ref, onUnmounted } from 'vue';
import { useStore } from 'vuex';

/**
 * Composable to handle music cross-fading based on current scene.
 */
export function useAudioManager() {
    const store = useStore();

    // Maintain two audio objects for cross-fading
    const audioA = ref(new Audio());
    const audioB = ref(new Audio());

    // Track which one is currently playing
    const activeAudio = ref('A'); // 'A' or 'B'
    const currentUrl = ref(null);
    const audioUnlocked = ref(false);

    const FADE_DURATION = 1500; // ms
    const VOLUME_STEPS = 20;
    const INTERVAL = FADE_DURATION / VOLUME_STEPS;

    const getMusicUrl = (scene) => {
        if (!scene || !scene.music || !scene.music.media) return null;
        const media = scene.music.media.find(m => m.type === 'music');
        if (!media) return null;
        return `/storage/${media.filepad}`;
    };

    const fade = (audio, targetVolume, duration) => {
        return new Promise((resolve) => {
            const startVolume = audio.volume;
            const volumeDiff = targetVolume - startVolume;
            const stepValue = volumeDiff / VOLUME_STEPS;

            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                const newVolume = startVolume + (stepValue * currentStep);
                audio.volume = Math.max(0, Math.min(1, newVolume));

                if (currentStep >= VOLUME_STEPS) {
                    clearInterval(timer);
                    if (targetVolume === 0) {
                        audio.pause();
                    }
                    resolve();
                }
            }, INTERVAL);
        });
    };

    const crossFade = async (newUrl) => {
        if (newUrl === currentUrl.value) return;

        const debugLabel = newUrl ? `MUSIC: ${newUrl.split('/').pop()}` : 'MUSIC: SILENCE';
        store.commit('game/DEBUGGER_INFO', debugLabel);
        console.log(`[Audio] Cross-fading to: ${newUrl || 'Silence'}`);

        currentUrl.value = newUrl;

        const incoming = activeAudio.value === 'A' ? audioB.value : audioA.value;
        const outcoming = activeAudio.value === 'A' ? audioA.value : audioB.value;

        // Reset incoming
        if (newUrl) {
            incoming.src = newUrl;
            incoming.loop = true;
            incoming.volume = 0;

            if (audioUnlocked.value) {
                incoming.play().catch(e => {
                    console.warn('[Audio] Play failed:', e);
                    store.commit('game/DEBUGGER_INFO', `AUDIO ERROR: ${e.message}`);
                });
            } else {
                store.commit('game/DEBUGGER_INFO', 'AUDIO: WAITING FOR INTERACTION');
            }
        }

        // Swap active reference
        activeAudio.value = activeAudio.value === 'A' ? 'B' : 'A';

        // Perform fade
        await Promise.all([
            fade(outcoming, 0, FADE_DURATION),
            newUrl ? fade(incoming, 1, FADE_DURATION) : Promise.resolve()
        ]);
    };

    // Watch for scene changes
    watch(() => store.state.game.currentScene, (newScene) => {
        const url = getMusicUrl(newScene);
        crossFade(url);
    }, { immediate: true });

    // Unlock audio on first interaction
    const unlockAudio = () => {
        if (audioUnlocked.value) return;

        console.log('[Audio] Unlocking audio on user interaction');
        audioUnlocked.value = true;

        // Try to play current
        const currentAudio = activeAudio.value === 'A' ? audioA.value : audioB.value;
        if (currentAudio.src && currentAudio.paused) {
            currentAudio.play()
                .then(() => fade(currentAudio, 1, FADE_DURATION))
                .catch(e => console.warn('[Audio] Initial play failed:', e));
        }

        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    onUnmounted(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        audioA.value.pause();
        audioB.value.pause();
        audioA.value.src = "";
        audioB.value.src = "";
    });

    return {
        currentUrl,
        audioUnlocked,
        unlockAudio
    };
}
