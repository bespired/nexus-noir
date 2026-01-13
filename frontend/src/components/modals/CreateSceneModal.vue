<script setup>
import { ref, onMounted } from 'vue';
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

const newScene = ref({
    title: '',
    description: '',
    sector_id: null,
    type: 'walkable-area'
});

const sectors = ref([]);
const sceneTypes = ref([
    { label: t('scenes.modal.type_walkable'), value: 'walkable-area' },
    { label: t('scenes.modal.type_vue'), value: 'vue-component' },
    { label: t('scenes.modal.type_investigation'), value: 'investigation' },
    { label: t('scenes.modal.type_combat'), value: 'combat' },
    { label: t('scenes.modal.type_cutscene'), value: 'cut-scene' }
]);

const saving = ref(false);

const fetchSectors = async () => {
    try {
        const response = await fetch('/api/sectors');
        if (!response.ok) throw new Error('Failed to fetch sectors');
        sectors.value = await response.json();
    } catch (error) {
        console.error('Error fetching sectors:', error);
    }
};

onMounted(() => {
    fetchSectors();
});

const handleClose = () => {
    emit('update:visible', false);
};

const handleSaveScene = async () => {
    if (!newScene.value.title) {
        toast.add({
            severity: 'error',
            summary: t('scenes.messages.error_summary'),
            detail: t('scenes.messages.error_fill_fields'),
            life: 3000
        });
        return;
    }

    saving.value = true;
    try {
        const response = await fetch('/api/scenes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(newScene.value)
        });

        if (!response.ok) throw new Error('Failed to save scene');

        const createdScene = await response.json();

        toast.add({
            severity: 'success',
            summary: t('scenes.messages.success_summary'),
            detail: t('scenes.messages.success_detail'),
            life: 3000
        });

        emit('created', createdScene);
        handleClose();
        resetForm();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.messages.error_summary'),
            detail: t('scenes.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const resetForm = () => {
    newScene.value = {
        title: '',
        description: '',
        sector_id: null,
        type: 'walkable-area'
    };
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal scene-modal"
        style="width: 35rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ t('scenes.modal.title') }}</div>
        </template>

        <div class="scene-form">
            <div class="field">
                <label for="title">{{ t('scenes.modal.label_title') }}</label>
                <InputText id="title" v-model="newScene.title" class="noir-input" :placeholder="t('scenes.modal.placeholder_title')" autofocus />
            </div>

            <div class="grid">
                <div class="col-6 field">
                    <label for="sector">{{ t('scenes.modal.label_sector') }}</label>
                    <Select
                        id="sector"
                        v-model="newScene.sector_id"
                        :options="sectors"
                        optionLabel="name"
                        optionValue="id"
                        class="noir-select w-full"
                        :placeholder="t('scenes.modal.label_sector')"
                        showClear
                    />
                </div>
                <div class="col-6 field">
                    <label for="type">{{ t('scenes.modal.label_type') }}</label>
                    <Select
                        id="type"
                        v-model="newScene.type"
                        :options="sceneTypes"
                        optionLabel="label"
                        optionValue="value"
                        class="noir-select w-full"
                    />
                </div>
            </div>

            <div class="field">
                <label for="description">{{ t('scenes.modal.label_description') }}</label>
                <Textarea id="description" v-model="newScene.description" rows="5" class="noir-input" :placeholder="t('scenes.modal.placeholder_description')" />
            </div>
        </div>

        <template #footer>
            <Button :label="t('scenes.modal.btn_cancel')" text plain @click="handleClose" class="cancel-btn" />
            <Button :label="t('scenes.modal.btn_save')" severity="success" @click="handleSaveScene" :loading="saving" class="save-btn" />
        </template>
    </Dialog>
</template>

<style scoped>
.scene-form {
    padding-top: 0.5rem;
}

.noir-input, .noir-select {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.scene-form .field {
    margin-bottom: 1.5rem;
}

.scene-form label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.grid {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.col-6 {
    flex: 1;
}

.grid .field {
    margin-bottom: 0;
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
