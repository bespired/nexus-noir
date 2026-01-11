<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
    backRoute: {
        type: String,
        default: '/'
    },
    parentName: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        default: ''
    },
    saving: {
        type: Boolean,
        default: false
    },
    deleting: {
        type: Boolean,
        default: false
    },
    showButtons: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['save', 'delete']);
const router = useRouter();

const goBack = () => {
    router.push(props.backRoute);
};
</script>

<template>
    <div class="edit-view-header">
        <div class="edit-view-header__left">
            <div class="breadcrumb" @click="goBack">
                <span class="breadcrumb__back">← {{ parentName }}</span>
                <span v-if="itemName" class="breadcrumb__separator">/</span>
                <span v-if="itemName" class="breadcrumb__item">{{ itemName }}</span>
            </div>
        </div>

        <div class="edit-view-header__right">
            <slot name="extra-actions"></slot>
            <template v-if="showButtons">
                <Button
                    v-if="saving"
                    label="SAVE"
                    severity="success"
                    class="header-btn save-btn"
                    @click="emit('save')"
                    :loading="saving"
                />
                <Button
                    v-if="deleting"
                    label="DELETE"
                    severity="danger"
                    class="header-btn delete-btn"
                    @click="emit('delete')"
                    :loading="deleting"
                />
            </template>
        </div>
    </div>
</template>

<style scoped>
.edit-view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-noir-panel);
    margin-bottom: 1rem;
}

.edit-view-header__left {
    display: flex;
    align-items: center;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.breadcrumb:hover .breadcrumb__back {
    color: var(--color-noir-accent);
}

.breadcrumb__back {
    color: var(--color-noir-muted);
    transition: color 0.2s;
}

.breadcrumb__separator {
    color: var(--color-noir-panel);
}

.breadcrumb__item {
    color: var(--color-noir-text);
    font-weight: bold;
}

.edit-view-header__right {
    display: flex;
    gap: 0.75rem;
}

.header-btn {
    font-weight: bold !important;
    font-size: 0.8rem !important;
    padding: 0.5rem 1.5rem !important;
    height: 2.5rem !important;
}

.save-btn {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border: 1px solid var(--color-noir-success) !important;
    color: var(--color-noir-success) !important;
}

.delete-btn {
    background-color: rgba(239, 68, 68, 0.1) !important;
    border: 1px solid var(--color-noir-danger) !important;
    color: var(--color-noir-danger) !important;
}
</style>
