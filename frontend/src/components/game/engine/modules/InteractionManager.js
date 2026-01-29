import * as THREE from 'three';

export class InteractionManager {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    handleMouseMove(event) {
        const { xPercent, yPercent } = this.getPercents(event);
        const gw = this.getGatewayAtPosition(xPercent, yPercent);

        if (gw) {
            this.engine.store.commit('game/SET_CURSOR', gw.type === 'scene' ? 'direction' : 'hover');

            // Requirement: Hover sets the potential next spawnpoint in the store
            if (gw.target_spawn_point) {
                this.engine.store.commit('game/SET_TARGET_SPAWN_POINT', { name: gw.target_spawn_point });
            }
        } else {
            this.engine.store.commit('game/SET_CURSOR', 'pointer');
        }
    }

    handleMouseClick(event) {
        const { xPercent, yPercent } = this.getPercents(event);

        // 1. Raycast to find floor point (always needed for move targets)
        const rect = this.engine.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.engine.camera);
        const intersects = this.raycaster.intersectObjects(this.engine.scene.children, true);
        const floorIntersect = intersects.find(i => i.object.userData.isWalkable);

        // 2. Check for Gateway Interaction
        const gw = this.getGatewayAtPosition(xPercent, yPercent);

        if (gw) {
            console.log(`[GATEWAY] Clicked: ${gw.label}. Waiting for arrival...`);

            // Priority 1: Explicit walk point on the gateway
            // Priority 2: Floor intersection under the mouse
            // Priority 3: Fallback to closest 3D spawnpoint (in 2D space)
            let walkPoint = null;
            if (gw.walk_x !== undefined && gw.walk_z !== undefined) {
                walkPoint = new THREE.Vector3(gw.walk_x, gw.walk_y || 0, gw.walk_z);
            } else if (floorIntersect) {
                walkPoint = floorIntersect.point;
            } else {
                walkPoint = this.getFallbackWalkPoint(xPercent, yPercent);
            }

            if (walkPoint) {
                this.engine.characters.walkPlayerTo(walkPoint, () => {
                    this.activateGateway(gw);
                });
            } else {
                console.warn(`[GATEWAY] No walk point, floor, or spawnpoint detected. Triggering immediately.`);
                this.activateGateway(gw);
            }
            return;
        }

        // 3. Normal walking (no gateway)
        if (floorIntersect) {
            this.engine.characters.walkPlayerTo(floorIntersect.point);
        }
    }

    getGatewayAtPosition(x, y) {
        const gateways = this.engine.store.state.game.currentScene?.['2d_gateways'] || [];
        // Check backwards (top-most first)
        for (let i = gateways.length - 1; i >= 0; i--) {
            const gw = gateways[i];
            if (!this.isGatewayActive(gw)) continue;

            if (x >= gw.x && x <= (gw.x + gw.width) &&
                y >= gw.y && y <= (gw.y + gw.height)) {
                return gw;
            }
        }
        return null;
    }

    isGatewayActive(gw) {
        const inventory = this.engine.store.state.game.inventory || [];
        if (!gw.triggers || gw.triggers.length === 0) return true;

        let active = false;
        gw.triggers.forEach(t => {
            switch (t.condition) {
                case 'always': active = true; break;
                case 'has': if (inventory.includes(t.clue_id)) active = true; break;
                case 'has-not': if (!inventory.includes(t.clue_id)) active = true; break;
            }
        });
        return active;
    }

    activateGateway(gw) {
        console.log(`[GATEWAY] Activated: ${gw.label}`, gw);
        const store = this.engine.store;

        store.commit('game/SET_LAST_TRIGGERED_GATEWAY_ID', gw.id);

        if (gw.type === 'scene' && gw.target_scene_id) {
            if (gw.target_spawn_point) {
                store.commit('game/SET_TARGET_SPAWN_POINT', { name: gw.target_spawn_point });
            }
            store.dispatch('game/loadScene', { sceneId: gw.target_scene_id });
        } else if (gw.type === 'trigger' && gw.action_id) {
            store.dispatch('game/triggerAction', { actionId: gw.action_id });
        }
    }

    getFallbackWalkPoint(clickX, clickY) {
        const spawnpoints = this.engine.store.state.game.currentScene?.['3d_spawnpoints'] || [];
        if (spawnpoints.length === 0) return null;

        let closestPoint = null;
        let minDistance = Infinity;

        spawnpoints.forEach(sp => {
            // Project 3D point to 2D
            const v = new THREE.Vector3(sp.x, sp.y, sp.z);
            v.project(this.engine.camera);

            // Convert NDC (-1 to 1) to Percents (0 to 100)
            const xPercent = (v.x + 1) / 2 * 100;
            const yPercent = (-(v.y) + 1) / 2 * 100; // Y is inverted in screen space vs NDC

            const dx = xPercent - clickX;
            const dy = yPercent - clickY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = new THREE.Vector3(sp.x, sp.y, sp.z);
            }
        });

        if (closestPoint) {
            console.log(`[GATEWAY] Falling back to closest spawnpoint at distance ${minDistance.toFixed(2)}`);
        }

        return closestPoint;
    }

    getPercents(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
        return { xPercent, yPercent };
    }

    update(delta) {
        // Handle continuous updates if needed
    }
}
