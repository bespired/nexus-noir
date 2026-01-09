<script setup>
import { ref, onMounted } from 'vue';
import NoteThumb from '../components/thumbs/NoteThumb.vue';

const notes = ref([]);
const loading = ref(true);

const fetchNotes = async () => {
    try {
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Failed to fetch notes');
        notes.value = await response.json();
        // Sort: Active first, then by date desc
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
            console.error('Failed to update note status');
        }
    } catch (error) {
        note.is_done = originalStatus;
        console.error(error);
    }
};

const handleDelete = async (note) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

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
            console.error('Failed to delete note');
        }
    } catch (error) {
        fetchNotes();
        console.error(error);
    }
};

onMounted(() => {
    fetchNotes();
});
</script>

<template>
    <div class="notes-view">
        <div class="view-header">
            <h1 class="view-title">NOTES</h1>
            <Button label="+ new" severity="warning" class="new-btn" />
        </div>
        
        <div class="notes-grid">
            <div v-if="loading" class="loading-state">Loading notes...</div>
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
