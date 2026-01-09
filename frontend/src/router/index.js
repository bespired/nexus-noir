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
    { path: '/actions', name: 'actions', component: { template: '<div class="p-4"><h1>Actions - Coming Soon</h1></div>' } },
    { path: '/dialogs', name: 'dialogs', component: { template: '<div class="p-4"><h1>Dialogs - Coming Soon</h1></div>' } },
    { path: '/characters', name: 'characters', component: { template: '<div class="p-4"><h1>Characters - Coming Soon</h1></div>' } },
    { path: '/vehicles', name: 'vehicles', component: { template: '<div class="p-4"><h1>Vehicles - Coming Soon</h1></div>' } },
    { path: '/clues', name: 'clues', component: { template: '<div class="p-4"><h1>Clues - Coming Soon</h1></div>' } },
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
