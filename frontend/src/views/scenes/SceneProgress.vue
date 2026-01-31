<template>
    <div class="scene-progress-container">
        <header class="progress-header">
            <div class="header-info">
                <h1 class="progress-title">Scene Asset Progress</h1>
                <p class="progress-subtitle">Tracking file status across nexus-scenes directory</p>
            </div>
            <div class="status-legend">
                <div class="legend-item">
                    <span class="legend-dot status-v"></span> Complete
                </div>
                <div class="legend-item">
                    <span class="legend-dot status-x"></span> Missing
                </div>
                <div class="legend-item">
                    <i class="pi pi-database legend-icon"></i> In Database
                </div>
            </div>
        </header>

        <div v-if="loading" class="loading-state">
            <i class="pi pi-spin pi-spinner loading-icon"></i>
            <p>Scanning directory structure...</p>
        </div>

        <div v-else-if="sectors.length === 0" class="empty-state">
            <i class="pi pi-folder-open empty-icon"></i>
            <p class="empty-text">No scene data found in /var/www/nexus-scenes</p>
        </div>

        <div v-else v-for="sector in sectors" :key="sector.name" class="sector-group">
            <div class="sector-header">
                <h2 class="sector-title">{{ sector.name }}</h2>
                <div class="sector-divider"></div>
            </div>

            <div class="grid-container">
                <!-- Header -->
                <div class="grid-row header">
                    <div class="col-name">Scene Name</div>
                    <div class="col-status" v-tooltip="'Local File'">PNG</div>
                    <div class="col-status" v-tooltip="'Database Record'">DB</div>
                    <div class="col-status" v-tooltip="'Local File'">FSPY</div>
                    <div class="col-status" v-tooltip="'Local File'">BLEND</div>
                    <div class="col-status" v-tooltip="'Local File'">GLB</div>
                    <div class="col-status" v-tooltip="'Database Record'">DB</div>
                </div>

                <!-- Rows -->
                <div v-for="scene in sector.scenes" :key="scene.name" class="grid-row scene-row">
                    <div class="col-name scene-info">
                        <span class="scene-prefix">--</span>
                        <router-link v-if="scene.id" :to="`/scenes/${scene.id}/edit`" class="scene-name-link">
                            {{ scene.name }}
                        </router-link>
                        <span v-else class="scene-name">{{ scene.name }}</span>
                    </div>

                    <div class="col-status">
                        <div :class="['status-dot', scene.png ? 'complete' : 'missing']" v-tooltip="scene.png ? 'PNG is ready' : 'PNG is missing'">
                            <i :class="['pi', scene.png ? 'pi-check-circle' : 'pi-times-circle']"></i>
                        </div>
                    </div>

                    <div class="col-status">
                         <div :class="['status-dot db', scene.db_png ? 'complete' : 'missing']" v-tooltip="scene.db_png ? 'Registered in DB' : 'Not in DB'">
                            <i :class="['pi', scene.db_png ? 'pi-database' : 'pi-exclamation-triangle']"></i>
                        </div>
                    </div>

                    <div class="col-status">
                        <div :class="['status-dot', scene.fspy ? 'complete' : 'missing']" v-tooltip="scene.fspy ? 'FSPY is ready' : 'FSPY is missing'">
                            <i :class="['pi', scene.fspy ? 'pi-check-circle' : 'pi-times-circle']"></i>
                        </div>
                    </div>

                    <div class="col-status">
                        <div :class="['status-dot', scene.blend ? 'complete' : 'missing']" v-tooltip="scene.blend ? 'BLEND is ready' : 'BLEND is missing'">
                            <i :class="['pi', scene.blend ? 'pi-check-circle' : 'pi-times-circle']"></i>
                        </div>
                    </div>

                    <div class="col-status">
                        <div :class="['status-dot', scene.glb ? 'complete' : 'missing']" v-tooltip="scene.glb ? 'GLB is ready' : 'GLB is missing'">
                            <i :class="['pi', scene.glb ? 'pi-check-circle' : 'pi-times-circle']"></i>
                        </div>
                    </div>

                    <div class="col-status">
                         <div :class="['status-dot db', scene.db_glb ? 'complete' : 'missing']" v-tooltip="scene.db_glb ? 'Registered in DB' : 'Not in DB'">
                            <i :class="['pi', scene.db_glb ? 'pi-database' : 'pi-exclamation-triangle']"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const sectors = ref([]);
const loading = ref(true);

const fetchProgress = async () => {
    try {
        const response = await fetch('/api/scenes/progress');
        if (!response.ok) throw new Error('Network response was not ok');
        sectors.value = await response.json();
    } catch (error) {
        console.error('Failed to fetch scene progress:', error);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchProgress();
});
</script>

<style scoped>
.scene-progress-container {
    color: #e4e4e7;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 1.5rem;
    max-width: 1000px;
    margin: 0 auto;
}

.progress-header {
    margin-bottom: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.progress-title {
    font-size: 2.25rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.5rem;
    letter-spacing: -0.025em;
}

.progress-subtitle {
    color: #a1a1aa;
}

.status-legend {
    display: flex;
    gap: 1rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 9999px;
    font-size: 0.75rem;
}

.legend-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
}

.legend-icon {
    font-size: 0.75rem;
    color: #71717a;
}

/* Loading & Empty States */
.loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem;
    color: #71717a;
    text-align: center;
}

.loading-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.empty-state {
    background: rgba(24, 24, 27, 0.3);
    border-radius: 1rem;
    border: 1px solid #27272a;
    border-style: dashed;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #3f3f46;
}

.empty-text {
    font-size: 1.25rem;
}

/* Sector Blocks */
.sector-group {
    margin-bottom: 3rem;
    animation: fadeIn 0.5s ease-out forwards;
}

.sector-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.sector-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #bababa;
    white-space: nowrap;
}

.sector-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(to right, rgba(96, 165, 250, 0.2), transparent);
}

/* Grid Layout */
.grid-container {
    background: rgba(24, 24, 27, 0.4);
    border-radius: 0.75rem;
    border: 1px solid #27272a;
    overflow: hidden;
    backdrop-filter: blur(4px);
}

.grid-row {
    display: grid;
    grid-template-columns: 1fr 70px 70px 70px 70px 70px 70px;
    align-items: stretch;
}

.grid-row.header {
    border-bottom: 1px solid #27272a;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.625rem;
    font-weight: 700;
}

.grid-row.scene-row {
    border-bottom: 1px solid rgba(39, 39, 42, 0.5);
    transition: background-color 0.2s;
}

.grid-row.scene-row:last-child {
    border-bottom: 0;
}

.grid-row.scene-row:hover {
    background-color: rgba(255, 255, 255, 0.03);
}

/* Columns */
.col-name {
    padding: 1rem 1.5rem;
}

.col-status {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 0;
}

.scene-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.scene-prefix {
    color: #52525b;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
}

.scene-name {
    font-weight: 500;
    color: #e4e4e7;
}

.scene-name-link {
    font-weight: 500;
    color: #60a5fa;
    text-decoration: none;
    transition: color 0.2s;
}

.scene-name-link:hover {
    color: #93c5fd;
    text-decoration: underline;
}

/* Status Dots */
.status-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
}

.status-dot.db {
    opacity: 0.8;
    scale: 0.9;
}

.status-dot.complete {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
}

.status-dot.missing {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.status-v { background-color: #22c55e; }
.status-x { background-color: #ef4444; }

@media (max-width: 768px) {
    .grid-row {
        grid-template-columns: 1fr 50px 50px 50px 50px 50px 50px;
    }

    .progress-title {
        font-size: 1.75rem;
    }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 8px;
}
::-webkit-scrollbar-track {
    background: #09090b;
}
::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: #3f3f46;
}
</style>
