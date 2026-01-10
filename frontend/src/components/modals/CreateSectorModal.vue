<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'created']);

const { t } = useI18n();
const toast = useToast();

const newSector = ref({
    name: '',
    description: ''
});

const saving = ref(false);

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveSector = async () => {
    if (!newSector.value.name) {
        toast.add({ 
            severity: 'error', 
            summary: t('sectors.messages.error_summary'), 
            detail: t('sectors.messages.error_fill_fields'), 
            life: 3000 
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/sectors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newSector.value)
        });

        if (!response.ok) throw new Error('Failed to save sector');

        const createdSector = await response.json();
        
        toast.add({ 
            severity: 'success', 
            summary: t('sectors.messages.success_summary'), 
            detail: t('sectors.messages.success_detail'), 
            life: 3000 
        });

        emit('created', createdSector);
        handleClose();
        resetForm();
    } catch (error) {
        console.error(error);
        toast.add({ 
            severity: 'error', 
            summary: t('sectors.messages.error_summary'), 
            detail: t('sectors.messages.error_save'), 
            life: 3000 
        });
    } finally {
        saving.value = false;
    }
};

const resetForm = () => {
    newSector.value = {
        name: '',
        description: ''
    };
};
</script>

<template>
    <Dialog 
        :visible="visible" 
        @update:visible="emit('update:visible', $event)"
        modal 
        dismissableMask
        class="noir-modal sector-modal" 
        style="width: 30rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('sectors.modal.title') }}</div>
        </template>

        <div class="sector-form">
            <div class="field">
                <label for="name">{{ t('sectors.modal.label_name') }}</label>
                <InputText id="name" v-model="newSector.name" class="noir-input" :placeholder="t('sectors.modal.placeholder_name')" autofocus />
            </div>

            <div class="field">
                <label for="description">{{ t('sectors.modal.label_description') }}</label>
                <Textarea id="description" v-model="newSector.description" rows="5" class="noir-input" :placeholder="t('sectors.modal.placeholder_description')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('sectors.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('sectors.modal.btn_save')" severity="success" @click="handleSaveSector" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.sector-form {
    padding-top: 0.5rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.sector-form .field {
    margin-bottom: 1.5rem;
}

.sector-form label {
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
