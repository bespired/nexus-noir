<script setup>
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: 'pi pi-exclamation-triangle'
    },
    severity: {
        type: String,
        default: 'danger' // danger for delete, warning for others
    }
});

const emit = defineEmits(['update:visible', 'accept', 'reject']);

const { t } = useI18n();

const handleAccept = () => {
    emit('accept');
    emit('update:visible', false);
};

const handleReject = () => {
    emit('reject');
    emit('update:visible', false);
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        dismissableMask
        class="noir-modal confirmation-modal"
        style="width: 30rem"
    >
        <template #header>
            <div class="p-dialog-title">{{ title || t('common.confirm.default_title') }}</div>
        </template>

        <div class="confirmation-content">
            <i :class="icon" class="confirmation-icon"></i>
            <span class="confirmation-message">{{ message }}</span>
        </div>

        <template #footer>
            <Button
                :label="t('common.confirm.btn_no')"
                text
                plain
                @click="handleReject"
                class="cancel-btn"
            />
            <Button
                :label="t('common.confirm.btn_yes')"
                :severity="severity"
                @click="handleAccept"
                class="confirm-btn"
            />
        </template>
    </Dialog>
</template>

<style scoped>
.confirmation-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.5rem 0;
}

.confirmation-icon {
    font-size: 2.5rem;
    color: var(--color-noir-warning);
}

.confirmation-message {
    font-size: 1.1rem;
    line-height: 1.4;
    color: var(--color-noir-text);
}

.cancel-btn {
    color: var(--color-noir-muted) !important;
}

.confirm-btn {
    font-weight: bold !important;
}

/* Specific styling for danger severity to match success styling pattern */
:deep(.p-button-danger) {
    background-color: var(--color-noir-danger) !important;
    border-color: var(--color-noir-danger) !important;
    color: #000 !important;
}

:deep(.p-button-warning) {
    background-color: var(--color-noir-warning) !important;
    border-color: var(--color-noir-warning) !important;
    color: #000 !important;
}
</style>
