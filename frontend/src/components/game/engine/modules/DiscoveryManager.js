import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * DiscoveryManager
 * Handles the "Discovery" effect: showing a 3D model of a clue 
 * that grows, rotates, and shrinks in front of the camera.
 */
export class DiscoveryManager {
    constructor(engine) {
        this.engine = engine;
        this.loader = this.createLoader();
        this.activeClueMesh = null;
        this.isAnimating = false;
        this.timer = 0;
        this.duration = 4.0; // Total duration of the effect in seconds

        // Container in the scene, will be synced to camera in update()
        this.discoveryGroup = new THREE.Group();
        this.engine.scene.add(this.discoveryGroup);
    }

    createLoader() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        return loader;
    }

    async discover(clueId) {
        if (this.isAnimating) return;

        const store = this.engine.store;
        const inventory = store.state.game.inventory || [];
        const isNew = !inventory.includes(parseInt(clueId));

        const clue = store.state.game.clues.find(c => String(c.id) === String(clueId));
        if (!clue) {
            console.warn(`[DISCOVERY] Clue not found: ${clueId}`);
            return;
        }

        // 1. Handle Inventory and Console
        if (isNew) {
            console.log(`[DISCOVERY] New disclosure: ${clue.title}`);
            store.commit('game/ADD_TO_INVENTORY', parseInt(clueId));
            store.commit('game/DEBUGGER_INFO', `DISCOVERED: ${clue.title}`);
        } else {
            console.log(`[DISCOVERY] Clue already in inventory: ${clue.title}`);
            // Don't regive/re-animate if already owned
            return;
        }

        // 2. Find 3D Asset
        const media = store.state.game.media || [];
        const clueMedia = media.find(m =>
            m.imageable_id === clue.id &&
            m.imageable_type.includes('Clue') &&
            m.type === '3d'
        );

        let mesh;
        if (clueMedia && clueMedia.filepad) {
            mesh = await this.loadClueModel(`/storage/${clueMedia.filepad}`);
        } else {
            mesh = this.createFallbackMesh();
        }

        if (!mesh) return;

        // 2. Setup Animation
        this.activeClueMesh = mesh;
        this.discoveryGroup.add(this.activeClueMesh);
        this.activeClueMesh.scale.set(0, 0, 0);
        this.activeClueMesh.rotation.set(0, 0, 0);

        this.timer = 0;
        this.isAnimating = true;

        // 3. Play sound
        if (this.engine.playSoundByTag) {
            this.engine.playSoundByTag('sfx-discover');
        }
    }

    loadClueModel(url) {
        return new Promise((resolve) => {
            this.loader.load(url, (gltf) => {
                const model = gltf.scene;

                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);

                // Wrap in a group so we can rotate around the center easily
                const wrapper = new THREE.Group();
                wrapper.add(model);

                // Normalize scale to fit roughly in a 1.5 unit box
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1.5 / maxDim;
                wrapper.scale.set(scale, scale, scale);

                resolve(wrapper);
            }, undefined, (err) => {
                console.error(`[DISCOVERY] Failed to load 3D clue: ${url}`, err);
                resolve(null);
            });
        });
    }

    createFallbackMesh() {
        // Simple rotating prism or "data crystal" if no 3D asset exists
        const geometry = new THREE.OctahedronGeometry(0.5);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffc7,
            transparent: true,
            opacity: 0.8,
            emissive: 0x00ffc7,
            emissiveIntensity: 0.5
        });
        return new THREE.Mesh(geometry, material);
    }

    update(delta) {
        if (!this.isAnimating || !this.activeClueMesh) return;

        // Sync with current camera
        const camera = this.engine.camera;
        this.discoveryGroup.position.copy(camera.position);
        this.discoveryGroup.quaternion.copy(camera.quaternion);

        // Move group 5 units in front of camera local space
        this.discoveryGroup.translateZ(-5);

        this.timer += delta;

        // Animation logic (Blade Runner style)
        // 0.0 - 1.0: Grow
        // 1.0 - 3.0: Rotate
        // 3.0 - 4.0: Shrink & disappear

        let scale = 1.0;
        if (this.timer < 1.0) {
            scale = this.timer; // Ease-in
        } else if (this.timer > 3.0) {
            scale = Math.max(0, 1.0 - (this.timer - 3.0)); // Ease-out
        }

        this.activeClueMesh.scale.multiplyScalar(0).addScalar(scale);
        this.activeClueMesh.rotation.y += delta * 2;
        this.activeClueMesh.rotation.z += delta * 0.5;

        // End animation
        if (this.timer >= this.duration) {
            this.isAnimating = false;
            this.discoveryGroup.remove(this.activeClueMesh);
            this.activeClueMesh = null;
        }
    }
}
