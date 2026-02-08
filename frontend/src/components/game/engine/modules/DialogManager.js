/**
 * DialogManager
 * Handles dialogue state, teletype logic, and choice management.
 */
export class DialogManager {
    constructor(engine) {
        this.engine = engine;
        this.activeDialog = null;
        this.currentNode = null;
        this.isTyping = false;
        this.typingProgress = 0;
        this.displayText = "";
        this.resolvePromise = null;
    }

    startDialog(dialogIdOrSlug, characterId = null) {
        console.log(`[DIALOG] Starting: ${dialogIdOrSlug} (CharId: ${characterId})`);

        const dialogs = this.engine.store.state.game.dialogs;
        const dialogData = dialogs.find(d =>
            String(d.id) === String(dialogIdOrSlug) || d.slug === dialogIdOrSlug
        );

        if (!dialogData) {
            console.warn(`[DIALOG] Dialog not found: ${dialogIdOrSlug}`);
            console.log(`[DIALOG] Available dialogs:`, dialogs.map(d => ({ id: d.id, slug: d.slug })));
            return Promise.resolve();
        }

        this.activeDialog = dialogData;
        const nodes = dialogData.tree?.nodes || dialogData.data?.nodes || dialogData.nodes || [];
        const startId = dialogData.tree?.startNodeId || dialogData.startNodeId;

        if (startId) {
            this.currentNode = nodes.find(n => n.id === startId) || nodes[0];
        } else {
            this.currentNode = nodes.find(n => n.initial) || nodes[0];
        }

        // Resolve character for name and talk animation
        const char = this.engine.characters.getCharacter(characterId || dialogData.character_id);
        const personage = this.engine.store.state.game.characters.find(c => String(c.id) === String(characterId || dialogData.character_id));

        const charName = char?.name || personage?.name || dialogData.character_name ||
            (characterId && characterId !== 'owner' ? `ID:${characterId}` : 'ENCRYPTED_SIGNATURE');

        console.log(`[DIALOG] Resolved Name: ${charName} (Char Found: ${!!char}, Pers Found: ${!!personage})`);

        this.engine.store.commit('game/SET_DATA', {
            key: 'activeDialog',
            data: {
                title: dialogData.title,
                characterId: characterId || dialogData.character_id,
                characterName: charName,
                currentNode: this.currentNode,
                allNodes: nodes // Keep reference for choice resolution
            }
        });

        if (char) char.play('talk');

        return new Promise(resolve => {
            this.resolvePromise = resolve;
        });
    }

    selectChoice(choice) {
        const state = this.engine.store.state.game.activeDialog;
        if (!state || !choice) return;

        const targetId = choice.targetNodeId || choice.target_node || choice.next_node;
        if (!targetId || targetId === '_end' || choice.action === 'end') {
            this.endDialog();
            return;
        }

        const nextNode = state.allNodes?.find(n => n.id === targetId);
        if (nextNode) {
            this.currentNode = nextNode;

            // Check for discovery actions on the new node
            const action = nextNode.action || nextNode.data?.action;
            const clueId = nextNode.clue_id || nextNode.data?.clue_id || nextNode.action_value || nextNode.actionValue;

            if (action === 'give-clue' && clueId) {
                if (this.engine.discovery) {
                    this.engine.discovery.discover(clueId);
                }
            }

            this.engine.store.commit('game/SET_DATA', {
                key: 'activeDialog',
                data: {
                    ...state,
                    currentNode: nextNode
                }
            });

            // Trigger action if choice has one
            if (choice.actionId) {
                this.engine.store.dispatch('game/triggerAction', { actionId: choice.actionId });
            }
        } else {
            this.endDialog();
        }
    }

    endDialog() {
        console.log('[DIALOG] Ended');
        const active = this.engine.store.state.game.activeDialog;
        if (active?.characterId) {
            const char = this.engine.characters.getCharacter(active.characterId);
            if (char) char.play('idle');
        }

        this.activeDialog = null;
        this.currentNode = null;
        this.engine.store.commit('game/SET_DATA', { key: 'activeDialog', data: null });

        if (this.resolvePromise) {
            this.resolvePromise();
            this.resolvePromise = null;
        }
    }

    update(delta) {
        // Handle teletype progression here if not handled in Vue
    }
}
