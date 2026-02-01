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

        // Apply requested scale
        // Priority: 1. Scene data 'character_scale', 2. Default 1.5
        const sceneScale = this.engine.store.state.game.currentScene?.data?.character_scale ||
            this.engine.store.state.game.currentScene?.character_scale ||
            1.5;

        this.player.scale = sceneScale;
        this.player.mesh.scale.multiplyScalar(sceneScale);
        this.player.speed = 1.0 * sceneScale; // Balanced base speed * scale

        console.log(`[CHAR] Applied scale: ${sceneScale} (Speed: ${this.player.speed.toFixed(2)})`);

        this.player.mesh.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.player.mesh.rotation.y = THREE.MathUtils.degToRad(spawnPoint.direction || 180);

        this.engine.scene.add(this.player.mesh);

        // Ensure default idle animation starts
        this.player.play('idle');

        return this.player;
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

                // Normalization: Ensure model is 1 unit high baseline
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                console.log(`[CHAR] Loading: ${data.name}. Original Size:`, { x: size.x, y: size.y, z: size.z });

                const normScale = 1.0 / (size.y || 1);
                mesh.scale.set(normScale, normScale, normScale);

                const mixer = new THREE.AnimationMixer(mesh);
                const actions = {};

                // Process embedded animations
                gltf.animations.forEach(clip => {
                    const name = clip.name.toLowerCase();
                    let key = null;
                    if (name.includes('walk')) key = 'walk';
                    else if (name.includes('idle')) key = 'idle';
                    else if (name.includes('talk')) key = 'talk';

                    if (key) {
                        this.engine.animations.filterFingerTracks(clip);
                        actions[key] = mixer.clipAction(clip);
                    }
                });

                // Process external animations
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
                            // Fallback to idle if walk is missing, or vice versa
                            if (name === 'walk' && actions['idle']) name = 'idle';
                            else if (name === 'idle' && Object.keys(actions)[0]) name = Object.keys(actions)[0];
                            else return;
                        }

                        // Crossfade logic
                        const nextAction = actions[name];
                        if (character.currentAction === nextAction) return;

                        if (character.currentAction) {
                            character.currentAction.fadeOut(0.2);
                        }

                        nextAction.reset().fadeIn(0.2).play();
                        character.currentAction = nextAction;
                    }
                };

                resolve(character);
            }, undefined, reject);
        });
    }


    update(delta) {
        if (this.player) {
            this.updateCharacter(this.player, delta);
        }
        this.npcs.forEach(npc => this.updateCharacter(npc, delta));
    }

    updateCharacter(char, delta) {
        char.mixer.update(delta);

        if (char.isWalking && char.path && char.path.length > 0) {
            const target = char.path[char.pathIndex];
            const dist = char.mesh.position.distanceTo(target);

            if (dist > 0.05) {
                const dir = target.clone().sub(char.mesh.position).normalize();

                // Move
                char.mesh.position.add(dir.multiplyScalar(char.speed * delta));

                // Rotate to face direction
                const targetRotation = Math.atan2(dir.x, dir.z);

                // Smooth rotation
                const currentRotation = char.mesh.rotation.y;
                let diff = targetRotation - currentRotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                char.mesh.rotation.y += diff * 0.1;

                if (char.state !== 'walk') {
                    char.state = 'walk';
                    char.play('walk');
                }
            } else {
                // Arrived at current point in path
                if (char.pathIndex < char.path.length - 1) {
                    char.pathIndex++;
                    console.log(`[CHAR] Moving to next path segment: ${char.pathIndex + 1}/${char.path.length}`);
                } else {
                    // Fully arrived at end of path
                    char.isWalking = false;
                    char.state = 'idle';
                    char.play('idle');
                    char.path = [];
                    char.pathIndex = 0;

                    if (char.onArrival) {
                        const cb = char.onArrival;
                        char.onArrival = null;
                        cb();
                    }
                }
            }
        }
    }

    walkPlayerTo(path, onArrival = null) {
        if (!this.player || !path || path.length === 0) return;

        // Ensure path is an array of points
        this.player.path = Array.isArray(path) ? path : [path];
        this.player.pathIndex = 0;
        this.player.isWalking = true;
        this.player.onArrival = onArrival;

        console.log(`[CHAR] Player walking on path with ${this.player.path.length} points`);
    }
}
