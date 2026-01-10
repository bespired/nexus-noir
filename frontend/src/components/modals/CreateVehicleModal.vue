<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'created']);

const { t } = useI18n();
const toast = useToast();

const newVehicle = ref({
    name: '',
    role: 'decor',
    description: '',
    is_playable: false,
    motive: '',
    type: 'vehicle'
});

const roleOptions = ref([
    { label: t('vehicles.modal.role_decor'), value: 'decor' },
    { label: t('vehicles.modal.role_animated'), value: 'animated' }
]);

const saving = ref(false);

// Logic: is_playable is true if role is animated
watch(() => newVehicle.value.role, (newRole) => {
    newVehicle.value.is_playable = (newRole === 'animated');
});

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveVehicle = async () => {
    if (!newVehicle.value.name) {
        toast.add({
            severity: 'error',
            summary: t('vehicles.messages.error_summary'),
            detail: t('vehicles.messages.error_fill_fields'),
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
            body: JSON.stringify(newVehicle.value)
        });

        if (!response.ok) throw new Error('Failed to save vehicle');

        const createdVehicle = await response.json();

        toast.add({
            severity: 'success',
            summary: t('vehicles.messages.success_summary'),
            detail: t('vehicles.messages.success_detail'),
            life: 3000
        });

        emit('created', createdVehicle);
        handleClose();
        resetForm();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('vehicles.messages.error_summary'),
            detail: t('vehicles.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const resetForm = () => {
    newVehicle.value = {
        name: '',
        role: 'decor',
        description: '',
        is_playable: false,
        motive: '',
        type: 'vehicle'
    };
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal vehicle-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('vehicles.modal.title') }}</div>
        </template>

        <div class="vehicle-form">
            <div class="field">
                <label for="name">{{ t('vehicles.modal.label_name') }}</label>
                <InputText id="name" v-model="newVehicle.name" class="noir-input" :placeholder="t('vehicles.modal.placeholder_name')" autofocus />
            </div>

            <div class="field">
                <label for="role">{{ t('vehicles.modal.label_role') }}</label>
                <Select
                    id="role"
                    v-model="newVehicle.role"
                    :options="roleOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="noir-select w-full"
                />
            </div>

            <div class="field">
                <label for="description">{{ t('vehicles.modal.label_description') }}</label>
                <Textarea id="description" v-model="newVehicle.description" rows="5" class="noir-input" :placeholder="t('vehicles.modal.placeholder_description')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('vehicles.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('vehicles.modal.btn_save')" severity="success" @click="handleSaveVehicle" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.vehicle-form {
    padding-top: 0.5rem;
}

.noir-input, .noir-select {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.vehicle-form .field {
    margin-bottom: 1.5rem;
}

.vehicle-form label {
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
