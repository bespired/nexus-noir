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

const newCharacter = ref({
    name: '',
    role: '',
    description: '',
    motive: '',
    is_playable: false,
    type: 'person'
});

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveCharacter = async () => {
    if (!newCharacter.value.name) {
        toast.add({
            severity: 'error',
            summary: t('characters.messages.error_summary'),
            detail: t('characters.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/characters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newCharacter.value)
        });

        if (!response.ok) throw new Error('Failed to save character');

        const createdCharacter = await response.json();

        toast.add({
            severity: 'success',
            summary: t('characters.messages.success_summary'),
            detail: t('characters.messages.success_detail'),
            life: 3000
        });

        emit('created', createdCharacter);
        handleClose();
        resetForm();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('characters.messages.error_summary'),
            detail: t('characters.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const resetForm = () => {
    newCharacter.value = {
        name: '',
        role: '',
        description: '',
        motive: '',
        is_playable: false,
        type: 'person'
    };
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal character-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('characters.modal.title') }}</div>
        </template>

        <div class="character-form">
            <div class="field">
                <label for="name">{{ t('characters.modal.label_name') }}</label>
                <InputText id="name" v-model="newCharacter.name" class="noir-input" :placeholder="t('characters.modal.placeholder_name')" autofocus />
            </div>

            <div class="field">
                <label for="role">{{ t('characters.modal.label_role') }}</label>
                <InputText id="role" v-model="newCharacter.role" class="noir-input" :placeholder="t('characters.modal.placeholder_role')" />
            </div>

            <div class="field">
                <label for="description">{{ t('characters.modal.label_description') }}</label>
                <Textarea id="description" v-model="newCharacter.description" rows="3" class="noir-input" :placeholder="t('characters.modal.placeholder_description')" />
            </div>

            <div class="field">
                <label for="motive">{{ t('characters.modal.label_motive') }}</label>
                <InputText id="motive" v-model="newCharacter.motive" class="noir-input" :placeholder="t('characters.modal.placeholder_motive')" />
            </div>

            <div class="field-checkbox">
                <Checkbox inputId="is_playable" v-model="newCharacter.is_playable" :binary="true" />
                <label for="is_playable" class="checkbox-label">{{ t('characters.modal.label_is_playable') }}</label>
            </div>
        </div>

        <template #footer>
            <Button :label="t('characters.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('characters.modal.btn_save')" severity="success" @click="handleSaveCharacter" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.character-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.character-form .field {
    margin-bottom: 1.2rem;
}

.character-form label:not(.checkbox-label) {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.4rem;
    text-transform: uppercase;
}

.field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
}

.checkbox-label {
    font-size: 0.9rem;
    color: var(--color-noir-text);
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
</style>
