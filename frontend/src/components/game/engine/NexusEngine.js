import * as THREE from 'three';
import { SceneManager } from './modules/SceneManager';
import { CharacterManager } from './modules/CharacterManager';
import { InteractionManager } from './modules/InteractionManager';
import { DebugManager } from './modules/DebugManager';

/**
 * NexusEngine
 * Central coordinator for the 3D Point-and-Click Engine
 */
export class NexusEngine {
    constructor(canvas, store) {
        this.canvas = canvas;
        this.store = store;
        this.active = false;

        // Core Three.js
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        // Initial Camera (will be updated by SceneManager if fSpy used)
        this.camera = new THREE.PerspectiveCamera(45, 1218 / 832, 0.1, 1000);
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Modules
        this.world = new SceneManager(this);
        this.characters = new CharacterManager(this);
        this.interactions = new InteractionManager(this);
        this.debug = new DebugManager(this);

        this.animate = this.animate.bind(this);
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.animate();
        console.log('[ENGINE] Nexus Engine Started');
    }

    stop() {
        this.active = false;
        console.log('[ENGINE] Nexus Engine Stopped');
    }

    cleanup() {
        this.stop();
        this.debug.cleanup();
        this.renderer.dispose();
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }

    resize(width, height) {
        // console.log(`[ENGINE] Resizing to: ${width}x${height}`);
        // Letting Three.js update the element's style (3rd arg true by default)
        // ensures the display size matches the logical store size.
        this.renderer.setSize(width, height, true);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        if (!this.active) return;
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();

        // Update Modules
        this.characters.update(delta);
        this.interactions.update(delta);

        this.renderer.render(this.scene, this.camera);
    }
}
