<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'created']);

const { t } = useI18n();
const toast = useToast();

const newDialog = ref({
    title: ''
});

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveDialog = async () => {
    if (!newDialog.value.title) {
        toast.add({
            severity: 'error',
            summary: t('dialogs.messages.error_summary'),
            detail: t('dialogs.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/dialogs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newDialog.value)
        });

        if (!response.ok) throw new Error('Failed to save dialogue');

        const createdDialog = await response.json();

        toast.add({
            severity: 'success',
            summary: t('dialogs.messages.success_summary'),
            detail: t('dialogs.messages.success_detail'),
            life: 3000
        });

        emit('created', createdDialog);
        handleClose();
        newDialog.value = { title: '' };
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
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal dialog-modal"
        style="width: 30rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('dialogs.modal.title') }}</div>
        </template>

        <div class="dialog-form">
            <div class="field">
                <label for="title">{{ t('dialogs.modal.label_title') }}</label>
                <InputText id="title" v-model="newDialog.title" class="noir-input" :placeholder="t('dialogs.modal.placeholder_title')" autofocus />
            </div>
        </div>

        <template #footer>
            <Button :label="t('dialogs.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('dialogs.modal.btn_save')" severity="success" @click="handleSaveDialog" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.dialog-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.dialog-form .field {
    margin-bottom: 1.5rem;
}

.dialog-form label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
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
