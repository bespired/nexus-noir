import { ref, reactive, computed } from 'vue';
import * as THREE from 'three';

/**
 * Composable for handling dialogue and action logic in WalkableAreaScene
 */
export function useDialogue({
    isEngine,
    playableCharacter,
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
    targetPointMesh,
    emit,
    resolveAssetUrl,
    swapScene,
    gameState,
    allPersonages,
    settings,
    allDialogs // Added
}) {
    const activeDialogue = ref(null);
    const currentNodeId = ref('start');
    const typewriterText = ref('');
    const showDialogueOptions = ref(false);
    const typewriterInterval = ref(null);
    const dialogueNPCName = ref('');
    let dialogueResolve = null;

    const findNode = (nodeId) => {
        const nodes = activeDialogue.value?.tree?.nodes;
        if (!nodes) return null;
        if (Array.isArray(nodes)) {
            const node = nodes.find(n => String(n.id) === String(nodeId));
            if (!node) console.warn(`[DIALOGUE STANDARDS] Node ID '${nodeId}' not found in nodes array.`);
            return node;
        }
        console.warn(`[DIALOGUE STANDARDS] nodes structure is NOT an array. Please update the dialogue editor.`);
        return nodes[nodeId];
    };

    const startDialogue = (dialoogId) => {
        return new Promise(async (resolve) => {
            try {
                dialogueResolve = resolve;

                // 1. Look in store-provided dialogues first (modern way)
                let res = allDialogs.value?.find(d => String(d.id) === String(dialoogId));

                // 2. Fallback to global window object (Engine compat)
                if (!res && window.importedDialogs) {
                    res = window.importedDialogs.find(d => String(d.id) === String(dialoogId));
                }

                if (!res) {
                    throw new Error(`Dialogue ID ${dialoogId} not found in store or local cache.`);
                }

                activeDialogue.value = res;
                dialogueNPCName.value = activeDialogue.value.personage?.name || activeDialogue.value.title || 'NPC';

                // 3. Stop player movement
                isWalking.value = false;

                const nodes = activeDialogue.value.tree?.nodes || [];

                // Developer Alerts for legacy structures
                if (Array.isArray(nodes) && nodes.some(n => n.options)) {
                    console.warn("[DIALOGUE STANDARDS] Legacy 'options' field found in nodes. Use 'answers' instead.");
                }

                let startNodeId = activeDialogue.value.tree?.startNodeId;

                if (!startNodeId) {
                    console.warn("[DIALOGUE STANDARDS] No 'startNodeId' found in tree. Falling back to 'root' or first node.");
                    if (Array.isArray(nodes)) {
                        const rootNode = nodes.find(n => n.id === 'root' || n.type === 'root' || n.id === 'start');
                        startNodeId = rootNode ? rootNode.id : (nodes[0]?.id || 0);
                    } else {
                        const nodeKeys = Object.keys(nodes);
                        startNodeId = nodeKeys.includes('root') ? 'root' : (nodeKeys.includes('start') ? 'start' : nodeKeys[0]);
                    }
                }

                currentNodeId.value = startNodeId;

                console.log(`[DIALOGUE] Starting dialogue ${dialoogId} at node: ${currentNodeId.value}`);

                if (currentNodeId.value !== null) {
                    playNode(currentNodeId.value);
                } else {
                    console.warn("[DIALOGUE] No nodes found in dialogue tree.");
                    closeDialogue();
                }
            } catch (e) {
                console.error("Failed to load dialogue", e);
                resolve();
            }
        });
    };

    const playNode = async (nodeId) => {
        console.log(`[DIALOGUE DEBUG] playNode called for ID: ${nodeId}`);
        const node = findNode(nodeId);
        if (!node) {
            console.error(`[DIALOGUE STANDARDS] Node '${nodeId}' not found.`);
            return;
        }

        currentNodeId.value = nodeId;
        showDialogueOptions.value = false;

        // Execute node-level actions
        let nodeActions = node.actions || node.nodeActions || [];
        // Support single action string
        if (node.action && typeof node.action === 'string') {
            nodeActions = [...nodeActions, {
                type: node.action,
                value: node.action_value || node.clue_id || node.id
            }];
        }

        if (nodeActions.length > 0) {
            console.log(`[DIALOGUE] Executing ${nodeActions.length} actions for node ${nodeId}`);
            for (const action of nodeActions) {
                await runAction(action);
            }
        }

        typewriterText.value = '';
        if (typewriterInterval.value) clearInterval(typewriterInterval.value);
        let charIndex = 0;
        const fullText = node.text || '';
        console.log(`[DIALOGUE DEBUG] Typing text (${fullText.length} chars)`);

        typewriterInterval.value = setInterval(() => {
            if (fullText[charIndex]) {
                typewriterText.value += fullText[charIndex];
            }
            charIndex++;
            if (charIndex >= fullText.length) {
                clearInterval(typewriterInterval.value);
                console.log(`[DIALOGUE DEBUG] Typing finished. Options found: ${node.options?.length || 0}`);
                showDialogueOptions.value = true;
            }
        }, 30);
    };

    const selectOption = async (option, actorId = null) => {
        // Enforce standards: strictly kebab-case action and strictly 'answers' logic
        if (option.options) {
            console.error("[DIALOGUE STANDARDS] Sub-options found using 'options' key. Use 'answers' instead.");
        }

        const optActions = option.actions || (option.action ? [{
            type: option.action,
            value: option.action_value || option.clue_id
        }] : []);

        if (optActions.length > 0) {
            for (const action of optActions) {
                await runAction(action, actorId);
            }
        }

        const next = option.next_node;
        if (!next && option.next) {
            console.error("[DIALOGUE STANDARDS] Answer uses 'next' instead of 'next_node'.");
        }

        if (next && next !== '_end') {
            playNode(next);
        } else {
            closeDialogue();
        }
    };

    const closeDialogue = () => {
        activeDialogue.value = null;
        currentNodeId.value = 'start';
        typewriterText.value = '';
        showDialogueOptions.value = false;
        if (typewriterInterval.value) clearInterval(typewriterInterval.value);
        if (dialogueResolve) {
            dialogueResolve();
            dialogueResolve = null;
        }
    };

    const runAction = async (action, actorId = null) => {
        let type = action.type;
        // Internal Mapping for Legacy Constants
        const legacyMap = {
            'WALK_TO_POSITION': 'walk-to',
            'LOOK_AT_TARGET': 'look-at',
            'GIVE_CLUE': 'give-clue',
            'GOTO_SCENE': 'goto-scene',
            'IDLE_WAIT': 'idle-wait',
            'START_DIALOGUE': 'start-dialogue',
            'START DIALOG': 'start-dialogue',
            'PLAY_ANIMATION': 'play-animation',
            'END TALK': 'end'
        };

        if (legacyMap[type]) {
            console.error(`[LEGACY ACTION ALERT] Action type '${type}' is outdated. Please resave this action/dialogue in the editor to update it to '${legacyMap[type]}'.`);
            type = legacyMap[type];
        }

        // Prioritize modern 'data' structure
        const params = action.data || action.params || {};
        const value = action.value;
        const targetActor = actorId ? spawnedNPCs[actorId] : null;

        console.log(`[ACTION] Running ${type} for ${actorId || 'player'}`, params);

        switch (type) {
            case 'give-clue':
                const clueId = value || params.clue_id || params.id;
                emit('give-clue', clueId);
                break;

            case 'IDLE_WAIT':
                const duration = parseFloat(params.duration || value || 2);
                console.log(`[ACTION] Waiting for ${duration}s`);
                await new Promise(res => setTimeout(res, duration * 1000));
                break;

            case 'walk-to':
                // Handle complex object from modern editor (params.spawnpoint is { label, value, type })
                let spName = params.spawnpoint || params.spawn_point || value;

                // Debug what we received
                console.log(`[ACTION DEBUG] SP Raw:`, spName);

                if (typeof spName === 'object' && spName !== null && spName.value) {
                    spName = spName.value;
                }

                console.log(`[ACTION DEBUG] SP Resolved Name: '${spName}'`);

                if (spName) {
                    const currentSectorId = sectorId.value;
                    let spawnPoints = currentScene.value['3d_spawnpoints'] || [];

                    // Fallback to legacy location points if needed
                    if (spawnPoints.length === 0 && currentScene.value.location?.spawn_points) {
                        const locSpawnPoints = currentScene.value.location.spawn_points || {};
                        const locPoints = locSpawnPoints[currentSectorId] || locSpawnPoints[Number(currentSectorId)] || [];
                        if (locPoints.length > 0) spawnPoints = [...locPoints];
                    }

                    // Find spawn point (exact ID or Case-Insensitive Name)
                    const sp = spawnPoints.find(p =>
                        String(p.id) === String(spName) ||
                        p.name === spName ||
                        (p.name && p.name.toLowerCase() === spName.toLowerCase())
                    );

                    if (sp) {
                        console.log(`[ACTION] Walking to ${sp.name} (${sp.x},${sp.y},${sp.z})`);
                        if (targetActor) {
                            targetActor.targetPos.set(sp.x, sp.y, sp.z);
                            targetActor.targetRotation = sp.direction ?? sp.rotation ?? null;
                            targetActor.isWalking = true;

                            // Ensure animation plays
                            if (targetActor.actions && targetActor.actions.walk) {
                                targetActor.actions.walk.play();
                            }

                            await new Promise(resolve => {
                                const check = setInterval(() => {
                                    if (!targetActor.isWalking) {
                                        clearInterval(check);
                                        resolve();
                                    }
                                }, 100);
                            });
                        } else if (actorId === null && playableCharacter.value) {
                            // Player Logic
                            targetPosition.set(sp.x, sp.y, sp.z);
                            targetRotation.value = sp.direction ?? sp.rotation ?? null;
                            isWalking.value = true;
                            await new Promise(resolve => {
                                const check = setInterval(() => {
                                    if (!isWalking.value) {
                                        clearInterval(check);
                                        resolve();
                                    }
                                }, 100);
                            });
                        }
                    } else {
                        console.warn(`[ACTION ERROR] Spawnpoint '${spName}' not found.`);
                    }
                } else {
                    console.warn("[ACTION ERROR] No spawnpoint specified.");
                }
                break;

            case 'start-dialogue':
                const dialId = params.dialog_id || params.dialoog_id || value;
                if (dialId) await startDialogue(dialId);
                break;

            case 'play-animation':
                const animName = params.animation || value;
                // ... rest of animation logic handled below or identical ... 
                if (targetActor && targetActor.actions[animName]) {
                    const nextAction = targetActor.actions[animName];
                    nextAction.reset().play();
                    await new Promise(res => setTimeout(res, 500));
                }
                break;
            case 'look-at':
                const subjectId = params.subject_id || 'OWNER';
                const targetId = params.target_id || params.target || value || 'PLAYER';

                let resolvedSubject = null;
                let resolvedTargetPos = null;

                // 1. Resolve Subject (Who is looking)
                if (subjectId === 'PLAYER') {
                    resolvedSubject = playableCharacter.value;
                } else {
                    const npcId = (subjectId === 'OWNER') ? (actorId || activeDialogue.value?.personage_id) : subjectId;
                    const subjectNpc = spawnedNPCs[npcId] || Object.values(spawnedNPCs).find(n =>
                        n.name.toLowerCase() === String(npcId).toLowerCase() ||
                        String(n.id) === String(npcId)
                    );
                    resolvedSubject = subjectNpc?.mesh;
                }

                // 2. Resolve Target Position (At whom)
                if (targetId === 'PLAYER') {
                    if (playableCharacter.value) resolvedTargetPos = playableCharacter.value.position.clone();
                } else if (targetId === 'OWNER') {
                    const ownerId = actorId || activeDialogue.value?.personage_id;
                    if (spawnedNPCs[ownerId]) resolvedTargetPos = spawnedNPCs[ownerId].mesh.position.clone();
                } else {
                    const otherNpc = Object.values(spawnedNPCs).find(n =>
                        n.name.toLowerCase() === String(targetId).toLowerCase() ||
                        String(n.id) === String(targetId)
                    );
                    if (otherNpc && otherNpc.mesh) {
                        resolvedTargetPos = otherNpc.mesh.position.clone();
                    }
                }

                // 3. Execute
                if (resolvedSubject && resolvedTargetPos) {
                    const lookVector = new THREE.Vector3(resolvedTargetPos.x, resolvedSubject.position.y, resolvedTargetPos.z);
                    resolvedSubject.lookAt(lookVector);
                    console.log(`[ACTION] ${subjectId} looked at ${targetId}`);
                    await new Promise(res => setTimeout(res, 300));
                } else {
                    console.warn(`[ACTION] look-at failed: Subject(${subjectId}) found: ${!!resolvedSubject}, Target(${targetId}) found: ${!!resolvedTargetPos}`);
                }
                break;

            case 'goto-scene':
                const scId = value || params.scene_id;
                if (scId && swapScene) await swapScene({ target_scene_id: parseInt(scId) });
                break;

            case 'end':
                closeDialogue();
                break;
        }
    };

    const optionsToDisplay = computed(() => {
        const node = findNode(currentNodeId.value);
        if (node?.options) {
            console.warn("[DIALOGUE STANDARDS] Node contains legacy 'options' field. Use 'answers' instead.");
        }
        return node?.answers || node?.options || [];
    });

    return {
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
    };
}
