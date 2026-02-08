import * as THREE from 'three';
import { SceneManager } from './modules/SceneManager';
import { CharacterManager } from './modules/CharacterManager';
import { InteractionManager } from './modules/InteractionManager';
import { AnimationManager } from './modules/AnimationManager';
import { DebugManager } from './modules/DebugManager';
import { PathfindingManager } from './modules/PathfindingManager';
import { ActionManager } from './modules/ActionManager';
import { DialogManager } from './modules/DialogManager';
import { DiscoveryManager } from './modules/DiscoveryManager';

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
        this.animations = new AnimationManager(this);
        this.characters = new CharacterManager(this);
        this.interactions = new InteractionManager(this);
        this.pathfinding = new PathfindingManager(this);
        this.debug = new DebugManager(this);
        this.actions = new ActionManager(this);
        this.dialogs = new DialogManager(this);
        this.discovery = new DiscoveryManager(this);

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
        if (this.stopAllSounds) this.stopAllSounds();
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
        if (!width || !height) return;

        // 1. Update Renderer
        this.renderer.setSize(width, height, true);

        // 2. Recalibrate Camera for "object-fit: cover" parity
        // This ensures the 3D projection matches the 2D background scaling/skewing.
        const VIEW_WIDTH = 1218; // Standard game resolution
        const VIEW_HEIGHT = 832;

        const scale = Math.max(width / VIEW_WIDTH, height / VIEW_HEIGHT);
        const fullW = VIEW_WIDTH * scale;
        const fullH = VIEW_HEIGHT * scale;
        const offsetX = (fullW - width) / 2;
        const offsetY = (fullH - height) / 2;

        if (this.camera.setViewOffset) {
            this.camera.setViewOffset(fullW, fullH, offsetX, offsetY, width, height);
        } else {
            this.camera.aspect = width / height;
        }

        this.camera.updateProjectionMatrix();

        console.log(`[ENGINE] Recalibrated camera to ${width}x${height}`);
    }

    animate() {
        if (!this.active) return;
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();

        // Update Modules
        this.characters.update(delta);
        this.interactions.update(delta);
        this.actions.update(delta);
        this.dialogs.update(delta);
        this.discovery.update(delta);
        this.debug.update(delta);

        this.renderer.render(this.scene, this.camera);
    }
}
