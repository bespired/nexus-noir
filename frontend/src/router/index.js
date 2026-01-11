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
        path: '/about',
        name: 'about',
        component: () => import('../views/AboutView.vue')
    },
    {
        path: '/scenes',
        name: 'scenes',
        component: () => import('../views/scenes/ScenesIndex.vue')
    },
    {
        path: '/sectors',
        name: 'sectors',
        component: () => import('../views/sectors/SectorsIndex.vue')
    },
    {
        path: '/sectors/:id',
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
        path: '/dialogs',
        name: 'dialogs',
        component: () => import('../views/dialogs/DialogsIndex.vue')
    },
    {
        path: '/characters',
        name: 'characters',
        component: () => import('../views/characters/CharactersIndex.vue')
    },
    {
        path: '/characters/:id',
        name: 'character-edit',
        component: () => import('../views/characters/CharacterEdit.vue')
    },
    {
        path: '/vehicles',
        name: 'vehicles',
        component: () => import('../views/characters/VehiclesIndex.vue')
    },
    {
        path: '/vehicles/:id',
        name: 'vehicle-edit',
        component: () => import('../views/characters/CharacterEdit.vue')
    },
    {
        path: '/clues',
        name: 'clues',
        component: () => import('../views/clues/CluesIndex.vue')
    },
    {
        path: '/clues/:id',
        name: 'clue-edit',
        component: () => import('../views/clues/ClueEdit.vue')
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
