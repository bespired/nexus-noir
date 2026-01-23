/**
 * Unified Game Action Constants
 * These satisfy both the Action Editor and the Dialogue Editor.
 */
export const GAME_ACTIONS = [
    { value: 'walk-to', label: 'WALK TO', icon: 'pi pi-directions', svg: 'walk', legacy_type: 'WALK_TO_POSITION' },
    { value: 'look-at', label: 'LOOK AT', icon: 'pi pi-eye', svg: 'look', legacy_type: 'LOOK_AT_TARGET' },
    { value: 'give-clue', label: 'GIVE CLUE', icon: 'pi pi-search', svg: 'clue', legacy_type: 'GIVE_CLUE' },
    { value: 'goto-scene', label: 'GOTO SCENE', icon: 'pi pi-map-marker', svg: 'scene', legacy_type: 'GOTO_SCENE' },
    { value: 'idle-wait', label: 'IDLE WAIT', icon: 'pi pi-clock', svg: 'idle', legacy_type: 'IDLE_WAIT' },
    { value: 'start-dialogue', label: 'START TALK', icon: 'pi pi-comments', svg: 'dialogue', legacy_type: 'START_DIALOGUE' },
    { value: 'end', label: 'END', icon: 'pi pi-sign-out', svg: 'end', legacy_type: 'END TALK' }
];

export const getActionByValue = (val) => GAME_ACTIONS.find(a => a.value === val);
