<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import EditViewHeader from '@components/customs/EditViewHeader.vue';

const route = useRoute();
const sceneId = route.params.id;
const scene = ref(null);

const fetchScene = async () => {
    try {
        const response = await fetch(`/api/scenes/${sceneId}`);
        if (!response.ok) throw new Error('Failed to fetch scene');
        scene.value = await response.json();
    } catch (error) {
        console.error(error);
    }
};

const saving = ref(false);
const deleting = ref(false);

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type
            })
        });

        if (!response.ok) throw new Error('Failed to update scene');

        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Success',
            detail: t('scenes.edit.messages.success_update'),
            life: 3000
        });
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.error_save'),
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const handleDelete = async () => {
    if (!confirm(t('scenes.edit.confirm_delete'))) return;

    deleting.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to delete scene');

        toast.add({
            severity: 'success',
            summary: t('scenes.edit.messages.success_summary') || 'Deleted',
            detail: t('scenes.edit.messages.success_delete'),
            life: 3000
        });
        router.push('/scenes');
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: t('scenes.edit.messages.error_summary') || 'Error',
            detail: t('scenes.edit.messages.error_delete'),
            life: 3000
        });
    } finally {
        deleting.value = false;
    }
};

onMounted(fetchScene);
</script>

<template>
    <div class="scene-spawnpoint-view">
        <EditViewHeader
            v-if="scene"
            backRoute="/scenes"
            parentName="SCENES"
            :itemName="scene.title"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
        />

        <div v-if="scene" class="edit-layout">
            <!-- HEADER HERO -->
            <div class="edit-hero">
                <div class="edit-hero__left">
                    <h1 class="edit-hero__title">{{ scene.title }}</h1>
                </div>
                <div class="edit-hero__right">
                    <div class="scene-nav">
                        <router-link :to="`/scenes/${sceneId}/edit`" class="nav-link">{{ t('scenes.edit.nav_properties') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/gateway`" class="nav-link">{{ t('scenes.edit.nav_gateway') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/spawnpoint`" class="nav-link active">{{ t('scenes.edit.nav_3d') }}</router-link>
                    </div>
                    <span class="edit-hero__id">ID:{{ sceneId }}</span>
                </div>
            </div>

            <div class="placeholder-content">
                <h1>SPAWNPOINT (3D) EDIT</h1>
                <p>Coming soon...</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-spawnpoint-view {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.edit-hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--color-noir-dark);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    border-left: 4px solid var(--color-noir-accent);
}

.edit-hero__title {
    margin: 0;
    font-size: 2.5rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #fff;
}

.edit-hero__right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.edit-hero__id {
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    font-size: 0.9rem;
}

.scene-nav {
    display: flex;
    gap: 0.5rem;
}

.nav-link {
    text-decoration: none;
    color: var(--color-noir-muted);
    font-weight: bold;
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.2s;
    border: 1px solid transparent;
}

.nav-link:hover {
    color: var(--color-noir-text);
    background: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
    color: #fff;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid var(--color-noir-accent);
}

.placeholder-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-noir-muted);
}
</style>
