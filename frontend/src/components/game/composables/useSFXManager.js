import { onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';

/**
 * Composable to handle global SFX based on data attributes and manual triggers.
 */
export function useSFXManager() {
    const store = useStore();
    const sfxMap = new Map(); // Stores Audio objects for preloading

    const fetchSFX = async () => {
        try {
            console.log('[SFX] Fetching sound configuration...');
            const response = await fetch('/api/sounds');
            if (!response.ok) throw new Error('Failed to fetch sounds');
            const sounds = await response.json();

            sounds.forEach(sound => {
                if (sound.trigger && sound.media && sound.media.length > 0) {
                    const media = sound.media.find(m => m.type === 'sfx');
                    if (media) {
                        const url = `/storage/${media.filepad}`;
                        const audio = new Audio(url);
                        audio.load(); // Start preloading
                        sfxMap.set(sound.trigger.toLowerCase(), audio);
                        console.log(`[SFX] Mapped trigger "${sound.trigger.toLowerCase()}" to ${url}`);
                    }
                }
            });
            console.log('[SFX] Initialization complete. Available triggers:', Array.from(sfxMap.keys()));
        } catch (error) {
            console.error('[SFX] Error loading sounds:', error);
        }
    };

    const playSoundByTag = (tag) => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase();
        const audio = sfxMap.get(normalizedTag);

        if (audio) {
            console.log(`[SFX] Playing sound for tag: "${normalizedTag}"`);
            // Clone the audio to allow overlapping playback of the same sound
            const soundClone = audio.cloneNode();
            soundClone.volume = 1.0;
            soundClone.play().catch(e => {
                console.warn(`[SFX] Play failed for tag "${normalizedTag}":`, e);
            });
        } else {
            console.warn(`[SFX] No sound mapped for tag: "${normalizedTag}"`);
        }
    };

    const handleGlobalClick = (event) => {
        // Find closest element with data-sfx-click
        const target = event.target.closest('[data-sfx-click]');
        if (target) {
            const tag = target.getAttribute('data-sfx-click');
            console.log(`[SFX] Global click detected on element with tag: "${tag}"`);
            playSoundByTag(tag);
        }
    };

    onMounted(async () => {
        await fetchSFX();
        // Use capture phase to ensure we see the event even if others stop propagation
        window.addEventListener('click', handleGlobalClick, true);
        console.log('[SFX] Global click listener attached (capture phase).');
    });

    onUnmounted(() => {
        window.removeEventListener('click', handleGlobalClick, true);
    });

    return {
        playSoundByTag
    };
}
