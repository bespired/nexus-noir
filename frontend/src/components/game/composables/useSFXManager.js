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

    const activeSounds = new Map(); // Stores currently playing Audio instances by tag

    const playSoundByTag = (tag, options = {}) => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase();
        const audio = sfxMap.get(normalizedTag);

        if (audio) {
            console.log(`[SFX] Playing sound for tag: "${normalizedTag}"`);

            // If already playing and we don't want multiple, stop previous
            if (options.unique && activeSounds.has(normalizedTag)) {
                stopSoundByTag(normalizedTag);
            }

            const soundClone = audio.cloneNode();
            soundClone.volume = options.volume !== undefined ? options.volume : 1.0;
            soundClone.loop = !!options.loop;

            soundClone.play().catch(e => {
                console.warn(`[SFX] Play failed for tag "${normalizedTag}":`, e);
            });

            // Store for stopping later
            if (!activeSounds.has(normalizedTag)) {
                activeSounds.set(normalizedTag, []);
            }
            activeSounds.get(normalizedTag).push(soundClone);

            // Cleanup when ended (if not looping)
            if (!options.loop) {
                soundClone.onended = () => {
                    const instances = activeSounds.get(normalizedTag);
                    if (instances) {
                        const idx = instances.indexOf(soundClone);
                        if (idx > -1) instances.splice(idx, 1);
                        if (instances.length === 0) activeSounds.delete(normalizedTag);
                    }
                };
            }

            return soundClone;
        } else {
            console.warn(`[SFX] No sound mapped for tag: "${normalizedTag}"`);
        }
    };

    const stopSoundByTag = (tag) => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase();
        const instances = activeSounds.get(normalizedTag);

        if (instances && instances.length > 0) {
            console.log(`[SFX] Stopping sound for tag: "${normalizedTag}" (${instances.length} instances)`);
            instances.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            activeSounds.delete(normalizedTag);
        }
    };

    const stopAllSounds = () => {
        console.log(`[SFX] Stopping all sounds...`);
        activeSounds.forEach((instances) => {
            instances.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        });
        activeSounds.clear();
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
        playSoundByTag,
        stopSoundByTag,
        stopAllSounds
    };
}
