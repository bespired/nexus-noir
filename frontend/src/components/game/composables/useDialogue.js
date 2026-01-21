import { ref, reactive } from 'vue';
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
    settings
}) {
    const activeDialogue = ref(null);
    const currentNodeId = ref('start');
    const typewriterText = ref('');
    const showDialogueOptions = ref(false);
    const typewriterInterval = ref(null);
    const dialogueNPCName = ref('');
    let dialogueResolve = null;

    // Helper for fetching data (matching logic in WalkableAreaScene)
    const fetchRobustData = async (path, alt) => {
        try {
            const res = await fetch(`/api/${path}`);
            if (!res.ok) throw new Error(`API fail: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`Fetch failed for ${path}, trying ${alt}`, e);
            if (alt) {
                const res = await fetch(`/api/${alt}`);
                if (!res.ok) throw new Error(`API fallback fail: ${res.status}`);
                return await res.json();
            }
            throw e;
        }
    };

    const startDialogue = (dialoogId) => {
        return new Promise(async (resolve) => {
            try {
                dialogueResolve = resolve;

                let res;
                // Note: importedDialogs is assumed to be global or available in window scope if not passed
                const globalImportedDialogs = window.importedDialogs || null;

                if (isEngine.value && globalImportedDialogs) {
                    res = globalImportedDialogs.find(d => String(d.id) === String(dialoogId));
                }

                if (!res) {
                    res = await fetchRobustData(`dialogues/${dialoogId}.json`, `dialogen/${dialoogId}`);
                }

                activeDialogue.value = res;
                dialogueNPCName.value = activeDialogue.value.personage?.name || 'NPC';

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

                const nodeKeys = Object.keys(activeDialogue.value.tree?.nodes || {});
                currentNodeId.value = nodeKeys.includes('root') ? 'root' : nodeKeys[0];

                console.log(`[DIALOGUE] Starting dialogue ${dialoogId} at node: ${currentNodeId.value}`);

                if (currentNodeId.value) {
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
            closeDialogue();
            return;
        }

        const node = activeDialogue.value.tree.nodes[nodeId];
        if (!node) {
            console.warn(`[DIALOGUE] Node ${nodeId} not found.`);
            return;
        }

        currentNodeId.value = nodeId;
        showDialogueOptions.value = false;

        // Execute node-level actions
        const nodeActions = node.actions || node.nodeActions || [];
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
        typewriterInterval.value = setInterval(() => {
            if (fullText[charIndex]) {
                typewriterText.value += fullText[charIndex];
            }
            charIndex++;
            if (charIndex >= fullText.length) {
                clearInterval(typewriterInterval.value);
                showDialogueOptions.value = true;
            }
        }, 30);
    };

    const selectOption = async (option, actorId = null) => {
        if (option.actions?.length > 0) {
            for (const action of option.actions) {
                await runAction(action, actorId);
            }
        }
        if (option.actions?.some(a => a.type === 'END TALK')) {
            closeDialogue();
            return;
        }
        if (option.next) playNode(option.next);
        else closeDialogue();
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
        const params = action.params || {};
        const value = action.value;
        const targetActor = actorId ? spawnedNPCs[actorId] : null;

        console.log(`Running action ${type} for ${actorId || 'player'}`);

        switch (type) {
            case 'GIVE CLUE':
            case 'GEEF AANWIJZING':
                const clueId = value || params.clue_id || params.id;
                console.log(`[ACTION] Emitting give-clue for: ${clueId}`);
                emit('give-clue', clueId);
                break;
            case 'SET GAME TAG':
                const tag = value || params.tag;
                if (tag && !gameState.tags.includes(tag)) {
                    gameState.tags.push(tag);
                    console.log("tag_acquired");
                }
                break;
            case 'REMOVE GAME TAG':
                const rtag = value || params.tag;
                gameState.tags = gameState.tags.filter(t => t !== rtag);
                break;
            case 'WAIT':
            case 'WAIT x SECONDS':
            case 'idle':
                const duration = parseFloat(params.duration || value || 2);
                await new Promise(res => setTimeout(res, duration * 1000));
                break;
            case 'WALK TO SPAWNPOINT':
            case 'walk_to':
            case 'WALK_TO':
                const spName = params.spawn_point || value;
                if (spName) {
                    const currentSectorId = sectorId.value;
                    const locSpawnPoints = currentScene.value.location?.spawn_points || {};
                    const spawnPoints = locSpawnPoints[currentSectorId] || locSpawnPoints[Number(currentSectorId)] || [];
                    const sp = spawnPoints.find(p => p.name === spName || p.id === spName);
                    if (sp) {
                        if (targetActor) {
                            targetActor.targetPos.set(sp.x, sp.y, sp.z);
                            targetActor.targetRotation = sp.direction ?? sp.rotation ?? null;
                            targetActor.isWalking = true;
                            await new Promise(resolve => {
                                const check = setInterval(() => {
                                    if (!targetActor.isWalking) {
                                        clearInterval(check);
                                        resolve();
                                    }
                                }, 100);
                            });
                        } else if (actorId === null && playableCharacter.value) {
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
                    }
                }
                break;
            case 'START DIALOG':
            case 'START_DIALOGUE':
            case 'talk':
                const dialId = params.dialoog_id || value;
                if (dialId) await startDialogue(dialId);
                break;
            case 'PLAY_ANIMATION':
            case 'ANIMATION':
                const animName = params.animation || value;
                if (targetActor && targetActor.actions[animName]) {
                    const nextAction = targetActor.actions[animName];
                    nextAction.reset().play();
                    await new Promise(res => setTimeout(res, 500));
                }
                break;
            case 'LOOK_AT_TARGET':
            case 'LOOK_AT':
            case 'look_at':
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
            case 'GOTO SCENE':
                const scId = value || params.scene_id;
                if (scId && swapScene) await swapScene({ target_scene_id: parseInt(scId) });
                break;
        }
    };

    return {
        activeDialogue,
        currentNodeId,
        typewriterText,
        showDialogueOptions,
        dialogueNPCName,
        startDialogue,
        playNode,
        selectOption,
        closeDialogue,
        runAction,
        fetchRobustData // Exporting it too as it's useful
    };
}
