<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, watch, defineProps, defineEmits } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { useGameAssets } from '../composables/useGameAssets';
import { useDialogue }   from '../composables/useDialogue';


const props = defineProps({
    // is_engine can stay as an optional prop if we want to force it,
    // but typically it's derived from whether we are in the GameEngine
    is_engine: { type: Boolean, default: true }
});

const emit = defineEmits(['next-scene', 'debug', 'give-clue']);

const store = useStore();
const { resolveAssetUrl, getPersonageGlbUrl } = useGameAssets();

// State from store
const currentScene = computed(() => store.state.game.currentScene);
const allPersonages = computed(() => store.state.game.characters);
const actions = computed(() => store.state.game.actions);
const settings = computed(() => store.state.game.configs);
const allAnimations = computed(() => store.state.game.animations);
const loading = computed(() => store.state.game.loading);
const error = computed(() => store.state.game.error);

const isEngine = ref(props.is_engine);
// Update if prop changes
watch(() => props.is_engine, (val) => {
    isEngine.value = val;
    updateDimensions();
});

// Access data from store
const sectorId = computed(() => currentScene.value?.sector_id);
const sceneId = computed(() => currentScene.value?.id);
const debug = computed(() => store.state.game.debug);
const targetSpawnPoint = computed(() => store.state.game.targetSpawnPoint);

const getImageUrl = resolveAssetUrl;

const getCharacterGlbUrl = (name) => {
    const p = allPersonages.value.find(pers => pers.name === name);
    return getPersonageGlbUrl(p);
};

const gameState = reactive({
    tags: []
});


// let dialogueResolve = null; // Removed as it's now in composable

const spawnedNPCs = reactive({});
const npcModes = reactive({}); // Stores: 'HIDDEN', 'IDLE', 'SEQUENCE'
const isBehaviorActive = ref(false); // Global behavior lock
const lastTriggeredGateway = ref(null);
const storeLastTriggeredId = computed(() => store.state.game.lastTriggeredGatewayId);
const lastExecutedBehaviorGateway = ref(null);
const lastDialogueCloseTime = ref(0); // To prevent click through

// Three.js refs
const canvasContainer = ref(null);
let renderer, scene, camera, clock;
let ambientLight, sun;
let currentGltf = null;
let animationFrameId = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Movement / Character refs
let playableCharacter = null;
let vehicle = null;
const isWalking = ref(false);
const targetPosition = new THREE.Vector3();
const characterSpeed = 1.7;
const landingSessionKey = computed(() => `sector_landed_${ sectorId.value }`);

const hasLandedInSession = () => {
    try {
        const key = landingSessionKey.value;
        const stored = sessionStorage.getItem(key);
        console.log(`[DEBUG] Checking landing session. Key: ${key}, Stored: ${stored}, SectorID: ${sectorId.value}`);
        return stored === 'true';
    } catch(e) { return false; }
};

const landingDone = ref(hasLandedInSession());

// let dialogueResolve = null; // Removed as it's now in composable

const markLandingComplete = () => {
    landingDone.value = true;
    if (sectorId.value) {
         try { sessionStorage.setItem(landingSessionKey.value, 'true'); } catch(e) {}
    }
};

const createLoader = () => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    return loader;
};

let targetPointMesh = null;
const pendingGateway = ref(null);
const currentLoadingSceneId = ref(null);
const currentCursor = ref("url('/cursors/pointer.svg') 0 0, auto");

// Resolved gateways (merging store data + location data)
const currentGateways = computed(() => {
    return currentScene.value?.gateways || currentScene.value?.['2d_gateways'] || [];
});

const sceneTriggers = computed(() => currentGateways.value);
const behaviorLog = ref([]);
const targetRotation = ref(null); // Direction in degrees

// Dialogue & Behavior System (Initialized after dependencies)
const {
    activeDialogue,
    currentNodeId,
    typewriterText,
    showDialogueOptions,
    dialogueNPCName,
    optionsToDisplay,
    startDialogue,
    playNode,
    selectOption,
    closeDialogue,
    runAction
} = useDialogue({
    isEngine,
    playableCharacter: computed({
        get: () => playableCharacter,
        set: (val) => { playableCharacter = val; }
    }),
    spawnedNPCs,
    npcModes,
    isWalking,
    targetPosition,
    targetRotation,
    isBehaviorActive,
    behaviorLog,
    sectorId,
    currentScene,
    actions,
    targetPointMesh: computed(() => targetPointMesh),
    emit,
    resolveAssetUrl,
    swapScene: (gateway) => swapScene(gateway),
    gameState,
    allPersonages,
    settings,
    allDialogs: computed(() => store.state.game.dialogs)
});

watch(activeDialogue, (newVal) => {
    if (!newVal) {
        lastDialogueCloseTime.value = Date.now();
        console.log(`[DIALOGUE] Closed at ${lastDialogueCloseTime.value}`);
    }
});

const activeBehaviors = computed(() => {
    if (!currentGateways.value) return [];
    // Map 'behavior_id' (legacy) or 'action_id' (new)
    const behaviorIds = [...new Set(currentGateways.value.map(gw => gw.behavior_id || gw.action_id).filter(id => id))];
    return actions.value.filter(g => behaviorIds.includes(g.id));
});

// Animation refs
let characterMixer = null;
const characterActions = {};
let activeAction = null;
const isCaution = ref(false);

// Scaling & Visibility refs
const characterScale = ref(0.5);
const vehicleScale = ref(0.5);
const show3DHelpers = ref(store.state.game.debug);
const sunIntensity = ref(1.0);
const ambientIntensity = ref(0.8);
const currentSpawnPoints = ref([]);

// Debug Helpers
watch(debug, (val) => {
    show3DHelpers.value = !!val;
}, { immediate: true });

const VIEW_WIDTH = 1216;
const VIEW_HEIGHT = 832;
const ASPECT_RATIO = VIEW_WIDTH / VIEW_HEIGHT;


// Responsive Logic
const containerWidth = ref(VIEW_WIDTH);
const containerHeight = ref(VIEW_HEIGHT);
const containerStyle = computed(() => {
    if (isEngine.value) {
        return {
            width: '100%',
            height: '100%',
            '--noir-border-width': '0px',
            border: 'none',
            boxShadow: 'none',
            margin: '0',
            padding: '0'
        };
    }
    return {
        width:  containerWidth.value + 'px',
        height: containerHeight.value + 'px'
    };
});

const updateDimensions = () => {
    // In engine mode, we fill the screen (or available parent)
    if (isEngine.value) {
        // Use the container's actual size if mounted, otherwise fallback to window
        const w = (canvasContainer.value && canvasContainer.value.clientWidth)  || window.innerWidth;
        const h = (canvasContainer.value && canvasContainer.value.clientHeight) || window.innerHeight;

        containerWidth.value = w;
        containerHeight.value = h;

        if (renderer && camera) {
            renderer.setSize(w, h);

            // Perspective matching for object-fit: cover using setViewOffset
            // This preserves the internal camera matrix (important for fSpy/shifted shots)
            const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
            const fullW = VIEW_WIDTH * scale;
            const fullH = VIEW_HEIGHT * scale;
            const offsetX = (fullW - w) / 2;
            const offsetY = (fullH - h) / 2;

            if (camera.setViewOffset) {
                camera.setViewOffset(fullW, fullH, offsetX, offsetY, w, h);
            } else {
                camera.aspect = w / h;
            }
            camera.updateProjectionMatrix();
        }
        return;
    }

    const verticalOffset = 200;
    const sidebarWidth = window.innerWidth >= 1024 ? 384 + 32 : 0;

    const maxWidth  = window.innerWidth - 64 - sidebarWidth;
    const maxHeight = window.innerHeight - verticalOffset;

    let newWidth = maxWidth;
    let newHeight = newWidth / ASPECT_RATIO;

    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * ASPECT_RATIO;
    }

    if (newWidth > VIEW_WIDTH) {
        newWidth = VIEW_WIDTH;
        newHeight = VIEW_HEIGHT;
    }

    containerWidth.value = Math.floor(newWidth);
    containerHeight.value = Math.floor(newHeight);

    if (renderer && camera) {
        camera.aspect = ASPECT_RATIO;
        camera.updateProjectionMatrix();
        renderer.setSize(containerWidth.value, containerHeight.value);
    }
};

onMounted(async () => {
    console.log("[DEBUG] WalkableAreaScene mounted");
    blockTriggers.value = true;

    window.addEventListener('resize', updateDimensions);
    initThree();
    console.log("[DEBUG] initThree complete");

    updateDimensions(); // Call after initThree to apply zoom/size
    if (currentScene.value) {
        console.log("[DEBUG] Loading Scene GLB...");
        await loadSceneGLB(currentScene.value, targetSpawnPoint.value);
        console.log("[DEBUG] loadSceneGLB complete");
    } else {
        console.warn("[DEBUG] No currentScene to load");
    }
    blockTriggers.value = false;
});

onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
});

const initThree = () => {
    if (!canvasContainer.value) return;

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerWidth.value, containerHeight.value);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.value.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, ASPECT_RATIO, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    clock = new THREE.Clock();

    ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity.value);
    scene.add(ambientLight);
    ambientLight.name = "ambient-light";

    sun = new THREE.DirectionalLight(0xffffff, sunIntensity.value);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    scene.add(sun);
    sun.name = "sun-light";

    // Target Marker
    const markerGeom = new THREE.RingGeometry(0.2, 0.25, 32);
    markerGeom.rotateX(-Math.PI / 2);
    targetPointMesh = new THREE.Mesh(markerGeom, new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    targetPointMesh.userData.isHelper = true; // Tag as helper
    targetPointMesh.visible = false;
    scene.add(targetPointMesh);

    animate();
};

const loadSceneGLB = (sceneData, targetSpawnLabel = null) => {
    return new Promise((resolve) => {
        let url = '';
        console.log("[DEBUG] loadSceneGLB started for scene:", sceneData.id);

        if (sceneData.media && sceneData.media.length > 0) {
            const glb = sceneData.media.find(m => m.filepad && m.filepad.endsWith('.glb'));
            if (glb) url = resolveAssetUrl(glb.filepad);
        }

        console.log("[DEBUG] Resolved Scene GLB URL:", url);

        if (!url) {
            // Fallback: Check if sector has a GLB? Or just fail gracefully.
            console.warn("[DEBUG] No GLB found in scene media.");
            resolve();
            return;
        }

        if (currentLoadingSceneId.value === sceneData.id) {
            console.log("[DEBUG] Scene already loading or loaded:", sceneData.id);
            return resolve();
        }

        currentLoadingSceneId.value = sceneData.id;

        // Guard: ensure THREE scene is initialized
        if (!scene) {
            console.warn("[DEBUG] THREE Scene not initialized, skipping GLB load.");
            return resolve();
        }

        // 1. Cleanup before loading
        if (currentGltf) { scene.remove(currentGltf);
            currentGltf = null; }
        if (playableCharacter) { scene.remove(playableCharacter);
            playableCharacter = null; }
        if (vehicle) { scene.remove(vehicle);
            vehicle = null; }

        // Remove all NPCs
        Object.values(spawnedNPCs).forEach(npc => {
            if (npc.mesh) scene.remove(npc.mesh);
            if (npc.mixer) npc.mixer = null;
        });
        for (const key in spawnedNPCs) delete spawnedNPCs[key];
        for (const key in npcModes) delete npcModes[key];

        // Thorough cleanup: remove anything that isn't a core light
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const child = scene.children[i];
            if (child.name !== 'ambient-light' && child.name !== 'sun-light' && child.name !== 'target-marker' && child !== targetPointMesh && child !== currentGltf) {
                if (child.isMesh || child.isGroup) {
                    scene.remove(child);
                }
            }
        }



        const loader = createLoader();
        loader.load(url, (gltf) => {
            currentGltf = gltf.scene;
            scene.add(currentGltf);

            let fspyCamera = null;
            currentGltf.traverse((child) => {
                if (child.name.includes('fspy') && child.isCamera) fspyCamera = child;
                if (child.isMesh) {
                    const isFloor = child.name.toLowerCase() === 'floor' || child.name.toLowerCase() === 'plane';

                    if (isFloor) {
                        child.material = show3DHelpers.value
                            ? new THREE.MeshPhongMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
                            : new THREE.ShadowMaterial({ opacity: 0.4 });
                        child.receiveShadow = true;
                        child.name = 'floor';
                    } else {
                        // Occlusion Mask: Write to depth buffer
                        child.material = new THREE.MeshBasicMaterial({
                            color: 0xff00ff,
                            transparent: show3DHelpers.value,
                            opacity: show3DHelpers.value ? 0.3 : 0,
                            colorWrite: show3DHelpers.value,
                        });
                        // Depth rendering is crucial for masking
                        child.material.depthWrite = true;
                        child.material.depthTest = true;
                        child.userData.isHelper = true; // Tag as helper so we don't walk on it
                    }
                }
            });

            if (fspyCamera) {
                camera = fspyCamera;
                // Update dimensions immediately to apply correct zoom/offset to the new camera
                updateDimensions();
            }

            // 2. Identify Spawn Points
            const spawnPoints = sceneData['3d_spawnpoints'] || [];
            if (spawnPoints.length === 0 && sceneData.location && sceneData.location.spawn_points) {
                 // Fallback to legacy location data if 3d_spawnpoints is empty
                 const playerSectorId = sectorId.value;
                 const allSpawnPoints = sceneData.location.spawn_points || {};
                 const locPoints = allSpawnPoints[playerSectorId] || allSpawnPoints[Number(playerSectorId)] || [];
                 if (locPoints.length > 0) spawnPoints.push(...locPoints);
            }
            currentSpawnPoints.value = spawnPoints;

            console.log(`[DEBUG] Scene ${sceneData.id} - Target Spawn: ${targetSpawnLabel}`);
            console.log(`[DEBUG] Available points:`, spawnPoints.map(p => p.name || p.type));

            // Spawning Priority:
            // 1. Specific requested label (case-insensitive)
            // 2. 'landing' waypoint (if landing for first time)
            // 3. 'personage' type
            // 4. Any 'waypoint'
            // 5. First available point
            // 0,0,0 if all else fails

            const findByName = (label) => spawnPoints.find(p => p.name && p.name.toLowerCase() === label.toLowerCase());

            const specificSpawn = targetSpawnLabel ? (findByName(targetSpawnLabel) || spawnPoints.find(p => String(p.personage_id) === String(targetSpawnLabel))) : null;
            const landingSpawn = findByName('landing');
            const personageSpawn = spawnPoints.find(p => p.type === 'personage');
            const anyWaypoint    = spawnPoints.find(p => p.type === 'waypoint');

            const charSpawnPoint = specificSpawn ||
                              (!landingDone.value ? landingSpawn : null) ||
                              personageSpawn ||
                              anyWaypoint ||
                              spawnPoints[0];

            if (specificSpawn) console.log(`[DEBUG] Chose specific spawn: ${specificSpawn.name}`);
            else if (!landingDone.value && landingSpawn) console.log(`[DEBUG] Chose landing spawn`);
            else if (charSpawnPoint) console.log(`[DEBUG] Chose fallback spawn: ${charSpawnPoint.name || charSpawnPoint.type}`);
            else console.log(`[DEBUG] No spawn point found! Fallback to 0,0,0`);

            // Vehicle: search for waypoint named 'spinner'
            const vehicleSpawn = findByName('spinner') || spawnPoints.find(p => p.type === 'vehicle');


            // 3. Sequentially spawn vehicle then character then props
            const vehiclePromise = vehicleSpawn ?
                spawnVehicle(vehicleSpawn, !landingDone.value) :
                Promise.resolve();

            if (!vehicleSpawn) {
                markLandingComplete();
            }

            vehiclePromise.then(() => {
                if (currentLoadingSceneId.value !== sceneData.id) return resolve();

                const charPos = charSpawnPoint ||
                    (vehicleSpawn ? { x: vehicleSpawn.x + 2, y: vehicleSpawn.y, z: vehicleSpawn.z } : { x: 0, y: 0, z: 0 });

                spawnCharacter(charPos, sceneData.id).then(() => {
                    if (currentLoadingSceneId.value !== sceneData.id) return resolve();

                    let spList = sceneData.scene_personages || sceneData.scenePersonages || sceneData.npc || [];

                    // PROACTIVE DETECTION: Scan spawn points for personages not in the explicit list
                    if (spList.length === 0 && spawnPoints.length > 0) {
                        const detectiveSpawned = spawnPoints.filter(p => p.personage_id);
                        if (detectiveSpawned.length > 0) {
                            console.log(`[SPAWN] Proactively detected ${detectiveSpawned.length} NPCs from spawn points.`);
                            spList = detectiveSpawned.map(p => {
                                // Find personage data
                                const personage = allPersonages.value.find(pers => String(pers.id) === String(p.personage_id));
                                return {
                                    personage_id: p.personage_id,
                                    personage: personage,
                                    spawn_point_name: p.name || p.id,
                                    behavior_id: p.behavior_id
                                };
                            }).filter(sp => sp.personage);
                        }
                    }

                    spawnNPCs(spList, sceneData.id).then(() => {
                        if (currentLoadingSceneId.value !== sceneData.id) return resolve();

                        if (typeof spawnDebugHelpers === 'function') {
                            spawnDebugHelpers(spawnPoints);
                        }
                        spawnProps(spawnPoints, sceneData.id).then(resolve);
                    });
                });
            });


        }, undefined, (err) => {
            console.error("[DEBUG] Main GLB load failed:", err, "URL:", url);
            resolve();
        });
    });
};

const spawnVehicle = (spawnPoint, animate = true) => {
    return new Promise((resolve) => {
        // Updated: Try to find the Spinner personage first
        let vehicleUrl = '';

        // 1. Try finding 'Spinner 2049' or similar vehicle in personages
        const spinnerPersonage = allPersonages.value.find(p =>
            p.type === 'vehicle' &&
            (p.name.includes('Spinner') || p.name.includes('2049'))
        );

        if (spinnerPersonage) {
             vehicleUrl = getCharacterGlbUrl(spinnerPersonage.name);
             console.log(`[DEBUG] Found Spinner Personage: ${spinnerPersonage.name}, URL: ${vehicleUrl}`);
        }

        // 2. Fallback to settings or hardcoded (but fixed path)
        if (!vehicleUrl) {
            const spinnerPath = settings.value.spinner2049 || '3d/glb/1768849748_vehicle--spinner-2049.glb';
            // Use resolveAssetUrl directly since getVehicleGlbUrl was removed/broken
            vehicleUrl = resolveAssetUrl(spinnerPath);
        }

        console.log("[DEBUG] Final Spinner URL:", vehicleUrl);
        if (!vehicleUrl) {
            markLandingComplete();
            resolve();
            return;
        }

        const loader = createLoader();
        loader.load(vehicleUrl, (gltf) => {
            if (currentLoadingSceneId.value !== currentScene.value.id) {
                resolve();
                return;
            }
            vehicle = gltf.scene;

            const targetY = spawnPoint.y;
            const scale = spawnPoint.scale || vehicleScale.value;
            vehicle.scale.set(scale, scale, scale);
            vehicle.rotation.y = THREE.MathUtils.degToRad(spawnPoint.direction || 0);
            scene.add(vehicle);

            if (animate) {
                const startY = 30; // Start a bit higher
                const duration = 2500; // 2.5 seconds for a graceful descent
                const startTime = performance.now();
                vehicle.position.set(spawnPoint.x, startY, spawnPoint.z);

                const animateLanding = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Quadratic ease-out: progress * (2 - progress)
                    const ease = progress * (2 - progress);

                    vehicle.position.y = startY - (startY - targetY) * ease;

                    if (progress < 1) {
                        requestAnimationFrame(animateLanding);
                    } else {
                        vehicle.position.y = targetY;
                        markLandingComplete();
                        resolve();
                    }
                };
                requestAnimationFrame(animateLanding);
            } else {
                vehicle.position.set(spawnPoint.x, targetY, spawnPoint.z);
                resolve();
            }
        }, undefined, (err) => {
            console.error("Failed to load vehicle GLB", err);
            markLandingComplete();
            resolve();
        });
    });
};
const getMixerKey = (anim, clipName) => {
    if (anim?.mixer_name) return anim.mixer_name;
    return 'idle';
};

const spawnCharacter = (spawnPoint, sceneId) => {
    return new Promise((resolve) => {
        let characterName = 'Nexus Runner K';
        let customGlb = null;

        const savedPlayer = localStorage.getItem('player_character');
        if (savedPlayer) {
            try {
                const p = JSON.parse(savedPlayer);
                if (p.threefile) {
                    customGlb = p.threefile;
                } else if (p.name) {
                    characterName = p.name;

                }
            } catch (e) {
                console.warn("Failed to parse player_character from localStorage", e);
            }
        } else {
            characterName = localStorage.getItem('selected_character_name') || localStorage.getItem('selected_character_naam') || settings.value.playable || 'Nexus Runner K';
        }

        const charUrl = customGlb
            ? resolveAssetUrl(`glb/${customGlb}`)
            : getCharacterGlbUrl(characterName);

        console.log(`[DEBUG] Resolved Character URL: ${charUrl} (Name: ${characterName}, CustomGLB: ${customGlb})`);

        if (!charUrl) {
            resolve();
            return;
        }

        const loader = createLoader();
        loader.load(charUrl, (gltf) => {
            if (currentLoadingSceneId.value !== sceneId) {
                resolve();
                return;
            }

            if (playableCharacter) {
                scene.remove(playableCharacter);
                if (characterMixer) characterMixer = null;
            }

            playableCharacter = gltf.scene;

            let scale = spawnPoint.scale || characterScale.value;

            console.log(`Using base scale: ${scale}.`);

            playableCharacter.scale.set(scale, scale, scale);
            playableCharacter.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
            playableCharacter.rotation.y = THREE.MathUtils.degToRad(spawnPoint.direction || 0);
            scene.add(playableCharacter);

            // Anti-loop: If we spawned inside a gateway, mark it as already triggered
            // CRITICAL: Ensure camera and character matrices are updated before projection check
            if (camera) {
                camera.updateMatrixWorld(true);
                camera.updateProjectionMatrix();
            }
            playableCharacter.updateMatrixWorld(true);

            const entryGw = getGatewayAtPosition();
            if (entryGw) {
                console.log(`[DEBUG] Anti-loop: Spawned inside gateway ${entryGw.target_scene_id}. Ignoring first trigger.`);
                lastTriggeredGateway.value = entryGw;
            }

            // Reset actions
            for (const key in characterActions) delete characterActions[key];

            // Setup Animations - External vs Embedded
            characterMixer = new THREE.AnimationMixer(playableCharacter);

            // 1. Try Loading External Animations from Personage Data
            let externalAnimationsLoaded = false;
            const personageData = allPersonages.value.find(p => p.name === characterName || p.id === characterName);

            console.log(`[ANIM DEBUG] Character Name: '${characterName}'`);
            if (personageData) {
                 // Safe stringify to avoid circular errors if any
                 const safeStringify = (obj) => {
                    const cache = new Set();
                    return JSON.stringify(obj, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (cache.has(value)) return;
                            cache.add(value);
                        }
                        return value;
                    }, 2);
                 };
                 console.log(`[ANIM DEBUG] Personage Structure:\n`, safeStringify(personageData));
            } else {
                 console.log(`[ANIM DEBUG] Personage NOT FOUND in allPersonages matching '${characterName}'`);
                 console.log(`[ANIM DEBUG] Available Names:`, allPersonages.value.map(p => p.name).join(', '));
            }

            // Expanded lookup: Check 'animations' array (pivot or full) OR 'media' array
            let rawAnims = personageData?.animations || [];

            // If rawAnims contains objects with 'id' but no 'filepad'/'path', try to resolve from allAnimations
            rawAnims = rawAnims.map(anim => {
                if ((!anim.filepad && !anim.url && !anim.path) || anim.pivot) {
                    // It might be a pivot object or just an ID wrapper
                    // We assume there's an ID we can link to the global table
                    const animId = anim.id || (anim.pivot && anim.pivot.animation_id);
                    if (animId) {
                        const globalAnim = allAnimations.value.find(ga => ga.id === animId);
                        if (globalAnim) {
                            return { ...anim, ...globalAnim }; // Merge pivot/local data with global data
                        }
                    }
                }
                return anim;
            });

            const mediaAnims = (personageData?.media || []).filter(m => m.type === 'animation' || (m.filepad && m.filepad.endsWith('.glb')));

            const candidateAnimations = [...rawAnims, ...mediaAnims];

            if (candidateAnimations.length > 0) {
                console.log(`[ANIM] Found ${candidateAnimations.length} candidate animations.`);

                // Helper to load animation clip
                const loadClip = async (anim) => {
                    // Try filepad, url, or fallback to 'path'
                    let path = anim.filepad || anim.url || anim.path;

                    // If no direct path, check media relation
                    if (!path && anim.media && Array.isArray(anim.media) && anim.media.length > 0) {
                        const glb = anim.media.find(m => m.filepad && (m.filepad.endsWith('.glb') || m.filepad.endsWith('.gltf') || m.type === 'threefile')) || anim.media[0];
                        if (glb) {
                            path = glb.filepad;
                            console.log(`[ANIM] Found path via media relation for ${anim.name}: ${path}`);
                        }
                    }

                    const animUrl = resolveAssetUrl(path);
                    const rawName = (anim.type || anim.name || anim.label || 'idle');

                    if (!animUrl) {
                        console.warn(`[ANIM] No file path found for animation:`, rawName);
                        console.log(`[ANIM DEBUG] Keys available:`, Object.keys(anim));
                        return;
                    }

                    return new Promise(resolveAnim => {
                        loader.load(animUrl, (animGltf) => {
                            console.log(`[ANIM] GLB loaded for ${rawName}. Anims found: ${animGltf.animations ? animGltf.animations.length : 0}`);

                            if (animGltf.animations && animGltf.animations.length > 0) {
                                const clip = animGltf.animations[0]; // Assume 1 clip per file
                                if (!clip) {
                                    console.warn(`[ANIM] Clip undefined for ${rawName}`);
                                    resolveAnim(); return;
                                }

                                console.log(`[ANIM] Clip Name: ${clip.name}, Duration: ${clip.duration}, Tracks: ${clip.tracks.length}`);

                                 const actionKey = getMixerKey(anim, clip.name);

                                if (actionKey) {
                                    try {
                                        const action = characterMixer.clipAction(clip);
                                        if (action) {
                                            characterActions[actionKey] = action;
                                            console.log(`[ANIM] Loaded external action: '${actionKey}' from ${animUrl}`);
                                            externalAnimationsLoaded = true;
                                        } else {
                                            console.warn(`[ANIM] Failed to create clipAction for ${actionKey}`);
                                        }
                                    } catch (e) {
                                        console.error(`[ANIM] Error creating clipAction for ${actionKey}:`, e);
                                    }
                                }
                            } else {
                                console.warn(`[ANIM] No animations array in GLB for ${rawName}`);
                            }
                            resolveAnim();
                        }, undefined, (err) => {
                            console.warn(`[ANIM] Failed to load GLB ${animUrl}`, err);
                            resolveAnim();
                        });
                    });
                };

                // Load all concurrently
                Promise.all(candidateAnimations.map(loadClip)).then(() => {
                    // Start default animation after loading
                    console.log(`[ANIM] Finished loading. Actions available:`, Object.keys(characterActions));
                    if (characterActions['idle']) playAnimation('idle');
                    else if (characterActions['walk']) playAnimation('walk'); // Fallback
                });

            }

            // 2. Fallback to Embedded Animations if no external ones found (or as supplement)
            if (!externalAnimationsLoaded && gltf.animations && gltf.animations.length > 0) {
                 console.log(`[ANIM] Using embedded animations for ${characterName}`);
                gltf.animations.forEach(clip => {
                    const name = clip.name.toLowerCase();
                    let actionKey = null;

                    if (name.startsWith('walk')) actionKey = 'walk';
                    else if (name.startsWith('idle')) actionKey = 'idle';
                    else if (name.startsWith('caut')) actionKey = 'caution';

                    if (actionKey) {
                        characterActions[actionKey] = characterMixer.clipAction(clip);
                    }
                });

                // Default to Idle
                if (characterActions['idle']) {
                    playAnimation('idle');
                }
            }

            // Strip lights and set shadow casting
            playableCharacter.userData.isCharacter = true;
            playableCharacter.traverse(child => {
                child.userData.isCharacter = true;
                if (child.isLight) {
                    child.visible = false;
                }
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });


            resolve();
        });
    });
};

const playAnimation = (name, duration = 0.2) => {
    console.log(`[ANIM] playAnimation called for: ${name}. Available: ${Object.keys(characterActions).join(', ')}`);
    const nextAction = characterActions[name];
    if (!nextAction) {
        console.warn(`[ANIM] Action '${name}' not found.`);
        return;
    }
    if (nextAction === activeAction) return;

    if (activeAction) {
        nextAction.reset();
        nextAction.setEffectiveTimeScale(1);
        nextAction.setEffectiveWeight(1);
        nextAction.crossFadeFrom(activeAction, duration, true);
        nextAction.play();
    } else {
        nextAction.play();
    }
    activeAction = nextAction;
};

// Animation Watchers
watch([isWalking, isCaution], ([walking, caution]) => {
    console.log(`[ANIM] Watcher triggered. Walking: ${walking}, Caution: ${caution}. Mixer exists: ${!!characterMixer}`);
    if (!characterMixer) return;

    if (walking) {
        playAnimation('walk');
    } else if (caution) {
        playAnimation('caution');
    } else {
        playAnimation('idle');
    }
});

const spawnedThreeProps = []; // Track spawned props for cleanup

const spawnProps = async (spawnPoints, sceneId) => {
    // Cleanup old props
    spawnedThreeProps.forEach(p => scene.remove(p));
    spawnedThreeProps.length = 0;

    const propSpawnPoints = spawnPoints.filter(p => p.type === 'aanwijzing');
    if (propSpawnPoints.length === 0) return;

    const loader = createLoader();

    for (const p of propSpawnPoints) {
        if (currentLoadingSceneId.value !== sceneId) break;

        // Find the aanwijzing data to get its GLB or visual representation
        try {
            // Ideally we have the aanwijzingen loaded or can fetch by ID
            // For now, let's assume we might need to fetch it or it's provided
            // If we don't have a specific GLB for each prop yet, we might skip or use a placeholder
            // But let's check if currentScene.location.aanwijzingen is available
            const aanwijzing = currentScene.value.location.aanwijzingen ?.find(a => a.id === p.aanwijzing_id);
            if (aanwijzing && aanwijzing.glb_pad) {
                const url = getImageUrl(aanwijzing.glb_pad);
                const gltf = await new Promise((res, rej) => loader.load(url, res, undefined, rej));
                const propMesh = gltf.scene;
                const scale = p.scale || 1.0;
                propMesh.scale.set(scale, scale, scale);
                propMesh.position.set(p.x, p.y, p.z);
                propMesh.rotation.y = THREE.MathUtils.degToRad(p.direction || 0);
                scene.add(propMesh);
                spawnedThreeProps.push(propMesh);
            }
        } catch (e) {
            console.warn("Failed to spawn prop", p.id, e);
        }
    }
};

const debugHelpers = [];
const spawnDebugHelpers = (spawnPoints) => {
    debugHelpers.forEach(h => scene.remove(h));
    debugHelpers.length = 0;

    if (!show3DHelpers.value) return;

    spawnPoints.forEach(p => {
        // Sphere for the base point
        const geo = new THREE.SphereGeometry(0.1, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(p.x, p.y, p.z);
        scene.add(sphere);
        debugHelpers.push(sphere);

        // Arrow for direction
        const dir = new THREE.Vector3(0, 0, 1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(p.direction || 0));
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(p.x, p.y + 0.1, p.z), 0.5, 0x00ff00);
        scene.add(arrow);
        debugHelpers.push(arrow);

        // Label using sprite
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00ff00';
        ctx.font = '32px monospace';
        ctx.fillText(p.name || p.type || 'spawn', 10, 40);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, sizeAttenuation: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(p.x, p.y + 0.6, p.z);
        sprite.scale.set(1.5, 0.4, 1);
        scene.add(sprite);
        debugHelpers.push(sprite);
    });
};

const spawnNPCs = async (scenePersonages, sceneId) => {
    // Cleanup old NPCs (redundant but safe)
    if (sceneId === currentLoadingSceneId.value) {
        // ... cleanup already happened in loadSceneGLB
    }

    if (!scenePersonages || scenePersonages.length === 0) return;

    const currentSectorId = sectorId.value;

    // Use the same logic as loadSceneGLB: Prioritize 3d_spawnpoints
    let spawnPoints = currentScene.value['3d_spawnpoints'] || [];

    if (spawnPoints.length === 0 && currentScene.value.location && currentScene.value.location.spawn_points) {
         const allSpawnPoints = currentScene.value.location.spawn_points || {};
         const locPoints = allSpawnPoints[currentSectorId] || allSpawnPoints[Number(currentSectorId)] || [];
         if (locPoints.length > 0) spawnPoints = [...locPoints];
    }

    for (const sp of scenePersonages) {
        try {
            if (currentLoadingSceneId.value !== sceneId) break;
            const p = sp.personage;
            if (!p) continue;

            // Find assigned spawn point with detailed logging
            let matchType = 'fallback';
            let spawnPos = spawnPoints.find(point => {
                if (point.name === sp.spawn_point_name || point.id === sp.spawn_point_name) {
                    matchType = 'explicit_name';
                    return true;
                }
                return false;
            });

            if (!spawnPos) {
                // FUZZY NAME MATCH: Check if any spawnpoint name contains the NPC name
                spawnPos = spawnPoints.find(point => {
                    if (point.name && point.name.toLowerCase().includes(p.name.toLowerCase())) {
                        matchType = 'fuzzy_name_match';
                        return true;
                    }
                    return false;
                });
            }

            if (!spawnPos) {
                spawnPos = spawnPoints.find(point => {
                    if (String(point.personage_id) === String(sp.personage_id)) {
                        matchType = 'personage_id_link';
                        return true;
                    }
                    return false;
                });
            }

            if (!spawnPos) {
                 spawnPos = spawnPoints.find(point => {
                    if (point.type === 'npc') { // Fixed: was 'personage', editor uses 'npc'
                        matchType = 'generic_npc_type_fallback';
                        return true;
                    }
                    return false;
                 });
            }

            if (!spawnPos) {
                spawnPos = { x: 0, y: 0, z: 0 };
                matchType = 'Coordinate Zero (No match found)';
            }

            console.log(`[SPAWN DIAGNOSTIC] NPC: '${p.name}' (ID: ${p.id})`);
            console.log(`[SPAWN DIAGNOSTIC]   - Reason Spawned: Found in 'scene_personages' list.`);
            console.log(`[SPAWN DIAGNOSTIC]   - Requested Point: '${sp.spawn_point_name}'`);
            console.log(`[SPAWN DIAGNOSTIC]   - Match Method: ${matchType}`);
            console.log(`[SPAWN DIAGNOSTIC]   - Final Location: ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}`);
            console.log(`[SPAWN DIAGNOSTIC]   - Scale Applied: ${spawnPos.scale || characterScale.value}`);

            const charUrl = getCharacterGlbUrl(p.name);
            if (!charUrl) continue;

            const loader = createLoader();
            const gltf = await new Promise((res, rej) => loader.load(charUrl, res, undefined, rej));

            if (currentLoadingSceneId.value !== sceneId) break;

            const mesh = gltf.scene;


            let scale = spawnPos.scale || characterScale.value;
            mesh.scale.set(scale, scale, scale);
            mesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
            mesh.rotation.y = THREE.MathUtils.degToRad(spawnPos.direction || 0);

            scene.add(mesh);

            let mixer = null;
            let npcActions = {};

            // 1. Gather all candidate animations (Pivot/Relation + Media collection)
            const candidateAnims = [
                ...(p.animations || []),
                ...(p.media || []).filter(m => m.type === 'animation' || (m.filepad && m.filepad.endsWith('.glb')))
            ];

            const personageAnims = candidateAnims.map(anim => {
                // If ID-only, try to resolve from global allAnimations
                if (!anim.filepad && anim.id) {
                    const globalAnim = allAnimations.value.find(ga => ga.id === anim.id);
                    if (globalAnim) return { ...anim, ...globalAnim };
                }
                return anim;
            });

            if (personageAnims.length > 0) {
                mixer = new THREE.AnimationMixer(mesh);
                const animLoader = createLoader();

                await Promise.all(personageAnims.map(async (anim) => {
                    let path = anim.filepad || anim.url || anim.path;

                    // If no direct path, check media relation (standard in modern store)
                    if (!path && anim.media && Array.isArray(anim.media) && anim.media.length > 0) {
                        const glb = anim.media.find(m => m.filepad && (m.filepad.endsWith('.glb') || m.filepad.endsWith('.gltf') || m.type === 'threefile')) || anim.media[0];
                        if (glb) {
                            path = glb.filepad;
                            console.log(`[NPC ANIM] Found path via media relation for ${anim.label || anim.name}: ${path}`);
                        }
                    }

                    if (!path) return;

                    const animUrl = resolveAssetUrl(path);
                    try {
                        const animGltf = await new Promise((res, rej) => animLoader.load(animUrl, res, undefined, rej));
                        if (animGltf.animations?.length > 0) {
                            const clip = animGltf.animations[0];
                            const actionKey = getMixerKey(anim, clip.name);
                            console.log(`[NPC ANIM DEBUG] NPC ${p.name}: Assigned '${actionKey}' for clip '${clip.name}' (External)`);

                            npcActions[actionKey] = mixer.clipAction(clip);
                        }
                    } catch (e) {
                        console.warn(`[NPC ANIM] Failed to load anim for ${p.name}: ${animUrl}`, e);
                    }
                }));
            }

            // 2. Fallback/Supplement with Embedded Animations
            if (gltf.animations?.length > 0) {
                if (!mixer) mixer = new THREE.AnimationMixer(mesh);
                gltf.animations.forEach(clip => {
                    const name = clip.name.toLowerCase();
                    const actionKey = getMixerKey(null, clip.name);
                    console.log(`[NPC ANIM DEBUG] NPC ${p.name}: Assigned '${actionKey}' for clip '${clip.name}' (Embedded)`);

                    if (actionKey && !npcActions[actionKey]) {
                        npcActions[actionKey] = mixer.clipAction(clip);
                    }
                });
            }

            if (npcActions.idle) npcActions.idle.play();

            spawnedNPCs[p.id] = {
                id: p.id,
                name: p.name,
                mesh: mesh,
                mixer: mixer,
                actions: npcActions,
                behavior_id: sp.behavior_id || sp.behaviorId || null,
                targetPos: new THREE.Vector3(spawnPos.x, spawnPos.y, spawnPos.z),
                targetRotation: null,
                isWalking: false
            };
            npcModes[p.id] = 'IDLE';


            mesh.traverse(child => {
                child.userData.isCharacter = true;
                if (child.isLight) child.visible = false;
                if (child.isMesh) child.castShadow = true;
            });


        } catch (e) {
            console.error("Failed to spawn NPC", sp.personage ?.name, e);
        }
    }
};

// Watchers for real-time scaling

watch(characterScale, (newScale) => {
    if (playableCharacter) {
        playableCharacter.scale.set(newScale, newScale, newScale);
    }
});

watch(vehicleScale, (newScale) => {
    if (vehicle) {
        vehicle.scale.set(newScale, newScale, newScale);
    }
});

const onMapClick = (e) => {
    const timeSinceDialogue = Date.now() - lastDialogueCloseTime.value;
    if (activeDialogue.value || timeSinceDialogue < 300) return;

    // Check if clicking UI elements
    if (e.target.closest('.dialogue-layer') || e.target.closest('.npc-dialogue-box') || e.target.closest('.options-container')) {
        return;
    }

    if (!playableCharacter || !landingDone.value) return;


    const rect = renderer.domElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const mouseX = ((e.clientX - rect.left) / w) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / h) * 2 + 1;

    // 1. Detect Gateway Click (Screen Space -> Image Space Mapping)
    let screenX, screenY;

    if (isEngine.value) {
        // Handle object-fit: cover mapping
        const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
        const fullW = VIEW_WIDTH * scale;
        const fullH = VIEW_HEIGHT * scale;
        const offsetX = (fullW - w) / 2;
        const offsetY = (fullH - h) / 2;

        const imgX = (e.clientX - rect.left + offsetX) / scale;
        const imgY = (e.clientY - rect.top + offsetY) / scale;

        screenX = (imgX / VIEW_WIDTH) * 100;
        screenY = (imgY / VIEW_HEIGHT) * 100;
        console.log(`[CLICK DEBUG] Engine Mode. Screen: ${screenX.toFixed(2)}%, ${screenY.toFixed(2)}%`);
    } else {
        // Standard mapping (fixed aspect container)
        screenX = (mouseX + 1) / 2 * 100;
        screenY = -(mouseY - 1) / 2 * 100;
        console.log(`[CLICK DEBUG] Standard Mode. Screen: ${screenX.toFixed(2)}%, ${screenY.toFixed(2)}%`);
    }

    const clickedGateway = currentGateways.value ?.find(gw => {
        const hit = screenX >= gw.x && screenX <= gw.x + gw.width &&
        screenY >= gw.y && screenY <= gw.y + gw.height;
        if (hit) console.log(`[CLICK DEBUG] Hit Gateway: ${gw.label || gw.target_scene_id}`);
        return hit;
    });

    // 2. Navigation Target Detection
    let moveTarget = null;

    // A. Priority: Floor Raycasting
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter out characters AND helpers
    const validIntersects = intersects.filter(i =>
        !i.object.userData.isCharacter &&
        !i.object.userData.isHelper
    );

    const floorIntersect = validIntersects.find(i =>
        i.object.name.toLowerCase().includes('floor') ||
        i.object.name.toLowerCase().includes('plane') ||
        i.object.isMesh
    );

    if (floorIntersect) {
        moveTarget = floorIntersect.point.clone();
    } else if (clickedGateway) {
        // B. Fallback: Nearest Spawnpoint (ONLY if a gateway was clicked but no floor detected)
        // Project all known 3D spawnpoints to 2D and find the one closest to the click
        if (currentSpawnPoints.value && currentSpawnPoints.value.length > 0) {
            let nearest = null;
            let minDist = Infinity;

            console.log(`[CLICK DEBUG] Fallback: Searching nearest 3D spawnpoint for gateway: ${clickedGateway.label}`);

            currentSpawnPoints.value.forEach(p => {
                const vec = new THREE.Vector3(p.x, p.y, p.z);
                vec.project(camera);

                let wpX, wpY;
                if (isEngine.value) {
                    const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
                    const fullW = VIEW_WIDTH * scale;
                    const fullH = VIEW_HEIGHT * scale;
                    const offsetX = (fullW - w) / 2;
                    const offsetY = (fullH - h) / 2;

                    const pixelX = (vec.x + 1) / 2 * w;
                    const pixelY = -(vec.y - 1) / 2 * h;

                    wpX = ((pixelX + offsetX) / scale) / VIEW_WIDTH * 100;
                    wpY = ((pixelY + offsetY) / scale) / VIEW_HEIGHT * 100;
                } else {
                    wpX = (vec.x + 1) / 2 * 100;
                    wpY = -(vec.y - 1) / 2 * 100;
                }

                const d = Math.sqrt(Math.pow(screenX - wpX, 2) + Math.pow(screenY - wpY, 2));
                if (d < minDist) {
                    minDist = d;
                    nearest = p;
                }
            });

            if (nearest) {
                console.log(`[CLICK DEBUG] Fallback Hit: Closest point is '${nearest.name || nearest.type}' at dist ${minDist.toFixed(2)}%`);
                moveTarget = new THREE.Vector3(nearest.x, nearest.y, nearest.z);
            }
        }
    }


    // 3. Apply Navigation & Gateway logic
    if (moveTarget) {
        console.log(`[CLICK DEBUG] Moving to ${moveTarget.x.toFixed(2)}, ${moveTarget.y.toFixed(2)}, ${moveTarget.z.toFixed(2)}. PendingGW: ${clickedGateway ? 'YES' : 'NO'}`);
        targetPosition.copy(moveTarget);
        isWalking.value = true;
        pendingGateway.value = clickedGateway || null;

        // Capture direction if we clicked a spawnpoint (direct or fallback)
        // 'nearest' might be set from the fallback logic above
        if (typeof nearest !== 'undefined' && nearest && (nearest.direction !== undefined || nearest.rotation !== undefined)) {
            targetRotation.value = nearest.direction ?? nearest.rotation ?? null;
            console.log(`[CLICK DEBUG] Captured target rotation: ${targetRotation.value}`);
        } else {
            targetRotation.value = null;
        }

        if (targetPointMesh) {
            targetPointMesh.position.copy(targetPosition);
            targetPointMesh.position.y += 0.01;
            targetPointMesh.visible = true;
        }
    } else {
        console.log(`[CLICK DEBUG] No valid move target found. ClickedGateway: ${clickedGateway ? 'YES' : 'NO'}`);
        // Explicitly clear if clicking "outside" everything
        pendingGateway.value = null;
        targetRotation.value = null;
    }
};

const getValidTriggerOutcome = (gw) => {
    if (!gw.triggers || gw.triggers.length === 0) return null;
    const inventory = store.state.game.inventory || [];
    
    return gw.triggers.find(trig => {
        if (trig.condition === 'always') return true;
        const hasClue = inventory.includes(trig.clue_id);
        if (trig.condition === 'has') return hasClue;
        if (trig.condition === 'has-not') return !hasClue;
        return false;
    });
};

const onMouseMove = (e) => {
    if (!renderer || !renderer.domElement) return;

    // Check if over UI elements
    if (e.target.closest('.dialogue-layer') || e.target.closest('.npc-dialogue-box') || e.target.closest('.options-container')) {
        renderer.domElement.style.cursor = 'auto';
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    let screenX, screenY;

    if (isEngine.value) {
        // Handle object-fit: cover mapping (Consistent with onMapClick)
        const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
        const fullW = VIEW_WIDTH * scale;
        const fullH = VIEW_HEIGHT * scale;
        const offsetX = (fullW - w) / 2;
        const offsetY = (fullH - h) / 2;

        const imgX = (e.clientX - rect.left + offsetX) / scale;
        const imgY = (e.clientY - rect.top + offsetY) / scale;

        screenX = (imgX / VIEW_WIDTH) * 100;
        screenY = (imgY / VIEW_HEIGHT) * 100;
    } else {
        // Standard mapping (fixed aspect container)
        const mouseX = ((e.clientX - rect.left) / w) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / h) * 2 + 1;
        screenX = (mouseX + 1) / 2 * 100;
        screenY = -(mouseY - 1) / 2 * 100;
    }

    const hoveredGateway = currentGateways.value ?.find(gw => {
        return screenX >= gw.x && screenX <= gw.x + gw.width &&
               screenY >= gw.y && screenY <= gw.y + gw.height;
    });

    if (hoveredGateway) {
        const validOutcome = getValidTriggerOutcome(hoveredGateway);
        if (validOutcome) {
            const type = validOutcome.type || (validOutcome.target_scene_id ? 'scene' : 'action');
            if (type === 'scene') {
                currentCursor.value = "url('/cursors/direction.svg') 0 0, auto";
            } else {
                currentCursor.value = "url('/cursors/hover.svg') 0 0, auto";
            }
        } else {
            currentCursor.value = "url('/cursors/pointer.svg') 0 0, auto";
        }
    } else {
        currentCursor.value = "url('/cursors/pointer.svg') 0 0, auto";
    }
};



// Dialogue functions extracted to useDialogue

const isSwapping = ref(false);
const blockTriggers = ref(false);

// When the scene changes, we trigger a reload
watch(sceneId, async (newId) => {
    if (newId) {
        console.log(`[DEBUG] Scene ID changed to ${newId}, checking readiness...`);

        // If scene isn't ready yet, onMounted will handle the initial load
        if (!scene) {
            console.log("[DEBUG] Scene not ready, watcher deferring to onMounted.");
            return;
        }

        console.log(`[DEBUG] Scene ID ${newId} reload starting via watcher.`);
        // Reset all states
        isWalking.value = false;
        pendingGateway.value = null;
        lastTriggeredGateway.value = null;
        isSwapping.value = false;
        blockTriggers.value = true;

        // Clear landing status if ID changed (App.vue manages isLanded prop)
        landingDone.value = hasLandedInSession();

        // Cleanup and reload
        // A. Load Visual Elements
        await loadSceneGLB(currentScene.value, targetSpawnPoint.value);

        // check position after reload to ensure we aren't stuck in a loop
        const entryGw = getGatewayAtPosition();
        if (entryGw) lastTriggeredGateway.value = entryGw;

        blockTriggers.value = false;
    }
}, { immediate: true });

const triggerGateway = async (gateway, isForced = false) => {
    // 0. Spam Prevention
    if (!isForced && (lastExecutedBehaviorGateway.value === gateway || lastTriggeredGateway.value === gateway)) {
        return;
    }

    if (isSwapping.value) return;

    const validOutcome = getValidTriggerOutcome(gateway);
    if (!validOutcome) {
        console.log("[DEBUG] No valid outcome for gateway conditions. Skipping.");
        return;
    }

    // Determine type strictly from outcome or fallback to smart detection
    const type = validOutcome.type || (validOutcome.target_scene_id ? 'scene' : 'action');
    console.log(`[DEBUG] triggerGateway executing outcome logic: type=${type}`, validOutcome);

    // 1. Action/Behavior Logic
    if (type === 'action') {
        const targetId = validOutcome.action_id;
        if (targetId && (!isBehaviorActive.value || isForced)) {
            let actors = [];
            const behavior = actions.value.find(g => String(g.id) === String(targetId));

            if (!behavior) {
                console.warn(`[TRIGGER ERROR] Action ID ${targetId} not found.`);
                lastExecutedBehaviorGateway.value = gateway;
                return;
            }

            // Find actors
            if (validOutcome.target_character) {
                const directActor = spawnedNPCs[validOutcome.target_character];
                if (directActor) actors.push(directActor);
            }

            if (actors.length === 0) {
                const spRelation = currentScene.value?.scene_personages || currentScene.value?.npc || [];
                const sceneP = spRelation.filter(sp => String(sp.action_id || sp.behavior_id) === String(targetId));
                const targetIds = sceneP.map(sp => String(sp.personage_id || sp.personageId));
                actors = Object.values(spawnedNPCs).filter(n => targetIds.includes(String(n.id)));
            }

            if (behavior && actors.length > 0) {
                console.log(`[TRIGGER] Executing ${behavior.name} for actors:`, actors.map(a => a.name));
                isBehaviorActive.value = true;
                lastExecutedBehaviorGateway.value = gateway;

                for (const actor of actors) {
                    npcModes[actor.id] = 'SEQUENCE';
                    actor.currentBehavior = behavior.name;
                    actor.activeBehaviorId = behavior.id;
                }

                for (const [index, action] of (behavior.actions || []).entries()) {
                    await Promise.all(actors.map(actor => runAction(action, actor.id)));
                }

                for (const actor of actors) {
                    npcModes[actor.id] = 'IDLE';
                    actor.currentBehavior = null;
                }

                isBehaviorActive.value = false;
            } else {
                console.warn(`[TRIGGER] Behavior ${targetId} not found or no actors found.`);
                lastExecutedBehaviorGateway.value = gateway;
            }
        }
    } 
    // 2. Scene/Gateway Logic
    else if (type === 'scene') {
        const targetSceneId = validOutcome.target_scene_id || gateway.target_scene_id;
        if (!targetSceneId) {
            console.warn("[TRIGGER] Scene transition requested but no target_scene_id found.");
            return;
        }

        if (!isForced && lastTriggeredGateway.value === gateway) return;
        lastTriggeredGateway.value = gateway;

        const targetSpawnPoint = validOutcome.target_spawn_point || gateway.target_spawn_point;

        console.log(`[TRIGGER] Scene Change to ${targetSceneId} at ${targetSpawnPoint}`);

        if (isEngine.value) {
            emit('next-scene', {
                targetSceneId,
                targetSpawnPoint,
                lastTriggeredGatewayId: gateway.id
            });
        } else {
            isSwapping.value = true;
            await swapScene({ target_scene_id: targetSceneId, target_spawn_point: targetSpawnPoint });
            isSwapping.value = false;
        }
    }

    lastTriggeredGateway.value = gateway;
};





// runAction extracted to useDialogue



const getGatewayAtPosition = () => {
    if (!currentScene.value || !currentGateways.value || !playableCharacter || !camera) return null;

    // Sync matrices before projection to ensure accurate coordinates from first frame
    camera.updateMatrixWorld(true);
    playableCharacter.updateMatrixWorld(true);

    // Project character position to screen space
    const vector = playableCharacter.position.clone();
    vector.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    let screenX, screenY;

    if (isEngine.value) {
        // Reverse object-fit: cover mapping for character projection
        const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
        const fullW = VIEW_WIDTH * scale;
        const fullH = VIEW_HEIGHT * scale;
        const offsetX = (fullW - w) / 2;
        const offsetY = (fullH - h) / 2;

        // Convert normalized device coordinates (NDC) to absolute screen pixels
        const pixelX = (vector.x + 1) / 2 * w;
        const pixelY = -(vector.y - 1) / 2 * h;

        // Convert absolute screen pixels to image space (0-100%)
        const imgX = (pixelX + offsetX) / scale;
        const imgY = (pixelY + offsetY) / scale;

        screenX = (imgX / VIEW_WIDTH) * 100;
        screenY = (imgY / VIEW_HEIGHT) * 100;
    } else {
        screenX = (vector.x + 1) / 2 * 100;
        screenY = -(vector.y - 1) / 2 * 100;
    }

    for (const gw of currentGateways.value) {
        if (screenX >= gw.x && screenX <= gw.x + gw.width && screenY >= gw.y && screenY <= gw.y + gw.height) {
            // Check store-based anti-loop FIRST
            if (isEngine.value && storeLastTriggeredId.value && String(gw.id) === String(storeLastTriggeredId.value)) {
                 continue;
            }
            return gw;
        }
    }
    return null;
};

const swapScene = async (gateway) => {
    loading.value = true;
    try {
        let nextScene = null;
        let location = null;

        if (isEngine.value && sectorData.value) {
            nextScene = sectorData.value.scenes.find(s => parseInt(s.id) === parseInt(gateway.target_scene_id));
            if (nextScene) {
                location = nextScene.location;
            }
        }

        if (!nextScene) {
            const nextSceneRes = await fetchRobustData(`scenes/${gateway.target_scene_id}.json`, `scenes/${gateway.target_scene_id}`);
            nextScene = nextSceneRes;
            const locRes = await fetchRobustData(`locations/${nextScene.locatie_id}.json`, `locaties/${nextScene.locatie_id}`);
            location = locRes;
        }

        currentScene.value = { ...nextScene, location: location };

        // Handle nested behavior in swapped scene
        if (currentScene.value.behavior) {
            actions.value = currentScene.value.behavior;
        }

        // Reset states
        isWalking.value = false;
        pendingGateway.value = null;
        lastTriggeredGateway.value = null;
        if (targetPointMesh) targetPointMesh.visible = false;

        // When swapping, landing is already done
        landingDone.value = true;

        await loadSceneGLB(currentScene.value, gateway.target_spawn_point);

        // Anti-loop: check if we spawned inside a gateway in the new scene
        const entryGw = getGatewayAtPosition();
        if (entryGw) {
            console.log("Anti-loop: spawned inside gateway", entryGw);
            lastTriggeredGateway.value = entryGw;
        }
    } catch (e) {
        console.error("Failed to swap scene", e);
    } finally {
        loading.value = false;
    }
};

const checkGateways = () => {
    if (!currentScene.value || !currentGateways.value || !playableCharacter || isSwapping.value || blockTriggers.value) return;

    const found = getGatewayAtPosition();

    if (found) {
        triggerGateway(found);
    } else {
        // Only reset if we were previously in a gateway or if it's not the forced pending one
        if (!pendingGateway.value) {
            lastTriggeredGateway.value = null;
            lastExecutedBehaviorGateway.value = null;
            if (isEngine.value && storeLastTriggeredId.value) {
                store.commit('game/SET_LAST_TRIGGERED_GATEWAY_ID', null);
            }
        }
    }
};



const isActionActive = (gateway, actionIndex) => {
    return Object.values(spawnedNPCs).some(n =>
        String(n.activeBehaviorId) === String(gateway.behavior_id) &&
        n.currentActionIndex === actionIndex
    );
};

const animate = () => {

    animationFrameId = requestAnimationFrame(animate);
    const delta = clock ? clock.getDelta() : 0.016;

    if (characterMixer) {
        characterMixer.update(delta);
    }

    // Update NPC mixers
    Object.values(spawnedNPCs).forEach(npc => {
        if (npc.mixer) npc.mixer.update(delta);

        // Handle NPC movement interpolation
        if (npc.isWalking && npc.mesh) {
            const dist = npc.mesh.position.distanceTo(npc.targetPos);
            if (dist > 0.1) {
                const lookPos = new THREE.Vector3(npc.targetPos.x, npc.mesh.position.y, npc.targetPos.z);
                npc.mesh.lookAt(lookPos);
                const dir = new THREE.Vector3().subVectors(npc.targetPos, npc.mesh.position).normalize();
                npc.mesh.position.add(dir.multiplyScalar(characterSpeed * delta));
                if (npc.actions.walk && !npc.actions.walk.isRunning()) {
                    console.log(`[ANIM] NPC ${npc.name} walking. Actions keys:`, Object.keys(npc.actions));
                    if (npc.actions.idle) npc.actions.idle.stop();
                    npc.actions.walk.play();
                } else if (!npc.actions.walk && !npc._warnedNoWalk) {
                     console.warn(`[ANIM] NPC ${npc.name} has NO 'walk' action. Available:`, Object.keys(npc.actions));
                     npc._warnedNoWalk = true;
                }
            } else {
                npc.isWalking = false;
                if (npc.actions.walk) npc.actions.walk.stop();
                if (npc.actions.idle) npc.actions.idle.play();

                // Apply target rotation if any
                if (npc.targetRotation !== null && npc.mesh) {
                    console.log(`[ANIMATE] Applying NPC target rotation for ${npc.name}: ${npc.targetRotation}`);
                    npc.mesh.rotation.y = THREE.MathUtils.degToRad(npc.targetRotation);
                    npc.targetRotation = null; // Clear after applying
                }
            }
        }
    });

    if (isWalking.value && playableCharacter) {

        const distance = playableCharacter.position.distanceTo(targetPosition);
        if (distance > 0.1) {
            const lookPos = new THREE.Vector3(targetPosition.x, playableCharacter.position.y, targetPosition.z);
            playableCharacter.lookAt(lookPos);
            const direction = new THREE.Vector3().subVectors(targetPosition, playableCharacter.position).normalize();
            playableCharacter.position.add(direction.multiplyScalar(characterSpeed * delta));

            // Continuous check while walking
            checkGateways();
        } else {
            isWalking.value = false;

            // Apply target rotation if any
            if (targetRotation.value !== null && playableCharacter) {
                console.log(`[ANIMATE] Applying target rotation: ${targetRotation.value}`);
                playableCharacter.rotation.y = THREE.MathUtils.degToRad(targetRotation.value);
                targetRotation.value = null; // Clear after applying
            }

            if (targetPointMesh) targetPointMesh.visible = false;

            if (pendingGateway.value) {
                console.log("[ANIMATE DEBUG] Arrived at target. Triggering Pending Gateway.");
                triggerGateway(pendingGateway.value, true); // Force trigger on explicit arrival
                pendingGateway.value = null;
            } else {
                checkGateways();
            }
        }
    } else {
        // Check even when standing if just standing in a gateway
        if (!blockTriggers.value) checkGateways();
    }


    renderer.render(scene, camera);
};

watch(show3DHelpers, (newVal) => {
    if (!currentGltf) return;
    currentGltf.traverse((child) => {
        if (child.isMesh) {
            const isFloor = child.name === 'floor';
            if (isFloor) {
                const oldMat = child.material;
                child.material = newVal
                    ? new THREE.MeshPhongMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
                    : new THREE.ShadowMaterial({ opacity: 0.4 });
                child.receiveShadow = true;
                if (oldMat) oldMat.dispose();
            } else {
                child.material.opacity = newVal ? 0.3 : 0;
                child.material.transparent = newVal; // Use transparent for helpers, opaque for mask
                child.material.colorWrite = newVal;
                // If helpers are off, it's a pure mask
                if (!newVal) {
                    child.material.colorWrite = false;
                }
            }
        }
    });

    // Refresh 3D spawn markers
    if (typeof spawnDebugHelpers === 'function') {
        spawnDebugHelpers(currentSpawnPoints.value);
    }
});

watch(ambientIntensity, (val) => {
    if (ambientLight) ambientLight.intensity = val;
});

watch(sunIntensity, (val) => {
    if (sun) sun.intensity = val;
});

const backgroundImageUrl = computed(() => {
    if (!currentScene.value) return '';

    // 1. Check media relation (new standard)
    if (currentScene.value.media && currentScene.value.media.length > 0) {
        // Look for image/jpeg, image/png, or just not .glb
        const img = currentScene.value.media.find(m =>
            m.filepad &&
            (m.filepad.endsWith('.jpg') || m.filepad.endsWith('.png') || m.filepad.endsWith('.webp'))
        );
        if (img) return resolveAssetUrl(img.filepad);
    }

    // 2. Legacy Fallback (artwork property)
    if (currentScene.value.artwork && currentScene.value.artwork.length > 0) {
        return resolveAssetUrl(currentScene.value.artwork[0].bestandspad);
    }

    // 3. Fallback to location artwork (if legacy location data still exists)
    if (currentScene.value.location ?.artwork && currentScene.value.location.artwork.length > 0) {
        return resolveAssetUrl(currentScene.value.location.artwork[0].bestandspad);
    }

    return '';
});

const gatewaysToDraw = computed(() => {
    return currentGateways.value;
});

const debugOverlayStyle = computed(() => {
    const w = containerWidth.value;
    const h = containerHeight.value;

    // Logic from onMapClick/updateDimensions for object-fit: cover
    const scale = Math.max(w / VIEW_WIDTH, h / VIEW_HEIGHT);
    const fullW = VIEW_WIDTH * scale;
    const fullH = VIEW_HEIGHT * scale;
    const offsetX = (fullW - w) / 2;
    const offsetY = (fullH - h) / 2;

    return {
        position: 'absolute',
        width: `${fullW}px`,
        height: `${fullH}px`,
        left: `${-offsetX}px`,
        top: `${-offsetY}px`,
        pointerEvents: 'none',
        zIndex: 100
    };
});
</script>
<template>
    <div class="scene-container" :style="[containerStyle, { cursor: currentCursor }]" @click="onMapClick" @mousemove="onMouseMove">

        <img v-if="backgroundImageUrl" :src="backgroundImageUrl" class="scene-background" alt="Background" />

        <div ref="canvasContainer" class="three-canvas-container"></div>

        <div v-if="!landingDone" class="landing-overlay">
            system_init_landing
        </div>

        <!-- Debug Overlay Layer -->
        <div v-if="show3DHelpers" class="debug-ui-overlay" :style="debugOverlayStyle">
            <svg class="debug-svg" :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`" preserveAspectRatio="none">
                <g v-for="(gw, idx) in gatewaysToDraw" :key="idx">
                    <rect
                        :x="(gw.x / 100) * VIEW_WIDTH"
                        :y="(gw.y / 100) * VIEW_HEIGHT"
                        :width="(gw.width / 100) * VIEW_WIDTH"
                        :height="(gw.height / 100) * VIEW_HEIGHT"
                        class="debug-gateway-rect"
                    />
                    <text
                        :x="(gw.x / 100) * VIEW_WIDTH + 5"
                        :y="(gw.y / 100) * VIEW_HEIGHT + 15"
                        class="debug-gateway-label"
                    >
                        GW: {{ gw.label || 'AUTO' }} -> {{ gw.target_scene_id }}
                    </text>
                </g>
            </svg>
        </div>

        <div v-if="activeDialogue" class="dialogue-layer">
            <div class="dialogue-content">
                <!-- NPC Dialogue Box -->
                <transition name="fade">
                    <div v-if="typewriterText" class="npc-dialogue-box" @click.stop>
                        <div class="npc-name">
                            {{ dialogueNPCName || 'contact' }}
                        </div>
                        <div class="dialogue-text">
                            {{ typewriterText }}<span class="text-cursor">_</span>
                        </div>
                    </div>
                </transition>
                <!-- Player Options -->
                <transition name="slide-up">
                    <div v-if="showDialogueOptions" class="options-container">
                        <button v-for="(option, idx) in optionsToDisplay" :key="idx" @click.stop="selectOption(option)" class="option-button">
                            <div class="option-text-wrapper">
                                <span class="option-number">[{{ String(idx + 1).padStart(2, '0') }}]</span>
                                <span class="option-label">{{ option.text }}</span>
                            </div>
                            <span class="option-hint">select_response >></span>
                        </button>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-container {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #000;
    overflow: hidden;
    margin: 0;
    padding: 0;
}

.debug-ui-overlay {
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
}

.debug-svg {
    width: 100%;
    height: 100%;
}

.debug-gateway-rect {
    fill: rgba(255, 0, 255, 0.2);
    stroke: #ff00ff;
    stroke-width: 2;
    stroke-dasharray: 4 2;
}

.debug-gateway-label {
    fill: #ff00ff;
    font-size: 10px;
    font-family: monospace;
    font-weight: bold;
    text-transform: uppercase;
}

/* In engine mode, remove borders and margins for a cleaner look */
:where(.scene-container) {
    --noir-border-width: 4px;
}

.scene-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
}

.three-canvas-container {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    z-index: 10;
    cursor: inherit;
}

.landing-overlay {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background-color: rgba(0, 0, 0, 0.6);
    color: #00ffcc;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    border: 1px solid rgba(0, 255, 204, 0.3);
    animation: animate-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.dialogue-layer {
    position: absolute;
    left: 0;
    right: 0;
    /*bottom: 1rem;*/
    top: 55%;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    padding-left: 3rem;
    padding-right: 3rem;
    padding-bottom: 2rem;
}

.dialogue-content {
    max-width: 48rem; /* 3xl */
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.npc-dialogue-box {
    width: 100%;
    background-color: rgba(10, 10, 10, 0.85); /* noir-panel */
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 255, 204, 0.3);
    padding: 1.5rem;
    border-radius: 0.5rem;
    pointer-events: auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.8);
}

.npc-name {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: #00ffcc;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}

.dialogue-text {
    color: #fff;
    font-size: 1.25rem;
    line-height: 1.625;
    font-weight: 300;
    font-style: italic;
}

.text-cursor {
    animation: animate-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    opacity: 0.5;
}

.options-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    width: 100%;
    max-width: 36rem; /* xl */
    pointer-events: auto;
}

.option-button {
    width: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(0, 255, 204, 0.2);
    padding: 0.75rem 1.5rem;
    border-radius: 0.25rem;
    text-align: left;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.option-button:hover {
    background-color: rgba(0, 255, 204, 0.2);
    border-color: rgba(0, 255, 204, 0.6);
}

.option-text-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.option-number {
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: rgba(0, 255, 204, 0.4);
}

.option-button:hover .option-number {
    color: #00ffcc;
}

.option-label {
    color: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.option-hint {
    font-size: 8px;
    color: #00ffcc;
    opacity: 0;
    transition-property: opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    text-align: right;
}

.option-button:hover .option-hint {
    opacity: 1;
}

@keyframes animate-pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: .5;
    }
}

:deep(canvas) {
    background: transparent !important;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>
