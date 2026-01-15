import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'), // Assuming a DashboardView exists or we create a placeholder
        // Fallback if DashboardView doesn't exist yet, we can keep the inline template for now or create the file
        // component: { template: '<div>Dashboard Content</div>' } 
    },
    {
        path: '/emanator',
        name: 'emanator',
        component: () => import('../views/GameView.vue')
    },
    {
        path: '/scenes',
        name: 'scenes',
        component: () => import('../views/scenes/ScenesIndex.vue')
    },
    {
        path: '/scenes/:id/edit',
        name: 'scene-edit',
        component: () => import('../views/scenes/SceneEdit.vue')
    },
    {
        path: '/scenes/:id/gateway',
        name: 'scene-gateway',
        component: () => import('../views/scenes/SceneGateway.vue')
    },
    {
        path: '/scenes/:id/spawnpoint',
        name: 'scene-spawnpoint',
        component: () => import('../views/scenes/SceneSpawnpoint.vue')
    },
    {
        path: '/scenes/:id/settings',
        name: 'scene-settings',
        component: () => import('../views/scenes/SceneSettings.vue')
    },
    {
        path: '/scenes/map',
        name: 'scenes-map',
        component: () => import('../views/scenes/SceneMapView.vue')
    },
    {
        path: '/sectors',
        name: 'sectors',
        component: () => import('../views/sectors/SectorsIndex.vue')
    },
    {
        path: '/sectors/:id/edit',
        name: 'sector-edit',
        component: () => import('../views/sectors/SectorEdit.vue')
    },
    {
        path: '/sectors/map',
        name: 'sectors-map',
        component: () => import('../views/sectors/SectorMapView.vue')
    },
    {
        path: '/actions',
        name: 'actions',
        component: () => import('../views/actions/ActionsIndex.vue')
    },
    {
        path: '/actions/:id/edit',
        name: 'action-edit',
        component: () => import('../views/actions/ActionEdit.vue')
    },
    {
        path: '/dialogs',
        name: 'dialogs',
        component: () => import('../views/dialogs/DialogsIndex.vue')
    },
    {
        path: '/dialogs/:id/edit',
        name: 'dialog-edit',
        component: () => import('../views/dialogs/DialogEdit.vue')
    },
    {
        path: '/characters',
        name: 'characters',
        component: () => import('../views/characters/CharactersIndex.vue')
    },
    {
        path: '/characters/:id/edit',
        name: 'character-edit',
        component: () => import('../views/characters/CharacterEdit.vue')
    },
    {
        path: '/vehicles',
        name: 'vehicles',
        component: () => import('../views/characters/VehiclesIndex.vue')
    },
    {
        path: '/vehicles/:id/edit',
        name: 'vehicle-edit',
        component: () => import('../views/characters/CharacterEdit.vue')
    },
    {
        path: '/clues',
        name: 'clues',
        component: () => import('../views/clues/CluesIndex.vue')
    },
    {
        path: '/clues/:id/edit',
        name: 'clue-edit',
        component: () => import('../views/clues/ClueEdit.vue')
    },
    {
        path: '/animations',
        name: 'animations',
        component: () => import('../views/animations/AnimationsIndex.vue')
    },
    {
        path: '/animations/:id/edit',
        name: 'animation-edit',
        component: () => import('../views/animations/AnimationEdit.vue')
    },
    {
        path: '/notes',
        name: 'notes',
        component: () => import('../views/notes/NotesIndex.vue'),
    },
    { path: '/help', name: 'help', component: { template: '<div class="p-4"><h1>Help - Coming Soon</h1></div>' } },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
