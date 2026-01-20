import { ref } from 'vue';

export function useSceneData() {
    const sectorData = ref(null);
    const scenesInSector = ref([]);
    const currentScene = ref(null);
    const settings = ref({});
    const allPersonages = ref([]);
    const actions = ref([]);
    const allAnimations = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const fetchRobustData = async (endpoint) => {
        // Map legacy filenames to API endpoints
        let apiPath = endpoint.replace('.json', '');
        if (apiPath === 'personages') apiPath = 'characters';
        if (apiPath === 'settings') apiPath = 'configs';
        if (apiPath === 'behavior') apiPath = 'actions';
        // 'animations' maps to 'animations' usually, but let's be safe
        if (apiPath === 'animations') apiPath = 'animations';

        try {
            const res = await fetch(`/api/${apiPath}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();

            // Transform Configs: Array [{key, value}] -> Object {key: value}
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

    const loadContext = async (props) => {
        try {
            console.log("[DEBUG] loadContext start. props.id:", props.id, "props.sector_id:", props.sector_id);
            loading.value = true;
            error.value = null;

            const sectorId = props.sector_id;

            // 1. Fetch Sector
            if (sectorId) {
                console.log("[DEBUG] Fetching sector:", sectorId);
                const sData = await fetchRobustData(`sectors/${sectorId}.json`);
                sectorData.value = sData || {};
                scenesInSector.value = sectorData.value.scenes || [];
            }

            // 2. Fetch Settings & Behaviors & Animations
            settings.value = await fetchRobustData('settings.json') || {};
            actions.value = await fetchRobustData('behavior.json') || [];
            allAnimations.value = await fetchRobustData('animations.json') || [];

            // 3. Fetch Personages (Globally)
            allPersonages.value = await fetchRobustData('personages.json') || [];

            // 4. Determine Current Scene
            if (props.id) {
                console.log("[DEBUG] Fetching scene by ID:", props.id);
                const sceneRes = await fetchRobustData(`scenes/${props.id}.json`);
                console.log("[DEBUG] Scene fetch result:", sceneRes);
                if (sceneRes && (Array.isArray(sceneRes) ? sceneRes.length > 0 : Object.keys(sceneRes).length > 0)) {
                    currentScene.value = sceneRes;

                    // Fetch associated Location if available
                    const locId = currentScene.value.locatie_id || currentScene.value.location_id;
                    if (locId) {
                        console.log("[DEBUG] Fetching location for scene:", locId);
                        const locRes = await fetchRobustData(`locations/${locId}.json`);
                        if (locRes) {
                            currentScene.value.location = locRes;
                        }
                    }
                } else {
                    console.warn("[DEBUG] Scene fetch returned empty/invalid data.");
                }
            }

            // Fallback: If fetch failed or no ID, try using props if enough data exists
            if (!currentScene.value && props.id && props.media) {
                console.log("[DEBUG] Using props as currentScene fallback");
                currentScene.value = { ...props };
            }

            if (!currentScene.value && scenesInSector.value.length > 0) {
                console.log("[DEBUG] Using first scene in sector as fallback");
                // Fallback logic
                const first = scenesInSector.value[0];
                const sceneRes = await fetchRobustData(`scenes/${first.id}.json`);
                currentScene.value = sceneRes;
            }

            // 5. Ensure Gateways & Data integrity
            if (currentScene.value) {
                // Map backend '2d_gateways' to 'gateways' if needed, or use 'gateways' from prop/data
                if (currentScene.value['2d_gateways']) {
                    currentScene.value.gateways = currentScene.value['2d_gateways'];
                } else if (!currentScene.value.gateways) {
                    currentScene.value.gateways = [];
                }
            } else {
                console.error("[DEBUG] Failed to determine currentScene");
                error.value = "Failed to determine current scene";
            }

        } catch (e) {
            console.error("loadContext failed", e);
            error.value = 'Failed to load data';
        } finally {
            loading.value = false;
        }
    };

    return {
        // State
        sectorData,
        scenesInSector,
        currentScene,
        settings,
        settings,
        allPersonages,
        actions,
        allAnimations,
        loading,
        error,

        // Methods
        fetchRobustData,
        loadContext
    };
}
