import * as THREE from 'three';

export class DebugManager {
    constructor(engine) {
        this.engine = engine;
        this.spawnPointMarkers = new THREE.Group();
        this.engine.scene.add(this.spawnPointMarkers);

        this.visible = this.engine.store.state.game.debug;
        this.spawnPointMarkers.visible = this.visible;
    }

    refresh() {
        this.visible = this.engine.store.state.game.debug;
        this.spawnPointMarkers.visible = this.visible;

        if (this.visible) {
            this.updateSpawnPointMarkers();
        }
    }

    updateSpawnPointMarkers() {
        // Clear old markers
        while (this.spawnPointMarkers.children.length > 0) {
            this.spawnPointMarkers.remove(this.spawnPointMarkers.children[0]);
        }

        const scene = this.engine.store.state.game.currentScene;
        if (!scene || !scene['3d_spawnpoints']) return;

        scene['3d_spawnpoints'].forEach((sp, index) => {
            const color = 0x3b82f6; // Noir Blue

            // Group to hold cone and beak
            const group = new THREE.Group();
            group.position.set(sp.x, sp.y + 0.25, sp.z);

            // Main Cone
            const geometry = new THREE.ConeGeometry(0.15, 0.4, 8);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: 0x1d4ed8,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            const cone = new THREE.Mesh(geometry, material);
            cone.rotation.x = Math.PI; // Invert cone to point down
            group.add(cone);

            // Direction Beak (small cone pointing forward)
            const beakGeometry = new THREE.ConeGeometry(0.06, 0.15, 4);
            const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const beak = new THREE.Mesh(beakGeometry, beakMaterial);

            // Position beak at the "front" of the spawnpoint
            beak.position.set(0, 0, 0.2);
            beak.rotation.x = Math.PI / 2;
            group.add(beak);

            // Apply orientation to the group
            group.rotateY(THREE.MathUtils.degToRad(sp.direction || 0));

            group.userData = { index, type: 'spawnpoint' };
            this.spawnPointMarkers.add(group);
        });
    }

    cleanup() {
        this.engine.scene.remove(this.spawnPointMarkers);
        this.spawnPointMarkers.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
