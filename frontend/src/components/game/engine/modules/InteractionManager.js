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
        } else {
            this.engine.store.commit('game/SET_CURSOR', 'pointer');
        }
    }

    handleMouseClick(event) {
        const { xPercent, yPercent } = this.getPercents(event);

        // 1. Check for Gateway Interaction
        const gw = this.getGatewayAtPosition(xPercent, yPercent);
        if (gw) {
            this.activateGateway(gw);
            return;
        }

        // 2. Fallback: Raycast against the walkable floor
        const rect = this.engine.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.engine.camera);

        const intersects = this.raycaster.intersectObjects(this.engine.scene.children, true);
        const floorIntersect = intersects.find(i => i.object.userData.isWalkable);

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

        if (gw.type === 'scene' && gw.target_scene_id) {
            if (gw.target_spawn_point) {
                store.commit('game/SET_TARGET_SPAWN_POINT', { name: gw.target_spawn_point });
            }
            store.dispatch('game/loadScene', { sceneId: gw.target_scene_id });
        } else if (gw.type === 'trigger' && gw.action_id) {
            store.dispatch('game/triggerAction', { actionId: gw.action_id });
        }
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
