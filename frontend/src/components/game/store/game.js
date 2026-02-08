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

const fuzzyTrue = (value) => {
    if (!value) return false
    return value === true || value === 'true' || value === 1 || value === '1'
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

import WalkArea from '../subsidairy/WalkArea.vue';
import { defineAsyncComponent, markRaw } from 'vue';

export default {
    namespaced: true,
    state() {
        return {
            actions: [],
            animations: [],
            characters: [],
            clues: [],
            inventory: [], // Array of clue IDs
            configs: {},
            dialogs: [],
            media: [],
            scenes: [],
            sectors: [],


            cursor: null,
            player: null,
            currentScene: null,
            currentSector: null,
            sectorChange: false,
            targetSpawnPoint: null,
            lastTriggeredGatewayId: null,
            lastTriggeredActionId: null,

            debugInfo: [],
            debug: false,
            progress: 0,
            loading: false,
            error: null,

            stage: {
                width: 0,
                height: 0,
                scale: 1, // Useful for high-DPI or zoom
                aspectRatio: 1218 / 832
            }
        }
    },
    mutations: {
        SET_DATA(state, { key, data }) {
            if (key === 'clues') {
                const initialClues = data
                    .filter(clue => fuzzyTrue(clue?.initial))
                    .map(clue => clue.id);
                state.inventory = initialClues;
            }
            state[key] = data;
        },
        SET_PLAYER(state, player) {
            // console.log(player)
            localStorage.setItem('player', JSON.stringify(player));
            state.player = player;
        },

        SET_CURRENT_SCENE(state, scene) {
            if (!scene) return

            if (scene.sector_id && scene.sector_id !== state.currentSectorId) {
                state.sectorChange = true;
                state.currentSectorId = scene.sector_id;
            }
            state.currentScene = scene;
        },

        SET_STAGE_BOUNDS(state, { width, height }) {
            state.stage.width = parseInt(width);
            state.stage.height = parseInt(height);
        },

        SET_PROGRESS(state, value) {
            state.progress = value;
        },
        SET_LOADING(state, loading) {
            state.loading = loading;
        },
        SET_ERROR(state, error) {
            state.error = error;
        },
        SET_TARGET_SPAWN_POINT(state, target) {
            state.targetSpawnPoint = target;
        },
        SET_DEBUG(state, debug) {
            state.debug = debug;
        },
        SET_LAST_TRIGGERED_GATEWAY_ID(state, id) {
            state.lastTriggeredGatewayId = id;
        },
        SET_LAST_TRIGGERED_ACTION_ID(state, id) {
            state.lastTriggeredActionId = id;
        },

        ADD_TO_INVENTORY(state, clueId) {
            if (!state.inventory.includes(clueId)) {
                state.inventory.push(clueId);
            }
        },
        SET_INVENTORY(state, clueIds) {
            state.inventory = clueIds;
        },

        DEBUGGER_INFO(state, line) {
            state.debugInfo.push(line)
            state.debugInfo = state.debugInfo.slice(-6)
        },
        SET_CURSOR(state, cursor) {
            state.cursor = cursor;
        }
    },

    actions: {
        resetAllData({ commit }) {
            commit('SET_DATA', { key: 'configs', data: {} });
            commit('SET_DATA', { key: 'actions', data: [] });
            commit('SET_DATA', { key: 'animations', data: [] });
            commit('SET_DATA', { key: 'characters', data: [] });
            commit('SET_DATA', { key: 'clues', data: [] });
            commit('SET_DATA', { key: 'dialogs', data: [] });
            commit('SET_DATA', { key: 'media', data: [] });
            commit('SET_DATA', { key: 'scenes', data: [] });
            commit('SET_DATA', { key: 'sectors', data: [] });
            commit('SET_INVENTORY', []);
            commit('SET_CURRENT_SCENE', null);
        },

        async fetchAllData({ commit, dispatch }) {
            commit('SET_LOADING', true);
            commit('SET_PROGRESS', 0);

            const endpoints = [
                'actions', 'animations', 'characters', 'clues',
                'configs', 'dialogs', 'media', 'scenes', 'sectors'
            ];

            let completed = 0;

            try {
                const results = await Promise.all(endpoints.map(async (path) => {
                    const data = await fetchRobustData(path);
                    completed++;

                    commit('SET_PROGRESS', Math.round((completed / endpoints.length) * 100));
                    return data;
                }));

                // Destructure results in the same order as the endpoints array
                const [actions, animations, characters, clues, configs, dialogs, media, scenes, sectors] = results;

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
                commit('SET_ERROR', e.message);
            } finally {
                commit('SET_LOADING', false);
            }
        },

        async loadScene({ commit, state }, { sceneId }) {
            if (typeof sceneId === 'string') sceneId = parseInt(sceneId);

            const sceneData = state.scenes.find(scene => scene.id === sceneId);
            if (!sceneData) {
                commit('SET_ERROR', "Scene not found");
                return;
            }

            // Just save the scene metadata.
            // We will resolve the actual component in the View layer.
            commit('SET_CURRENT_SCENE', sceneData);
            commit('DEBUGGER_INFO', `LOADED ${sceneData.title}`);
        },

        async loadOpeningScene({ commit, dispatch, state }) {
            dispatch('loadScene', { sceneId: state.configs.opening_scene })
        },

        triggerAction({ commit }, payload) {
            const { actionId, ownerId } = payload;
            console.log(`[STORE] Triggering Action: ${actionId} (Owner: ${ownerId})`);
            commit('DEBUGGER_INFO', `ACTION TRIGGERED: ${actionId}`);
            commit('SET_LAST_TRIGGERED_ACTION_ID', { actionId, ownerId });
        }
    }
}
