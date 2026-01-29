import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

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

        const character = await this.loadCharacter(url, personage);
        this.player = character;

        let scale = 1.5
        this.player.mesh.scale.set(scale, scale, scale);
        this.player.mesh.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.player.mesh.rotation.y = THREE.MathUtils.degToRad(spawnPoint.direction || 180);

        this.engine.scene.add(this.player.mesh);
        return this.player;
    }

    async loadCharacter(url, data) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                const mesh = gltf.scene;
                mesh.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        if (c.material) c.material.depthWrite = true;
                    }
                });

                // Normalization (from Preview3D logic)
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const scale = 1.0 / (size.y || 1);
                mesh.scale.set(scale, scale, scale);

                const mixer = new THREE.AnimationMixer(mesh);
                const actions = {};

                // Process embedded animations
                gltf.animations.forEach(clip => {
                    const name = clip.name.toLowerCase();
                    let key = null;
                    if (name.includes('walk')) key = 'walk';
                    else if (name.includes('idle')) key = 'idle';
                    else if (name.includes('talk')) key = 'talk';

                    if (key) actions[key] = mixer.clipAction(clip);
                });

                const character = {
                    mesh,
                    mixer,
                    actions,
                    state: 'idle',
                    targetPos: mesh.position.clone(),
                    isWalking: false,
                    speed: 1.5,
                    play(name) {
                        if (!actions[name]) return;
                        Object.values(actions).forEach(a => a.fadeOut(0.2));
                        actions[name].reset().fadeIn(0.2).play();
                    }
                };

                // Play default
                character.play('idle');
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

        if (char.isWalking) {
            const dist = char.mesh.position.distanceTo(char.targetPos);
            if (dist > 0.1) {
                const dir = char.targetPos.clone().sub(char.mesh.position).normalize();

                // Move
                char.mesh.position.add(dir.multiplyScalar(char.speed * delta));

                // Rotate to face direction
                const targetRotation = Math.atan2(dir.x, dir.z);
                char.mesh.rotation.y = targetRotation;

                if (char.state !== 'walk') {
                    char.state = 'walk';
                    char.play('walk');
                }
            } else {
                char.isWalking = false;
                char.state = 'idle';
                char.play('idle');
            }
        }
    }

    walkPlayerTo(pos) {
        if (!this.player) return;
        this.player.targetPos.copy(pos);
        this.player.isWalking = true;
    }
}
