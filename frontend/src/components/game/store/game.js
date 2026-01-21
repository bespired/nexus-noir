const mapAnimationTaxonomy = (anim) => {
    if (!anim || !anim.name) return anim;
    const name = anim.name.toLowerCase();
    let mixerName = null;

    if (name.includes('walk') || name.includes('loop') || name.includes('run')) mixerName = 'walk';
    else if (name.includes('idle') || name.includes('stand') || name.includes('breath')) mixerName = 'idle';
    else if (name.includes('talk') || name.includes('speak') || name.includes('chat')) mixerName = 'talk';
    else if (name.includes('caut') || name.includes('sneak') || name.includes('crouch')) mixerName = 'caution';

    return { ...anim, mixer_name: mixerName };
};

const fetchRobustData = async (endpoint) => {
    let apiPath = endpoint.replace('.json', '');

    try {
        const res = await fetch(`/api/${apiPath}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        if (apiPath === 'configs' && Array.isArray(data)) {
            return data.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
        }
        return data;
    } catch (e) {
        console.warn(`Fetch failed for ${endpoint}:`, e);
        return [];
    }
};

export default {
    namespaced: true,
    state() {
        return {
            actions: [],
            animations: [],
            characters: [],
            clues: [],
            configs: {},
            dialogs: [],
            media: [],
            scenes: [],
            sectors: [],
            currentScene: null,
            loading: false,
            error: null
        }
    },
    mutations: {
        SET_DATA(state, { key, data }) {
            state[key] = data;
        },
        SET_CURRENT_SCENE(state, scene) {
            state.currentScene = scene;
        },
        SET_LOADING(state, loading) {
            state.loading = loading;
        },
        SET_ERROR(state, error) {
            state.error = error;
        }
    },
    actions: {
        async fetchAllData({ commit }) {
            commit('SET_LOADING', true);
            try {
                const [
                    actions,
                    animations,
                    characters,
                    clues,
                    configs,
                    dialogs,
                    media,
                    scenes,
                    sectors
                ] = await Promise.all([
                    fetchRobustData('actions'),
                    fetchRobustData('animations'),
                    fetchRobustData('characters'),
                    fetchRobustData('clues'),
                    fetchRobustData('configs'),
                    fetchRobustData('dialogs'),
                    fetchRobustData('media'),
                    fetchRobustData('scenes'),
                    fetchRobustData('sectors')
                ]);

                // Apply taxonomy
                const mappedAnimations = animations.map(mapAnimationTaxonomy);
                const mappedCharacters = characters.map(char => ({
                    ...char,
                    animations: (char.animations || []).map(mapAnimationTaxonomy)
                }));

                commit('SET_DATA', { key: 'actions', data: actions });
                commit('SET_DATA', { key: 'animations', data: mappedAnimations });
                commit('SET_DATA', { key: 'characters', data: mappedCharacters });
                commit('SET_DATA', { key: 'clues', data: clues });
                commit('SET_DATA', { key: 'configs', data: configs });
                commit('SET_DATA', { key: 'dialogs', data: dialogs });
                commit('SET_DATA', { key: 'media', data: media });
                commit('SET_DATA', { key: 'scenes', data: scenes });
                commit('SET_DATA', { key: 'sectors', data: sectors });

            } catch (e) {
                console.error("Failed to fetch game data", e);
                commit('SET_ERROR', e.message);
            } finally {
                commit('SET_LOADING', false);
            }
        },
        async fetchScene({ commit }, sceneId) {
            if (!sceneId) return;
            commit('SET_LOADING', true);
            try {
                const sceneRes = await fetchRobustData(`scenes/${sceneId}`);
                commit('SET_CURRENT_SCENE', sceneRes);
                return sceneRes;
            } catch (e) {
                console.error("Error loading scene:", e);
                commit('SET_ERROR', e.message);
            } finally {
                commit('SET_LOADING', false);
            }
        }
    }
}
