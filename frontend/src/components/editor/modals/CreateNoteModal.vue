<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'created']);

const { t } = useI18n();
const toast = useToast();

const newNote = ref({
    title: '',
    content: ''
});
const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveNote = async () => {
    if (!newNote.value.title || !newNote.value.content) {
        toast.add({
            severity: 'error',
            summary: t('notes.messages.error_summary'),
            detail: t('notes.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newNote.value)
        });

        if (!response.ok) throw new Error('Failed to save note');

        const createdNote = await response.json();

        toast.add({
            severity: 'success',
            summary: t('notes.messages.success_summary'),
            detail: t('notes.messages.success_detail'),
            life: 3000
        });

        emit('created', createdNote);
        handleClose();
        newNote.value = { title: '', content: '' };
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('notes.messages.error_summary'),
            detail: t('notes.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal"
        style="width: 40rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('notes.modal.title') }}</div>
        </template>

        <div class="note-form">
            <div class="field">
                <label for="title">{{ t('notes.modal.label_title') }}</label>
                <InputText id="title" v-model="newNote.title" class="noir-input" :placeholder="t('notes.modal.placeholder_title')" />
            </div>
            <div class="field">
                <label for="content">{{ t('notes.modal.label_content') }}</label>
                <Textarea id="content" v-model="newNote.content" rows="5" class="noir-input" :placeholder="t('notes.modal.placeholder_content')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('notes.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('notes.modal.btn_save')" severity="success" @click="handleSaveNote" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.note-form .field {
    margin-bottom: 1.5rem;
}

.note-form label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
}

.cancel-btn {
    color: var(--color-noir-muted) !important;
}

.save-btn {
    background-color: var(--color-noir-success) !important;
    color: #000 !important;
    font-weight: bold !important;
}
</style>
