<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import EditViewHeader from '@components/editor/EditViewHeader.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sceneId = route.params.id;
const scene = ref(null);
const scenes = ref([]);
const vueComponents = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

const fetchInitialData = async () => {
    try {
        const [sceneRes, scenesRes, configRes] = await Promise.all([
            fetch(`/api/scenes/${sceneId}`),
            fetch('/api/scenes'),
            fetch('/api/configs/vue_components')
        ]);

        if (!sceneRes.ok) throw new Error('Failed to fetch scene');
        scene.value = await sceneRes.json();

        // Initialize data column if empty
        if (!scene.value.data) {
            scene.value.data = {
                component: { name: '', label: '' },
                nextSceneId: null,
                data: {}
            };
        }

        scenes.value = await scenesRes.json();
        
        const componentsConfig = await configRes.json();
        if (componentsConfig && componentsConfig.value) {
            try {
                vueComponents.value = JSON.parse(componentsConfig.value);
            } catch (e) {
                console.error("Failed to parse vue_components config", e);
                vueComponents.value = [];
            }
        }
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load data', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    saving.value = true;
    try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                title: scene.value.title,
                description: scene.value.description,
                sector_id: scene.value.sector_id,
                type: scene.value.type,
                data: scene.value.data
            })
        });

        if (!response.ok) throw new Error('Save failed');
        toast.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully', life: 3000 });
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const handleDelete = async () => {
    if (!confirm(t('scenes.edit.confirm_delete'))) return;
    deleting.value = true;
    try {
        await fetch(`/api/scenes/${sceneId}`, { method: 'DELETE' });
        router.push('/scenes');
    } catch (error) {
        console.error(error);
    } finally {
        deleting.value = false;
    }
};

const onComponentChange = (newValue) => {
    const comp = vueComponents.value.find(c => c.name === newValue);
    if (comp) {
        scene.value.data.component = { ...comp };
    }
};

const addDataKey = () => {
    const key = prompt("Enter key name (e.g. line3):");
    if (key && !scene.value.data.data[key]) {
        scene.value.data.data[key] = "";
    }
};

const removeDataKey = (key) => {
    delete scene.value.data.data[key];
};

onMounted(fetchInitialData);
</script>

<template>
    <div class="scene-settings-view">
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

        <div v-if="loading" class="loading-state">
            {{ t('scenes.edit.loading') }}
        </div>

        <div v-else-if="scene" class="edit-layout">
            <!-- HEADER HERO -->
            <div class="edit-hero">
                <div class="edit-hero__left">
                    <h1 class="edit-hero__title">{{ scene.title }}</h1>
                </div>
                <div class="edit-hero__right">
                    <div class="scene-nav">
                        <router-link :to="`/scenes/${sceneId}/edit`" class="nav-link">{{ t('scenes.edit.nav_properties') }}</router-link>
                        <router-link :to="`/scenes/${sceneId}/settings`" class="nav-link active">{{ t('scenes.edit.nav_settings') }}</router-link>
                    </div>
                    <span class="edit-hero__id">ID:{{ sceneId }}</span>
                </div>
            </div>

            <div class="scene-settings-grid">
                <div class="settings-column">
                    <div class="card p-6">
                        <h2 class="card-title mb-6">COMPONENT CONFIGURATION</h2>
                        
                        <div class="field mb-6">
                            <label>SELECT COMPONENT</label>
                            <Select
                                v-model="scene.data.component.name"
                                :options="vueComponents"
                                optionLabel="label"
                                optionValue="name"
                                class="noir-select w-full"
                                placeholder="Select a component"
                                @change="onComponentChange($event.value)"
                            />
                        </div>

                        <div class="field mb-6">
                            <label>NEXT SCENE</label>
                            <Select
                                v-model="scene.data.nextSceneId"
                                :options="scenes"
                                optionLabel="title"
                                optionValue="id"
                                class="noir-select w-full"
                                filter
                                placeholder="Select next scene"
                                showClear
                            />
                        </div>

                        <div class="data-section mt-8">
                            <div class="flex justify-between items-center mb-4">
                                <label class="section-label">DYNAMIC DATA</label>
                                <Button icon="pi pi-plus" label="ADD FIELD" size="small" text @click="addDataKey" />
                            </div>
                            
                            <div v-if="Object.keys(scene.data.data).length === 0" class="no-data-hint">
                                No data fields defined.
                            </div>

                            <div v-for="(value, key) in scene.data.data" :key="key" class="data-field mb-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="key-name">{{ key }}</span>
                                    <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeDataKey(key)" />
                                </div>
                                <InputText v-model="scene.data.data[key]" class="noir-input w-full" :placeholder="`Enter value for ${key}`" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="info-column">
                    <div class="card p-6">
                        <h2 class="card-title mb-4">INFO</h2>
                        <p class="text-sm text-gray-400">
                            Configure the behavior of this Vue Component scene.
                            The component selected will be rendered by the game engine.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scene-settings-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-right: 1rem;
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

.scene-settings-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
}

.card {
    background: var(--color-noir-panel);
    border: 1px solid #1f2937;
    border-radius: 4px;
}

.card-title {
    font-size: 0.9rem;
    letter-spacing: 2px;
    color: var(--color-noir-muted);
    border-bottom: 1px solid #111827;
    padding-bottom: 1rem;
}

.field label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-noir-muted);
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
}

.section-label {
    font-size: 0.75rem;
    color: var(--color-noir-accent);
    letter-spacing: 2px;
    font-weight: bold;
}

.key-name {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-noir-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 4px;
}

.no-data-hint {
    padding: 1rem;
    background: rgba(0,0,0,0.2);
    border: 1px dashed #1f2937;
    color: var(--color-noir-muted);
    font-size: 0.8rem;
    text-align: center;
}

.noir-input, .noir-select {
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
}

.loading-state {
    padding: 4rem;
    text-align: center;
    color: var(--color-noir-muted);
}

.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-8 { margin-top: 2rem; }
.p-6 { padding: 1.5rem; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.w-full { width: 100%; }
.flex-1 { flex: 1; }
</style>
