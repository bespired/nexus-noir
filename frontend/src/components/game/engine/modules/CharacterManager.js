import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class CharacterManager {
    constructor(engine) {
        this.engine = engine;
        this.loader = this.createLoader();
        this.player = null;
        this.npcs = new Map();
        this.raycaster = new THREE.Raycaster();
    }

    createLoader() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        return loader;
    }

    async spawnPlayer(characterData, spawnPoint = { x: 0, y: 0, z: 0 }) {
        if (this.player) {
            this.engine.scene.remove(this.player.mesh);
        }

        const personage = this.engine.store.state.game.characters.find(c => c.id === characterData.id) || characterData;
        const glb = personage.media?.find(m => m.filepad?.endsWith('.glb')) || personage.threefile;
        const url = glb ? `/storage/${glb.filepad || 'glb/' + glb}` : null;

        if (!url) return console.warn('[CHAR] No GLB found for player');

        console.log(`[CHAR] Spawning Player: ${personage.name}`, personage);
        const character = await this.loadCharacter(url, personage);
        this.player = character;
        this.player.id = personage.id; // Ensure ID is mapped for lookAt logic

        const sceneScale = this.engine.store.state.game.currentScene?.data?.character_scale ||
            this.engine.store.state.game.currentScene?.character_scale ||
            1.5;

        this.player.scale = sceneScale;
        this.player.mesh.scale.multiplyScalar(sceneScale);
        this.player.speed = 1.0 * sceneScale;

        console.log(`[CHAR] Applied scale: ${sceneScale} (Speed: ${this.player.speed.toFixed(2)})`);

        this.player.mesh.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.player.mesh.rotation.y = THREE.MathUtils.degToRad(spawnPoint.direction || 180);

        this.engine.scene.add(this.player.mesh);
        this.player.play('idle');

        return this.player;
    }

    async spawnNPCs(npcConfigs) {
        // Clear existing NPCs
        this.npcs.forEach(npc => this.engine.scene.remove(npc.mesh));
        this.npcs.clear();

        if (!npcConfigs || !Array.isArray(npcConfigs) || npcConfigs.length === 0) {
            console.log('[CHAR] No NPCs to spawn for this scene.');
            return;
        }

        console.log(`[CHAR] Spawning ${npcConfigs.length} NPCs...`, npcConfigs);
        const allChars = this.engine.store.state.game.characters;

        for (const config of npcConfigs) {
            // Use loose equality as IDs might be strings from JSON but numbers in store (or vice versa)
            const resolvedCharId = config.character_id || config.personage_id;
            const charData = allChars.find(c => c.id == resolvedCharId);

            if (!charData) {
                console.warn(`[CHAR] Character data not found for NPC config:`, config, `(ID: ${config.character_id})`);
                console.log(`[CHAR] Available character IDs:`, allChars.map(c => c.id));
                continue;
            }

            const glb = charData.media?.find(m => m.filepad?.endsWith('.glb')) || charData.threefile;
            const url = glb ? `/storage/${glb.filepad || 'glb/' + glb}` : null;
            if (!url) continue;

            const npc = await this.loadCharacter(url, charData);
            npc.id = charData.id;
            npc.slug = charData.slug || charData.name.toLowerCase().replace(/ /g, '-');

            const sceneScale = this.engine.store.state.game.currentScene?.data?.character_scale ||
                this.engine.store.state.game.currentScene?.character_scale ||
                1.5;

            npc.scale = sceneScale;
            npc.mesh.scale.multiplyScalar(sceneScale);
            npc.speed = 1.0 * sceneScale;

            npc.mesh.position.set(config.x, config.y, config.z);
            npc.mesh.rotation.y = THREE.MathUtils.degToRad(config.direction || 0);

            this.engine.scene.add(npc.mesh);
            npc.play('idle');
            this.npcs.set(charData.id, npc);
            console.log(`[CHAR] Spawned NPC: ${charData.name} at`, config);
        }
    }

    getCharacter(idOrSlug) {
        if (!idOrSlug) return null;
        const lookup = String(idOrSlug).toLowerCase();

        if (lookup === 'player') return this.player;

        // Try simple ID match (using Map)
        if (this.npcs.has(idOrSlug)) return this.npcs.get(idOrSlug);

        // Try numeric ID match
        const numericId = parseInt(idOrSlug);
        if (!isNaN(numericId) && this.npcs.has(numericId)) return this.npcs.get(numericId);

        // Try loose search (id, slug, name)
        for (const npc of this.npcs.values()) {
            if (String(npc.id) === String(idOrSlug)) return npc;
            if (npc.slug && npc.slug.toLowerCase() === lookup) return npc;
            // Fallback for character objects that might have been indexed differently
        }

        return null;
    }

    async loadCharacter(url, data) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, async (gltf) => {
                const mesh = gltf.scene;
                mesh.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        if (c.material) c.material.depthWrite = true;
                    }
                });

                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const normScale = 1.0 / (size.y || 1);
                mesh.scale.set(normScale, normScale, normScale);

                const mixer = new THREE.AnimationMixer(mesh);
                const actions = {};

                gltf.animations.forEach(clip => {
                    const name = clip.name.toLowerCase();
                    let key = null;
                    if (name.includes('walk') || name.includes('run')) key = 'walk';
                    else if (name.includes('idle') || name.includes('stand')) key = 'idle';
                    else if (name.includes('talk') || name.includes('speak') || name.includes('dialogue')) key = 'talk';

                    if (key) {
                        this.engine.animations.filterFingerTracks(clip);
                        actions[key] = mixer.clipAction(clip);
                    }
                });

                if (data.animations && data.animations.length > 0) {
                    for (const animData of data.animations) {
                        const clip = await this.engine.animations.getClip(animData);
                        if (clip && animData.mixer_name) {
                            actions[animData.mixer_name] = mixer.clipAction(clip);
                        }
                    }
                }

                const character = {
                    mesh,
                    mixer,
                    actions,
                    state: 'idle',
                    targetPos: mesh.position.clone(),
                    isWalking: false,
                    speed: 2,
                    play(name) {
                        if (!actions[name]) {
                            if (name === 'walk' && actions['idle']) name = 'idle';
                            else if (name === 'idle' && Object.keys(actions)[0]) name = Object.keys(actions)[0];
                            else return;
                        }
                        const nextAction = actions[name];
                        if (character.currentAction === nextAction) return;
                        if (character.currentAction) character.currentAction.fadeOut(0.2);
                        nextAction.reset().fadeIn(0.2).play();
                        character.currentAction = nextAction;
                    }
                };
                resolve(character);
            }, undefined, reject);
        });
    }

    update(delta) {
        if (this.player) this.updateCharacter(this.player, delta);
        this.npcs.forEach(npc => this.updateCharacter(npc, delta));
    }

    groundClamp(char) {
        if (!char || !char.mesh) return;

        const rayStart = char.mesh.position.clone();
        const headHeight = 1.2 * (char.scale || 1.0);
        rayStart.y += headHeight;

        this.raycaster.set(rayStart, new THREE.Vector3(0, -1, 0));
        const intersects = this.raycaster.intersectObjects(this.engine.scene.children, true);

        const walkableIntersects = intersects.filter(i => i.object.userData.isWalkable);

        if (walkableIntersects.length > 0) {
            let bestIntersect = walkableIntersects[0];
            let minDelta = Math.abs(walkableIntersects[0].point.y - char.mesh.position.y);

            for (let i = 1; i < walkableIntersects.length; i++) {
                const delta = Math.abs(walkableIntersects[i].point.y - char.mesh.position.y);
                if (delta < minDelta) {
                    minDelta = delta;
                    bestIntersect = walkableIntersects[i];
                }
            }

            // Vertical Safety Thresholds
            const currentY = char.mesh.position.y;
            const targetY = bestIntersect.point.y;
            const diff = targetY - currentY;

            // Thresholds: 0.5m down (MAX_DROP), 0.5m up (MAX_RISE)
            const threshold = 0.5;

            if (Math.abs(diff) < threshold) {
                char.mesh.position.y = targetY;
            } else {
                if (walkableIntersects.length === 1 && Math.abs(diff) < 2.0) {
                    char.mesh.position.y = targetY;
                }
            }
        }
    }

    updateCharacter(char, delta) {
        char.mixer.update(delta);
        this.groundClamp(char);

        if (char.isWalking && char.path && char.path.length > 0) {
            const target = char.path[char.pathIndex];
            const dist = char.mesh.position.distanceTo(target);

            if (dist > 0.05) {
                const dir = target.clone().sub(char.mesh.position).normalize();
                char.mesh.position.add(dir.multiplyScalar(char.speed * delta));

                const targetRotation = Math.atan2(dir.x, dir.z);
                const currentRotation = char.mesh.rotation.y;
                let diff = targetRotation - currentRotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                char.mesh.rotation.y += diff * 0.1;

                if (char.state !== 'walk') {
                    char.state = 'walk';
                    char.play('walk');

                    // If it's the player, start the walking sound
                    if (char === this.player && this.engine.playSoundByTag) {
                        this.engine.playSoundByTag('sfx-walk', { loop: true, unique: true, volume: 0.6 });
                    }
                }
            } else {
                if (char.pathIndex < char.path.length - 1) {
                    char.pathIndex++;
                } else {
                    const wasWalking = char.isWalking;
                    char.isWalking = false;
                    char.state = 'idle';
                    char.play('idle');
                    char.path = [];
                    char.pathIndex = 0;

                    // If it's the player and they were walking, stop the sound
                    if (char === this.player && wasWalking && this.engine.stopSoundByTag) {
                        this.engine.stopSoundByTag('sfx-walk');
                    }

                    if (char.onArrival) {
                        const cb = char.onArrival;
                        char.onArrival = null;
                        cb();
                    }
                }
            }
        }
    }

    walkCharacterTo(char, path, onArrival = null) {
        if (!char || !path) {
            console.warn('[CHAR] Walk aborted: Invalid path or no character.');
            return;
        }
        char.path = Array.isArray(path) ? path : [path];
        if (char.path.length === 0) return;
        char.pathIndex = 0;
        char.isWalking = true;
        char.onArrival = onArrival;
    }

    walkPlayerTo(path, onArrival = null) {
        this.walkCharacterTo(this.player, path, onArrival);
    }
}
