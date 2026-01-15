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

const newAnimation = ref({
    name: '',
    description: '',
    type: 'mixamo'
});

const typeOptions = [
    { label: 'Mixamo', value: 'mixamo' },
    { label: 'Blender', value: 'blender' },
    { label: 'Other', value: 'other' }
];

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveAnimation = async () => {
    if (!newAnimation.value.name) {
        toast.add({
            severity: 'error',
            summary: t('animations.messages.error_summary'),
            detail: t('animations.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/animations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newAnimation.value)
        });

        if (!response.ok) throw new Error('Failed to save animation');

        const createdAnimation = await response.json();

        toast.add({
            severity: 'success',
            summary: t('animations.messages.success_summary'),
            detail: t('animations.messages.success_detail'),
            life: 3000
        });

        emit('created', createdAnimation);
        handleClose();
        resetForm();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('animations.messages.error_summary'),
            detail: t('animations.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const resetForm = () => {
    newAnimation.value = {
        name: '',
        description: '',
        type: 'mixamo'
    };
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal animation-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('animations.modal.title') }}</div>
        </template>

        <div class="animation-form">
            <div class="field">
                <label for="name">{{ t('animations.modal.label_name') }}</label>
                <InputText id="name" v-model="newAnimation.name" class="noir-input" :placeholder="t('animations.modal.placeholder_name')" autofocus />
            </div>

            <div class="field">
                <label for="type">{{ t('animations.modal.label_type') }}</label>
                <Select id="type" v-model="newAnimation.type" :options="typeOptions" optionLabel="label" optionValue="value" class="noir-input" />
            </div>

            <div class="field">
                <label for="description">{{ t('animations.modal.label_description') }}</label>
                <Textarea id="description" v-model="newAnimation.description" rows="3" class="noir-input" :placeholder="t('animations.modal.placeholder_description')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('animations.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('animations.modal.btn_save')" severity="success" @click="handleSaveAnimation" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.animation-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.animation-form .field {
    margin-bottom: 1.2rem;
}

.animation-form label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.4rem;
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
