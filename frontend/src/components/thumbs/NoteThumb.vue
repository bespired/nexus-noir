<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    note: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['toggle-done', 'delete']);

const { t, locale } = useI18n();
const isDone = computed(() => props.note.is_done);

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
</script>

<template>
    <div class="note-thumb" :class="{ 'is-done': isDone }">
        <div class="note-header">
            <h3 class="note-title">{{ note.title }}</h3>
            <div class="note-actions">
                <button
                    class="action-btn done-btn"
                    @click="$emit('toggle-done', note)"
                    :title="isDone ? 'Mark as Undone' : 'Mark as Done'"
                >
                    <i class="pi" :class="isDone ? 'pi-check-circle' : 'pi-check'"></i>
                </button>
                <button
                    class="action-btn delete-btn"
                    @click="$emit('delete', note)"
                    title="Delete Note"
                >
                    <i class="pi pi-trash"></i>
                </button>
            </div>
        </div>

        <div class="note-content custom-scrollbar">
            {{ note.content }}
        </div>

        <div class="note-footer">
            <span class="note-date">{{ formatDate(note.created_at) }}</span>
            <span class="note-status">{{ isDone ? t('notes.status_done') : t('notes.status_active') }}</span>
        </div>
    </div>
</template>

<style scoped>
.note-thumb {
    background-color: var(--color-noir-panel);
    border: 1px solid #374151;
    border-radius: 4px;
    height: 250px;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    transition: all 0.2s ease;
    overflow: hidden;
}

/*
.note-thumb:hover {
    border-color: var(--color-noir-accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
}
*/

.note-thumb.is-done {
    opacity: 0.7;
    border-color: #1f2937;
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
}

.note-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-noir-text);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
}

.note-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.action-btn {
    background: transparent;
    border: 1px solid #4b5563;
    color: #9ca3af;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.action-btn:hover {
    background: #374151;
    color: white;
    border-color: #6b7280;
}

.done-btn:hover {
    color: var(--color-noir-success);
    border-color: var(--color-noir-success);
}
.done-btn .pi-check-circle {
    color: var(--color-noir-success);
}

.delete-btn:hover {
    color: var(--color-noir-danger);
    border-color: var(--color-noir-danger);
}

.note-content {
    flex: 1;
    overflow-y: auto;
    font-size: 0.9rem;
    color: #d1d5db;
    line-height: 1.5;
    margin-bottom: 0.75rem;
    padding-right: 0.5rem;
    white-space: pre-wrap;
}

/* Custom Scrollbar for content */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: #111827;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

.note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #6b7280;
    border-top: 1px solid #374151;
    padding-top: 0.75rem;
    margin-top: auto;
}

.note-status {
    font-weight: bold;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.is-done .note-status {
    color: var(--color-noir-success);
}
</style>
