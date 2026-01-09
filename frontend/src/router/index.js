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
        component: () => import('../views/ScenesView.vue')
    },
    {
        path: '/sectors',
        name: 'sectors',
        component: () => import('../views/SectorsView.vue')
    },
    {
        path: '/actions',
        name: 'actions',
        component: () => import('../views/ActionsView.vue')
    },
    {
        path: '/dialogs',
        name: 'dialogs',
        component: () => import('../views/DialogsView.vue')
    },
    {
        path: '/characters',
        name: 'characters',
        component: () => import('../views/CharactersView.vue')
    },
    {
        path: '/vehicles',
        name: 'vehicles',
        component: () => import('../views/VehiclesView.vue')
    },
    {
        path: '/clues',
        name: 'clues',
        component: () => import('../views/CluesView.vue')
    },
    {
        path: '/notes',
        name: 'notes',
        component: () => import('../views/NotesView.vue'),
    },
    { path: '/help', name: 'help', component: { template: '<div class="p-4"><h1>Help - Coming Soon</h1></div>' } },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
