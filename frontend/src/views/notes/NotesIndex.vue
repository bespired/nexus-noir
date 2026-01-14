<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import NoteThumb from '@components/editor/thumbs/NoteThumb.vue';
import CreateNoteModal from '@components/editor/modals/CreateNoteModal.vue';

const { t } = useI18n();
const toast = useToast();
const notes = ref([]);
const loading = ref(true);
const showCreateModal = ref(false);
const showDeleteConfirm = ref(false);
const noteToDelete = ref(null);

const fetchNotes = async () => {
    try {
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Failed to fetch notes');
        notes.value = await response.json();
        sortNotes();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const sortNotes = () => {
    notes.value.sort((a, b) => {
        if (a.is_done === b.is_done) {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        return a.is_done ? 1 : -1;
    });
};

const onNoteCreated = (newNote) => {
    notes.value.push(newNote);
    sortNotes();
};


const handleToggleDone = async (note) => {
    // Optimistic update
    const originalStatus = note.is_done;
    note.is_done = !originalStatus;
    sortNotes(); // Re-sort immediately to reflect change in UI? Or maybe wait?
                 // User request: "updates when pressed". Let's update status, maybe Re-sorting immediately is jarring.
                 // Let's keep it in place but update status.
                 // Actually, usually users prefer items stay in place until refresh or explicit sort.
                 // But the screenshot shows "Active" vs maybe "Done" sections?
                 // Let's just update the value.

    try {
        const response = await fetch(`/api/notes/${note.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ is_done: note.is_done })
        });

        if (!response.ok) {
            // Revert on failure
            note.is_done = originalStatus;
            toast.add({ severity: 'error', summary: t('notes.messages.error_summary'), detail: t('notes.messages.error_save'), life: 3000 });
        } else {
            toast.add({ severity: 'success', summary: t('notes.messages.success_summary'), detail: t('notes.messages.success_update'), life: 3000 });
        }
    } catch (error) {
        note.is_done = originalStatus;
        console.error(error);
        toast.add({ severity: 'error', summary: t('notes.messages.error_summary'), detail: 'Failed to update note', life: 3000 });
    }
};

const handleDelete = (note) => {
    noteToDelete.value = note;
    showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
    if (!noteToDelete.value) return;
    const note = noteToDelete.value;

    // Optimistic remove
    const index = notes.value.findIndex(n => n.id === note.id);
    if (index !== -1) {
        notes.value.splice(index, 1);
    }

    try {
        const response = await fetch(`/api/notes/${note.id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            // Revert (fetch all again to be safe)
            fetchNotes();
            toast.add({ severity: 'error', summary: t('notes.messages.error_summary'), detail: t('notes.messages.error_save'), life: 3000 });
        } else {
            toast.add({ severity: 'success', summary: t('notes.messages.success_summary'), detail: t('notes.messages.success_delete'), life: 3000 });
        }
    } catch (error) {
        fetchNotes();
        console.error(error);
        toast.add({ severity: 'error', summary: t('notes.messages.error_summary'), detail: 'Failed to delete note', life: 3000 });
    } finally {
        noteToDelete.value = null;
    }
};

onMounted(() => {
    fetchNotes();
});
</script>

<template>
    <div class="notes-view">
        <div class="view-header">
            <h1 class="view-title">{{ t('notes.title') }}</h1>
            <Button :label="t('common.actions.new')" severity="warning" class="new-btn" @click="showCreateModal = true" />
        </div>

        <ConfirmationModal
            v-model:visible="showDeleteConfirm"
            :title="t('common.confirm.default_title')"
            :message="t('notes.messages.confirm_delete')"
            @accept="confirmDelete"
        />

        <!-- NEW NOTE MODAL -->
        <CreateNoteModal
            v-model:visible="showCreateModal"
            @created="onNoteCreated"
        />

        <div class="notes-grid">
            <div v-if="loading" class="loading-state">{{ t('notes.loading') }}</div>
            <NoteThumb
                v-else
                v-for="note in notes"
                :key="note.id"
                :note="note"
                @toggle-done="handleToggleDone"
                @delete="handleDelete"
            />
        </div>
    </div>
</template>

<style scoped>
.notes-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--color-noir-text);
}

.notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.5rem;
}

.loading-state {
    color: var(--color-noir-muted);
    font-size: 1.2rem;
    text-align: center;
    grid-column: 1 / -1;
    padding: 2rem;
}
</style>
