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

const newAction = ref({
    name: '',
    description: ''
});

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveAction = async () => {
    if (!newAction.value.name || !newAction.value.description) {
        toast.add({
            severity: 'error',
            summary: t('actions.messages.error_summary'),
            detail: t('actions.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newAction.value)
        });

        if (!response.ok) throw new Error('Failed to save action');

        const createdAction = await response.json();

        toast.add({
            severity: 'success',
            summary: t('actions.messages.success_summary'),
            detail: t('actions.messages.success_detail'),
            life: 3000
        });

        emit('created', createdAction);
        handleClose();
        newAction.value = { name: '', description: '' };
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('actions.messages.error_summary'),
            detail: t('actions.messages.error_save'),
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
        class="noir-modal action-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('actions.modal.title') }}</div>
        </template>

        <div class="action-form">
            <div class="field">
                <label for="name">{{ t('actions.modal.label_title') }}</label>
                <InputText id="name" v-model="newAction.name" class="noir-input" :placeholder="t('actions.modal.placeholder_title')" autofocus />
            </div>
            <div class="field">
                <label for="description">{{ t('actions.modal.label_description') }}</label>
                <Textarea id="description" v-model="newAction.description" rows="5" class="noir-input" :placeholder="t('actions.modal.placeholder_description')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('actions.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('actions.modal.btn_save')" severity="success" @click="handleSaveAction" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.action-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.action-form .field {
    margin-bottom: 1.5rem;
}

.action-form label {
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
