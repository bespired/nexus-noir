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

const newClue = ref({
    title: '',
    type: 'image',
    description: '',
    initial: false
});

const typeOptions = ref([
    { label: 'Image',     value: 'image' },
    { label: '3D Object', value: 'object' },
    { label: 'GameState', value: 'gamestate' }
]);

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveClue = async () => {
    if (!newClue.value.title || !newClue.value.description) {
        toast.add({
            severity: 'error',
            summary: t('clues.messages.error_summary'),
            detail: t('clues.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/clues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                title: newClue.value.title,
                description: newClue.value.description,
                type: newClue.value.type,
                initial: newClue.value.initial ? 1 : 0
            })
        });

        if (!response.ok) throw new Error('Failed to save clue');

        const createdClue = await response.json();

        toast.add({
            severity: 'success',
            summary: t('clues.messages.success_summary'),
            detail: t('clues.messages.success_detail'),
            life: 3000
        });

        emit('created', createdClue);
        handleClose();

        // Reset form
        newClue.value = {
            title: '',
            type: 'image',
            description: '',
            initial: false
        };
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('clues.messages.error_summary'),
            detail: t('clues.messages.error_save'),
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
        class="noir-modal clue-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('clues.modal.title') }}</div>
        </template>

        <div class="clue-form">
            <!-- EVIDENCE (TITLE) -->
            <div class="field">
                <label for="title">{{ t('clues.modal.label_title') }}</label>
                <InputText id="title" v-model="newClue.title" class="noir-input" :placeholder="t('clues.modal.placeholder_title')" />
            </div>

            <!-- TYPE -->
            <div class="field">
                <label for="type">{{ t('clues.modal.label_type') }}</label>
                <Select
                    id="type"
                    v-model="newClue.type"
                    :options="typeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="noir-input noir-select"
                />
            </div>

            <!-- DESCRIPTION -->
            <div class="field">
                <label for="description">{{ t('clues.modal.label_description') }}</label>
                <Textarea id="description" v-model="newClue.description" rows="5" class="noir-input" :placeholder="t('clues.modal.placeholder_description')" />
            </div>

            <!-- INITIAL (CHECKBOX) -->
            <div class="field-checkbox">
                <Checkbox inputId="initial" v-model="newClue.initial" :binary="true" />
                <label for="initial" class="checkbox-label">{{ t('clues.modal.label_initial') }}</label>
            </div>
        </div>

        <template #footer>
            <Button :label="t('clues.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('clues.modal.btn_save')" severity="success" @click="handleSaveClue" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.clue-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

:deep(.p-select-label) {
    color: white !important;
}

.clue-form .field {
    margin-bottom: 1.5rem;
}

.clue-form label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.checkbox-label {
    margin-bottom: 0 !important;
    text-transform: none !important;
    font-size: 0.875rem !important;
    cursor: pointer;
}

.cancel-btn {
    color: var(--color-noir-muted) !important;
}

.save-btn {
    background-color: var(--color-noir-success) !important;
    color: #000 !important;
    font-weight: bold !important;
}

:deep(.p-checkbox-box) {
    background: #000 !important;
    border-color: #1f2937 !important;
}

:deep(.p-checkbox-checked .p-checkbox-box) {
    background: var(--color-noir-success) !important;
    border-color: var(--color-noir-success) !important;
}
</style>
