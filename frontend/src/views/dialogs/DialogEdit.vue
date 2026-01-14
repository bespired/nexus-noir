<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';
import ConfirmationModal from '@components/modals/ConfirmationModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const dialogId = route.params.id;
const dialog = ref({ title: '', tree: { nodes: [] } });
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const selectedNodeId = ref(null);
const draggingNodeId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// Actions available for nodes and answers
const actionOptions = [
    { label: 'WALK TO',    value: 'walk-to' },
    { label: 'LOOK AT',    value: 'look-at' },
    { label: 'GIVE CLUE',  value: 'give-clue' },
    { label: 'GOTO SCENE', value: 'goto-scene' },
    { label: 'END', value: 'end' }
];

const fetchDialog = async () => {
    try {
        const response = await fetch(`/api/dialogs/${dialogId}`);
        if (!response.ok) throw new Error('Failed to fetch dialog');
        
        const text = await response.text();
        if (!text) {
            dialog.value = { title: 'Untitled', tree: { nodes: [] } };
            return;
        }
        
        let data = JSON.parse(text);
        
        // Ensure tree structure exists
        if (!data.tree) {
            data.tree = { nodes: [] };
        } else if (typeof data.tree === 'string') {
            try {
                data.tree = JSON.parse(data.tree);
            } catch (e) {
                console.warn('Failed to parse tree string, resetting to empty', e);
                data.tree = { nodes: [] };
            }
        }
        
        // Handle legacy "nodes" as object/dictionary
        if (data.tree && typeof data.tree.nodes === 'object' && !Array.isArray(data.tree.nodes)) {
            console.log('Converting legacy object-based nodes to array');
            data.tree.nodes = Object.entries(data.tree.nodes).map(([id, node]) => ({
                id,
                name: node.name || (id === 'root' ? 'Start' : `Node ${id}`),
                text: node.text || '',
                position: node.position || { x: node.x || 0, y: node.y || 0 },
                action: node.action || null,
                answers: node.answers || []
            }));
        }

        // Ensure nodes is an array
        if (!data.tree || !Array.isArray(data.tree.nodes)) {
            if (!data.tree) data.tree = {};
            data.tree.nodes = [];
        }

        // Ensure each node has an answers array
        data.tree.nodes.forEach(node => {
            if (!Array.isArray(node.answers)) {
                node.answers = [];
            }
        });
        
        dialog.value = data;
    } catch (error) {
        console.error('Error fetching dialog:', error);
        dialog.value = { title: 'Error Loading', tree: { nodes: [] } };
    } finally {
        loading.value = false;
    }
};

const saveDialog = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/dialogs/${dialogId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: dialog.value.title,
                tree: dialog.value.tree
            })
        });
        if (!response.ok) throw new Error('Failed to save dialog');
        
        toast.add({
            severity: 'success',
            summary: t('dialogs.messages.success_summary'),
            detail: t('dialogs.messages.success_update'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('dialogs.messages.error_summary'),
            detail: t('dialogs.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const handleDelete = () => {
    showDeleteConfirm.value = true;
};

const deleteDialog = async () => {
    deleting.value = true;
    try {
        const response = await fetch(`/api/dialogs/${dialogId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete dialog');
        router.push('/dialogs');
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete dialog', life: 3000 });
    } finally {
        deleting.value = false;
        showDeleteConfirm.value = false;
    }
};

const addNode = () => {
    if (!dialog.value.tree.nodes) dialog.value.tree.nodes = [];
    const id = 'node_' + Date.now();
    const newNode = {
        id,
        name: 'New Node',
        text: 'What do you say?',
        action: null,
        answers: [],
        position: { x: 100 + (dialog.value.tree.nodes.length * 20), y: 100 + (dialog.value.tree.nodes.length * 20) }
    };
    dialog.value.tree.nodes.push(newNode);
    
    // If this is the first node, make it the start node
    if (dialog.value.tree.nodes.length === 1 && !dialog.value.tree.startNodeId) {
        dialog.value.tree.startNodeId = id;
    }
    
    selectedNodeId.value = newNode.id;
};

const deleteNode = (nodeId) => {
    if (!dialog.value.tree.nodes) return;
    dialog.value.tree.nodes = dialog.value.tree.nodes.filter(n => n.id !== nodeId);
    if (selectedNodeId.value === nodeId) {
        selectedNodeId.value = null;
    }
    // Also clean up connections pointing to this node
    dialog.value.tree.nodes.forEach(node => {
        if (Array.isArray(node.answers)) {
            node.answers.forEach(answer => {
                if (answer.next_node === nodeId) {
                    answer.next_node = null;
                }
            });
        }
    });
};

const selectedNode = computed(() => {
    if (!dialog.value.tree || !Array.isArray(dialog.value.tree.nodes)) return null;
    return dialog.value.tree.nodes.find(n => n.id === selectedNodeId.value);
});

const nodeOptions = computed(() => {
    const options = [
        { name: '--- END DIALOG ---', id: '_end' }
    ];
    if (dialog.value.tree && Array.isArray(dialog.value.tree.nodes)) {
        dialog.value.tree.nodes.forEach(n => {
            if (n.id !== selectedNodeId.value) {
                options.push({ name: n.name, id: n.id });
            }
        });
    }
    return options;
});

const onMouseDown = (e, nodeId) => {
    if (e.button !== 0) return;
    if (!dialog.value.tree || !Array.isArray(dialog.value.tree.nodes)) return;
    
    draggingNodeId.value = nodeId;
    const node = dialog.value.tree.nodes.find(n => n.id === nodeId);
    if (!node) return;

    dragOffset.value = {
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
    };
    selectedNodeId.value = nodeId;
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e) => {
    if (!draggingNodeId.value) return;
    if (!dialog.value.tree || !Array.isArray(dialog.value.tree.nodes)) return;
    const node = dialog.value.tree.nodes.find(n => n.id === draggingNodeId.value);
    if (node) {
        node.position.x = e.clientX - dragOffset.value.x;
        node.position.y = e.clientY - dragOffset.value.y;
    }
};

const onMouseUp = () => {
    draggingNodeId.value = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
};

const addAnswer = () => {
    if (!selectedNode.value) return;
    if (!Array.isArray(selectedNode.value.answers)) selectedNode.value.answers = [];
    selectedNode.value.answers.push({
        text: 'Answer text',
        next_node: null,
        action: null
    });
};

const removeAnswer = (index) => {
    if (!selectedNode.value || !Array.isArray(selectedNode.value.answers)) return;
    selectedNode.value.answers.splice(index, 1);
};

const connections = computed(() => {
    const list = [];
    if (!dialog.value.tree || !Array.isArray(dialog.value.tree.nodes)) return list;

    dialog.value.tree.nodes.forEach(node => {
        if (Array.isArray(node.answers)) {
            node.answers.forEach((answer, index) => {
                if (answer.next_node && answer.next_node !== '_end') {
                    const targetNode = dialog.value.tree.nodes.find(n => n.id === answer.next_node);
                    if (targetNode) {
                        // Start point: Exit dot on the right side of the node
                        const startX = node.position.x + 250; 
                        
                        // Vertical position of the answer exit port:
                        // Roughly: content-top-padding (24) + text (~20) + content-bottom-padding (16) + answers-list-padding (8) + item-padding (8) + half-text (7)
                        // Adjusted to match visual center of the blue dots
                        const startY = node.position.y + 90 + (index * 42); 
                        // End point: Entry dot on the LEFT side of target node
                        const endX = targetNode.position.x;
                        const endY = targetNode.position.y + 14;

                        list.push({
                            id: `${node.id}_${index}_${targetNode.id}`,
                            path: calculatePath(startX, startY, endX, endY)
                        });
                    }
                }
            });
        }
    });
    return list;
});

const calculatePath = (sX, sY, eX, eY) => {
    const cp1X = sX + (eX - sX) / 2;
    const cp2X = sX + (eX - sX) / 2;
    return `M ${sX} ${sY} C ${cp1X} ${sY}, ${cp2X} ${eY}, ${eX} ${eY}`;
};

onMounted(fetchDialog);
</script>

<template>
    <div class="dialog-edit-view">
        <EditViewHeader
            v-if="dialog && !loading"
            backRoute="/dialogs"
            :parentName="t('common.sidebar.dialogues').toUpperCase()"
            :itemName="dialog.title"
            :saving="saving"
            :deleting="deleting"
            @save="saveDialog"
            @delete="handleDelete"
        >
            <template #extra-actions>
                <Button :label="t('dialogs.edit.btn_new_node')" severity="warning" class="header-btn new-node-btn" @click="addNode" />
            </template>
        </EditViewHeader>

        <div class="editor-container" v-if="!loading">
            <!-- Canvas / Workspace -->
            <div class="workspace" @click.self="selectedNodeId = null">
                <svg class="connections-layer">
                    <path 
                        v-for="conn in connections" 
                        :key="conn.id" 
                        :d="conn.path" 
                        class="connection-line"
                    />
                </svg>

                <div 
                    v-for="node in dialog.tree.nodes" 
                    :key="node.id"
                    class="node-box"
                    :class="{ 
                        selected: selectedNodeId === node.id, 
                        entry_node: node.id === (dialog.tree.startNodeId || 'root') 
                    }"
                    :style="{ left: node.position.x + 'px', top: node.position.y + 'px' }"
                    @mousedown="onMouseDown($event, node.id)"
                >
                    <div class="node-tag" v-if="node.name">
                        {{ node.id === (dialog.tree.startNodeId || 'root') ? 'START' : node.name.toUpperCase() }}
                    </div>
                    <div class="node-port entry"></div>
                    
                    <div class="node-content">
                        <p class="node-text">"{{ node.text }}"</p>
                    </div>

                    <div class="node-answers-list">
                        <div v-for="(answer, idx) in node.answers" :key="idx" class="answer-item">
                            <span>{{ answer.text }}</span>
                            <div class="node-port exit" v-if="answer.next_node !== '_end'"></div>
                            <span class="end-dot" v-else>● END</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="properties-sidebar" v-if="selectedNodeId">
                <div class="sidebar-header">
                    <h2>{{ t('dialogs.edit.properties') }}</h2>
                    <Button icon="pi pi-times" text plain @click="selectedNodeId = null" />
                </div>
                
                <div class="sidebar-content">
                    <div class="field">
                        <label>{{ t('dialogs.edit.node_name') }}</label>
                        <InputText v-model="selectedNode.name" class="noir-input" />
                    </div>

                    <div class="field">
                        <label>{{ t('dialogs.edit.node_text') }}</label>
                        <Textarea v-model="selectedNode.text" rows="4" class="noir-input" />
                    </div>

                    <div class="field">
                        <label>{{ t('dialogs.edit.action_enter') }}</label>
                        <Select v-model="selectedNode.action" :options="actionOptions" optionLabel="label" optionValue="value" class="noir-select" :placeholder="t('dialogs.edit.select_action')" />
                    </div>

                    <div class="answers-section">
                        <div class="section-header">
                            <h3>{{ t('dialogs.edit.choices') }}</h3>
                            <span class="count">{{ t('dialogs.edit.choices_count', { count: selectedNode.answers.length }) }}</span>
                        </div>

                        <div v-for="(answer, idx) in selectedNode.answers" :key="idx" class="answer-edit-box">
                            <div class="answer-edit-header">
                                <span class="index">{{ idx + 1 }}</span>
                                <InputText v-model="answer.text" class="noir-input compact" />
                                <Button icon="pi pi-trash" severity="danger" text @click="removeAnswer(idx)" />
                            </div>
                            
                            <div class="field mini">
                                <label>{{ t('dialogs.edit.next_step') }}</label>
                                <Select v-model="answer.next_node" :options="nodeOptions" optionLabel="name" optionValue="id" class="noir-select compact" :placeholder="t('dialogs.edit.select_node')" />
                            </div>

                            <div class="field mini">
                                <label>{{ t('dialogs.edit.choice_action') }}</label>
                                <Select v-model="answer.action" :options="actionOptions" optionLabel="label" optionValue="value" class="noir-select compact" :placeholder="t('dialogs.edit.select_action')" />
                            </div>
                        </div>

                        <Button :label="t('dialogs.edit.add_choice')" severity="warning" outlined class="add-choice-btn" @click="addAnswer" />
                    </div>

                    <div class="sidebar-footer">
                        <Button 
                            v-if="selectedNodeId !== (dialog.tree.startNodeId || 'root')"
                            label="SET AS START NODE" 
                            severity="success" 
                            outlined 
                            class="start-node-btn mb-2" 
                            @click="dialog.tree.startNodeId = selectedNodeId" 
                        />
                        <Button :label="t('dialogs.edit.delete_node')" severity="danger" outlined class="delete-node-btn" @click="deleteNode(selectedNodeId)" />
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="loading-state">
            LOADING DIALOGUE SYSTEM...
        </div>

        <ConfirmationModal
            :visible="showDeleteConfirm"
            @update:visible="showDeleteConfirm = $event"
            @accept="deleteDialog"
            :message="t('dialogs.messages.confirm_delete')"
        />
    </div>
</template>

<style scoped>
.dialog-edit-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-noir-bg);
    color: var(--color-noir-text);
    padding: 0 1rem 0 0;
}

.noir-btn {
    font-weight: bold;
    text-transform: uppercase;
}

.header-btn {
    font-weight: bold !important;
    font-size: 0.8rem !important;
    padding: 0.5rem 1.5rem !important;
    height: 2.5rem !important;
}

.new-node-btn {
    background-color: rgba(245, 158, 11, 0.1) !important;
    border: 1px solid var(--color-noir-warning) !important;
    color: var(--color-noir-warning) !important;
}

.editor-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
}

.workspace {
    flex: 1;
    background-color: #05070a;
    background-image: 
        radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    position: relative;
    overflow: auto;
}

.connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 3000px; 
    height: 3000px;
    pointer-events: none;
    z-index: 1;
}

.connection-line {
    fill: none;
    stroke: var(--color-noir-accent);
    stroke-width: 2;
    stroke-dasharray: 4;
    opacity: 0.6;
}

.node-box {
    position: absolute;
    width: 250px;
    background-color: #111827;
    border: 1px solid #1f2937;
    border-radius: 4px;
    cursor: move;
    user-select: none;
    box-shadow: 0 4px 15px rgba(0,0,0,0.8);
    z-index: 10;
    padding: 0;
    transition: border-color 0.2s;
}

.node-box.selected {
    border-color: var(--color-noir-accent);
}

.node-box.entry_node {
    border-color: var(--color-noir-success);
}

.node-tag {
    position: absolute;
    top: -10px;
    left: 15px;
    background-color: #1a1f2e;
    color: var(--color-noir-accent);
    padding: 2px 10px;
    font-size: 0.6rem;
    font-weight: bold;
    border-radius: 2px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    z-index: 11;
}

.entry_node .node-tag {
    background-color: var(--color-noir-success);
    color: #000;
    border: none;
}

.node-port {
    width: 8px;
    height: 8px;
    background-color: var(--color-noir-accent);
    border: 2px solid #05070a;
    border-radius: 50%;
    position: absolute;
}

.node-port.entry {
    top: 10px;
    left: -4px;
    background-color: var(--color-noir-success);
}

.node-port.exit {
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
}

.node-content {
    padding: 1.5rem 1rem 1rem 1rem;
}

.node-text {
    font-style: italic;
    font-size: 1rem;
    line-height: 1.4;
    margin: 0;
    color: var(--color-noir-text);
}

.node-answers-list {
    padding: 0.5rem;
    background-color: rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.answer-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    background-color: #0b0f19;
    padding: 0.5rem 1rem;
    border-radius: 2px;
    font-size: 0.85rem;
    color: var(--color-noir-muted);
}

.answer-item .node-port.exit {
    background-color: var(--color-noir-accent);
}

.end-dot {
    color: var(--color-noir-danger);
    font-size: 0.6rem;
    font-weight: bold;
}

.properties-sidebar {
    width: 400px;
    background-color: var(--color-noir-dark);
    border-left: 1px solid var(--color-noir-panel);
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--color-noir-panel);
}

.sidebar-header h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 2px;
}

.sidebar-content {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.field label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
}

.noir-input, .noir-select {
    width: 100% !important;
}

.compact {
    padding: 0.5rem !important;
}

.answers-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-noir-panel);
    padding-bottom: 0.5rem;
}

.section-header h3 {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-noir-muted);
}

.count {
    font-size: 0.7rem;
}

.answer-edit-box {
    background-color: rgba(255,255,255,0.02);
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.answer-edit-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.index {
    color: var(--color-noir-accent);
    font-weight: bold;
    font-size: 0.8rem;
}

.field.mini label {
    font-size: 0.6rem;
    margin-bottom: 0.2rem;
}

.add-choice-btn {
    width: 100%;
}

.sidebar-footer {
    padding: 1rem;
    border-top: 1px solid var(--color-noir-panel);
}

.delete-node-btn {
    width: 100%;
}

.start-node-btn {
    width: 100%;
    margin-bottom: 0.75rem;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-family: var(--font-mono);
    font-size: 1.5rem;
    color: var(--color-noir-muted);
}
</style>
