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
            return nodes.find(n => String(n.id) === String(nodeId)) || nodes[nodeId];
        }
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

                // Turn player towards NPC
                if (playableCharacter.value && activeDialogue.value.personage_id) {
                    const speakerId = activeDialogue.value.personage_id;
                    const speaker = spawnedNPCs[speakerId];
                    if (speaker && speaker.mesh) {
                        const targetPos = speaker.mesh.position.clone();
                        targetPos.y = playableCharacter.value.position.y; // Lock Y
                        playableCharacter.value.lookAt(targetPos);
                        console.log(`[DIALOGUE] Player turning to face speaker ${speakerId}`);
                    }
                }

                const nodes = activeDialogue.value.tree?.nodes || {};
                let startNodeId = null;

                if (Array.isArray(nodes)) {
                    const rootNode = nodes.find(n => n.id === 'root' || n.type === 'root' || n.id === 'start');
                    startNodeId = rootNode ? rootNode.id : (nodes[0]?.id || 0);
                } else {
                    const nodeKeys = Object.keys(nodes);
                    startNodeId = nodeKeys.includes('root') ? 'root' : (nodeKeys.includes('start') ? 'start' : nodeKeys[0]);
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
        if (nodeId === '[END]' || nodeId === 'END') {
            console.log("[DIALOGUE] Ending dialogue.");
            closeDialogue();
            return;
        }

        console.log(`[DIALOGUE DEBUG] playNode called for ID: ${nodeId}`);
        const node = findNode(nodeId);
        if (!node) {
            console.warn(`[DIALOGUE] Node ${nodeId} not found.`);
            console.log(`[DIALOGUE DEBUG] Available nodes:`, activeDialogue.value?.tree?.nodes);
            return;
        }

        currentNodeId.value = nodeId;
        showDialogueOptions.value = false;

        // Execute node-level actions
        let nodeActions = node.actions || node.nodeActions || [];
        // Support single action string
        if (node.action && typeof node.action === 'string') {
            nodeActions = [...nodeActions, { type: node.action }];
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
        // Handle actions (array) or action (string)
        const optActions = option.actions || (option.action ? [{ type: option.action }] : []);

        if (optActions.length > 0) {
            for (const action of optActions) {
                await runAction(action, actorId);
            }
        }
        if (optActions.some(a => a.type === 'END TALK' || a.type === 'end')) {
            closeDialogue();
            return;
        }
        const next = option.next || option.next_node;
        if (next && next !== '_end' && next !== 'END' && next !== '[END]') {
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
        const type = action.type;
        // Prioritize modern 'data' structure
        const params = action.data || action.params || {};
        const value = action.value;
        const targetActor = actorId ? spawnedNPCs[actorId] : null;

        console.log(`[ACTION] Running ${type} for ${actorId || 'player'}`, params);

        switch (type) {
            case 'GIVE_CLUE':
                const clueId = value || params.clue_id || params.id;
                emit('give-clue', clueId);
                break;

            case 'IDLE_WAIT':
                const duration = parseFloat(params.duration || value || 2);
                console.log(`[ACTION] Waiting for ${duration}s`);
                await new Promise(res => setTimeout(res, duration * 1000));
                break;

            case 'WALK_TO_POSITION':
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

            case 'START_DIALOGUE':
            case 'START DIALOG':
                const dialId = params.dialog_id || params.dialoog_id || value;
                if (dialId) await startDialogue(dialId);
                break;

            case 'PLAY_ANIMATION':
                const animName = params.animation || value;
                // ... rest of animation logic handled below or identical ... 
                if (targetActor && targetActor.actions[animName]) {
                    const nextAction = targetActor.actions[animName];
                    nextAction.reset().play();
                    await new Promise(res => setTimeout(res, 500));
                }
                break;
            case 'LOOK_AT_TARGET':
                const lookTargetName = params.target || value || 'player';
                let lookAtPos = null;

                if (lookTargetName === 'player' && playableCharacter.value) {
                    lookAtPos = playableCharacter.value.position.clone();
                } else {
                    const otherNpc = Object.values(spawnedNPCs).find(n =>
                        n.name.toLowerCase() === lookTargetName.toLowerCase() ||
                        String(n.id) === String(lookTargetName)
                    );
                    if (otherNpc && otherNpc.mesh) {
                        lookAtPos = otherNpc.mesh.position.clone();
                    }
                }

                if (targetActor && targetActor.mesh && lookAtPos) {
                    const normalizedLookAt = new THREE.Vector3(lookAtPos.x, targetActor.mesh.position.y, lookAtPos.z);
                    targetActor.mesh.lookAt(normalizedLookAt);
                    await new Promise(res => setTimeout(res, 300));
                }
                break;

            case 'GOTO_SCENE':
                const scId = value || params.scene_id;
                if (scId && swapScene) await swapScene({ target_scene_id: parseInt(scId) });
                break;
        }
    };

    const optionsToDisplay = computed(() => {
        const node = findNode(currentNodeId.value);
        // Support both 'options' and 'answers' keys
        const opts = node?.options || node?.answers || [];
        console.log(`[DIALOGUE DEBUG] optionsToDisplay for node ${currentNodeId.value}:`, opts.length);
        return opts;
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
