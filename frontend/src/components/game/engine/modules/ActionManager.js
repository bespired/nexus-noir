import * as THREE from 'three';

/**
 * ActionManager
 * Coordinates sequential execution of game actions (WALK TO, LOOK AT, etc.)
 */
export class ActionManager {
    constructor(engine) {
        this.engine = engine;
        this.currentAction = null;
        this.isExecuting = false;
        this.stepIndex = 0;

        // Watch for action triggers in the store
        this.engine.store.subscribe((mutation, state) => {
            if (mutation.type === 'game/SET_LAST_TRIGGERED_ACTION_ID' && mutation.payload) {
                const { actionId, ownerId } = mutation.payload;
                this.executeAction(actionId, ownerId);
            }
        });
    }

    async executeAction(actionId, ownerId = null) {
        if (this.isExecuting) {
            console.warn('[ACTION] Already executing an action. Queueing not yet supported.');
            return;
        }

        const actionData = this.engine.store.state.game.actions.find(a => a.id === actionId);
        if (!actionData) {
            console.warn(`[ACTION] Action not found: ${actionId}`);
            return;
        }

        console.log(`[ACTION] Executing Sequence: ${actionData.name} (Owner: ${ownerId})`, actionData.actions);
        this.currentAction = actionData;
        this.ownerId = ownerId;
        this.isExecuting = true;
        this.stepIndex = 0;

        await this.executeNextStep();
    }

    resolveCharacter(idOrSlug) {
        if (!idOrSlug) return null;

        // Handle if we accidentally passed an object
        if (typeof idOrSlug === 'object') {
            idOrSlug = idOrSlug.id || idOrSlug.character_id || idOrSlug.slug || idOrSlug.target_character_id || idOrSlug.target_character || idOrSlug.personage_id;
            if (!idOrSlug) return null;
        }

        const lookup = String(idOrSlug).toLowerCase();

        let char = null;
        if (lookup === 'player') {
            char = this.engine.characters.player;
        } else if (lookup === 'owner') {
            // Check current context
            char = this.engine.characters.getCharacter(this.ownerId);
        } else {
            char = this.engine.characters.getCharacter(idOrSlug);
        }

        console.log(`[ACTION] Resolving character '${idOrSlug}' (Lookup: ${lookup}, OwnerCtx: ${this.ownerId}):`, char ? char.slug || char.id : 'NOT FOUND');
        return char;
    }

    async executeNextStep() {
        if (!this.currentAction || this.stepIndex >= this.currentAction.actions.length) {
            this.completeAction();
            return;
        }

        const step = this.currentAction.actions[this.stepIndex];
        console.log(`[ACTION] Step ${this.stepIndex + 1}/${this.currentAction.actions.length}:`, step);

        try {
            await this.processStep(step);
            this.stepIndex++;
            await this.executeNextStep();
        } catch (error) {
            console.error('[ACTION] Step failed:', error);
            this.completeAction();
        }
    }

    async processStep(step) {
        let type = step.type || step.action; // Support both naming conventions
        if (!type) {
            console.warn('[ACTION] Step missing type/action field:', step);
            return Promise.resolve();
        }

        // Normalize: "walk-to" -> "walk_to", "WALK TO" -> "walk_to"
        type = type.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');

        console.log(`[ACTION] Process Normalized Step: ${type}`, step);

        switch (type) {
            case 'walk_to':
                return this.handleWalkTo(step);
            case 'look_at':
                return this.handleLookAt(step);
            case 'idle_wait':
                return this.handleWait(step);
            case 'start_talk':
            case 'start_dialogue':
                return this.handleTalk(step);
            case 'give_clue':
                return this.handleGiveClue(step);
            default:
                console.warn(`[ACTION] Unknown step type: ${type}`);
                return Promise.resolve();
        }
    }

    handleGiveClue(step) {
        const data = step.data || {};
        const clueId = data.clue_id || data.id || data.action_value || step.clue_id || step.id || step.action_value;

        if (clueId) {
            console.log(`[ACTION] Trigger Discovery: ${clueId}`);
            if (this.engine.discovery) {
                this.engine.discovery.discover(clueId);
            }
        }
        return Promise.resolve();
    }

    handleWalkTo(step) {
        return new Promise((resolve) => {
            const data = step.data || {};
            const charId = data.target_character_id || data.character_id || step.target_character_id || 'owner';
            const char = this.resolveCharacter(charId);

            if (!char) {
                console.warn(`[ACTION] Character not found for WALK TO: ${charId}`, { data, step: JSON.parse(JSON.stringify(step)) });
                return resolve();
            }

            // Find target position from spawnpoints or explicit coordinates
            let targetPos = null;
            const spRaw = data.goto_spawnpoint || data.spawnpoint || step.goto_spawnpoint;
            const spName = typeof spRaw === 'object' ? spRaw.value : spRaw;

            if (spName) {
                const sp = this.engine.store.state.game.currentScene?.['3d_spawnpoints']?.find(s => s.name === spName);
                if (sp) targetPos = new THREE.Vector3(sp.x, sp.y, sp.z);
            }

            if (!targetPos && (data.x !== undefined || step.x !== undefined)) {
                targetPos = new THREE.Vector3(
                    data.x !== undefined ? data.x : step.x,
                    data.y !== undefined ? data.y : (step.y || 0),
                    data.z !== undefined ? data.z : step.z
                );
            }

            if (!targetPos) {
                console.warn(`[ACTION] No target position for WALK TO step (Target: ${spName})`, JSON.parse(JSON.stringify(step)));
                return resolve();
            }

            console.log(`[ACTION] Walking ${charId} to`, targetPos);
            const path = this.engine.pathfinding.findPath(char.mesh.position, targetPos);
            this.engine.characters.walkCharacterTo(char, path, resolve);
        });
    }

    handleLookAt(step) {
        const data = step.data || {};
        const charId = data.subject_id || data.character_id || data.target_character_id || step.target_character_id || 'owner';
        const lookAtId = data.target_id || data.look_at_character_id || data.target_character_id || step.look_at_character_id || step.target_character_id;

        const char = this.resolveCharacter(charId);
        const lookAtChar = this.resolveCharacter(lookAtId);

        if (char && lookAtChar) {
            console.log(`[ACTION] ${charId} looking at ${lookAtId}`);
            const dir = lookAtChar.mesh.position.clone().sub(char.mesh.position).normalize();
            char.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        } else {
            console.warn(`[ACTION] LookAt failed: subject=${charId}(${!!char}), target=${lookAtId}(${!!lookAtChar})`, data);
        }
        return Promise.resolve();
    }

    handleWait(step) {
        const data = step.data || {};
        const seconds = parseFloat(data.duration) || parseFloat(data.value) || parseFloat(step.duration) || parseFloat(step.value) || 1.0;
        console.log(`[ACTION] Waiting for ${seconds}s...`);
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async handleTalk(step) {
        const data = step.data || {};
        const dialogId = data.dialog_id || data.id || data.value || step.value;
        const charIdOrOwner = data.character_id || step.character_id || 'owner';

        const char = this.resolveCharacter(charIdOrOwner);
        const resolvedCharId = char ? char.id : (charIdOrOwner === 'owner' ? this.ownerId : charIdOrOwner);

        console.log(`[ACTION] Starting Talk: ${dialogId} with Resolved Char: ${resolvedCharId}`, { data });
        if (this.engine.dialogs) {
            await this.engine.dialogs.startDialog(dialogId, resolvedCharId);
            console.log(`[ACTION] Talk sequence finished: ${dialogId}`);
        } else {
            console.warn('[ACTION] DialogManager not initialized.');
        }
    }

    completeAction() {
        console.log(`[ACTION] Sequence Completed: ${this.currentAction?.name}`);
        this.isExecuting = false;
        this.currentAction = null;
        this.stepIndex = 0;
        this.engine.store.commit('game/SET_LAST_TRIGGERED_ACTION_ID', null);
    }

    update(delta) {
        // Continuous updates if needed
    }
}
