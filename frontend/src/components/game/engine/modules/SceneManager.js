import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class SceneManager {
    constructor(engine) {
        this.engine = engine;
        this.loader = this.createLoader();
        this.currentWorld = null;

        this.setupLights();
    }

    createLoader() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        return loader;
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.engine.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;

        // Optimize shadow map
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 50;

        this.engine.scene.add(sun);
    }

    async loadScene(sceneData) {
        if (!sceneData || !sceneData.media) return;

        // Cleanup previous world
        if (this.currentWorld) {
            this.engine.scene.remove(this.currentWorld);
            this.currentWorld = null;
        }

        const glb = sceneData.media.find(m => m.filepad && m.filepad.endsWith('.glb'));
        if (!glb) return;

        const url = `/storage/${glb.filepad}`;

        console.log(`[WORLD] Loading scene GLB: ${url}`);

        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this.currentWorld = gltf.scene;
                this.engine.scene.add(this.currentWorld);

                this.processScene(this.currentWorld);

                // Handle fSpy camera if embedded
                const fspyCam = this.currentWorld.getObjectByProperty('isCamera', true);
                if (fspyCam) {
                    console.log('[WORLD] Found embedded fSpy camera');
                    this.engine.camera = fspyCam;
                }

                // Recalibrate immediately with current stage bounds from store
                const stage = this.engine.store.state.game.stage;
                if (stage.width > 0 && stage.height > 0) {
                    this.engine.resize(stage.width, stage.height);
                }

                resolve(this.currentWorld);
            }, undefined, reject);
        });
    }

    processScene(world) {
        const isDebug = this.engine.store.state.game.debug;
        const walkableGeometries = [];

        // Ensure world transformations are ready
        world.updateMatrixWorld(true);

        world.traverse((child) => {
            if (child.isLight) {
                child.visible = isDebug;
            }

            if (child.isMesh) {
                const name = child.name.toLowerCase();
                const isFloor = name.includes('floor') || name.includes('walk') || name.includes('plane');
                child.userData.isWalkable = isFloor;

                if (isFloor) {
                    // Clone geometry and apply world transform for pathfinding
                    const geom = child.geometry.clone();
                    geom.applyMatrix4(child.matrixWorld);
                    walkableGeometries.push(geom);

                    if (isDebug) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: 0x00ff00,
                            transparent: true,
                            opacity: 0.4,
                            side: THREE.DoubleSide
                        });
                        child.visible = true;
                    } else {
                        child.material = new THREE.ShadowMaterial({ opacity: 0.4 });
                        child.receiveShadow = true;
                    }
                } else {
                    if (isDebug) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: 0x00ffff,
                            transparent: true,
                            opacity: 0.4,
                            side: THREE.DoubleSide
                        });
                        child.visible = true;
                    } else {
                        child.material = new THREE.MeshBasicMaterial({
                            colorWrite: false,
                            depthWrite: true
                        });
                    }
                }
            }
        });

        // Merge all walkable geometries into one NavMesh
        if (walkableGeometries.length > 0) {
            console.log(`[WORLD] Registering NavMesh (Aligned to World Space)`);
            const mergedGeometry = BufferGeometryUtils.mergeGeometries(walkableGeometries);
            const navMesh = new THREE.Mesh(mergedGeometry);
            navMesh.name = 'MergedNavMesh';
            this.engine.pathfinding.setNavMesh(navMesh);
        } else {
            console.warn('[WORLD] No walkable floor found in scene GLB');
        }
    }

    refreshMaterials() {
        if (this.currentWorld) {
            this.processScene(this.currentWorld);
        }
    }
}
