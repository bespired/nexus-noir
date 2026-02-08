<script setup>
import { RouterLink } from 'vue-router';
import { useStore }   from 'vuex';
import { computed }   from 'vue';
import { useI18n }    from 'vue-i18n';

const store = useStore();
const { t } = useI18n();

const navItems = computed(() => [
    { path: '/emanator',   svg: 'about',     icon: 'pi pi-info-circle', label: t('common.sidebar.game'),         title: t('common.sidebar.game')       },
    { path: '/',           svg: 'dashboard', icon: 'pi pi-chart-bar',   label: t('common.sidebar.dashboard'),    title: t('common.sidebar.dashboard')  },
    { path: '/sectors',    svg: 'map',       icon: 'pi pi-map',         label: t('common.sidebar.sectors'),      title: t('common.sidebar.sectors')    },
    { path: '/scenes',     svg: 'scene',     icon: 'pi pi-images',      label: t('common.sidebar.scenes'),       title: t('common.sidebar.scenes')     },
    { path: '/actions',    svg: 'behavior',  icon: 'pi pi-bolt',        label: t('common.sidebar.behavior'),     title: t('common.sidebar.behavior')   },
    { path: '/dialogs',    svg: 'dialogue',  icon: 'pi pi-comments',    label: t('common.sidebar.dialogues'),    title: t('common.sidebar.dialogues')  },
    { path: '/characters', svg: 'personage', icon: 'pi pi-users',       label: t('common.sidebar.characters'),   title: t('common.sidebar.characters') },
    { path: '/vehicles',   svg: 'vehicle',   icon: 'pi pi-car',         label: t('common.sidebar.vehicles'),     title: t('common.sidebar.vehicles')   },
    { path: '/animations', svg: 'animation', icon: 'pi pi-users',       label: t('common.sidebar.animations'),   title: t('common.sidebar.animations') },
    { path: '/music',      svg: 'music',     icon: 'pi pi-users',       label: t('common.sidebar.music'),        title: t('common.sidebar.music')      },
    { path: '/sounds',     svg: 'sound',     icon: 'pi pi-users',       label: t('common.sidebar.sounds'),       title: t('common.sidebar.sounds')     },
    { path: '/clues',      svg: 'clue',      icon: 'pi pi-search',      label: t('common.sidebar.clues'),        title: t('common.sidebar.clues')      },
    { path: '/notes',      svg: 'note',      icon: 'pi pi-file-edit',   label: t('common.sidebar.notes'),        title: t('common.sidebar.notes')      },
]);

const bottomItem = computed(() => [
    { path: '/help',       svg: 'help',      icon: 'pi pi-question-circle',  label: t('common.sidebar.help'),         title: t('common.sidebar.help')         },
]);
</script>

<template>
    <aside class="sidebar-container">
        <!-- Logo or Top Item -->
        <div class="bottom-nav">

        </div>

        <!-- Main Navigation -->
        <nav class="nav-list">
            <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                class="nav-item group"
                :class="{'v-spacer':item.svg==='about'}"
            >
                <!-- Icon -->
                <img :src="`/icons/${item.svg}.svg`" :alt="item.title" class="nav-icon" />

                <!-- Tooltip -->
                 <div class="tooltip">
                    {{ item.title }}
                </div>
            </RouterLink>
        </nav>

        <!-- Bottom Navigation -->
        <div class="bottom-nav">
             <RouterLink
                v-for="item in bottomItem"
                :key="item.path"
                :to="item.path"
                class="nav-item group"
            >
                <img :src="`/icons/${item.svg}.svg`" :alt="item.title" class="nav-icon" />
                 <div class="tooltip">
                    {{ item.title }}
                </div>
            </RouterLink>
        </div>
    </aside>
</template>

<style scoped>
.sidebar-container {
    width: 4rem; /* w-16 */
    height: 100vh;
    background-color: #000000;
    border-right: 1px solid var(--color-noir-panel);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1rem;
    padding-bottom: 1rem;
    z-index: 50;
    position: relative;
}

.logo-container {
    margin-bottom: 1.5rem;
}

.logo-box {
    width: 2.5rem;
    height: 2.5rem;
    background-color: var(--color-noir-panel);
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-noir-accent);
}

.logo-icon {
    font-size: 1.2rem;
}

.nav-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 0.5rem;
    box-sizing: border-box;
}

.nav-list .v-spacer {
    margin-top: -14px;
    margin-bottom: 10px;
}

.bottom-nav {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    padding: 0 0.5rem;
    margin-top: auto;
    box-sizing: border-box;
}

.nav-item {
    width: 100%;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    color: var(--color-noir-muted);
    transition: background-color 0.2s, color 0.2s;
    position: relative;
    text-decoration: none;
}

.nav-item:hover, .nav-item.router-link-active {
    background-color: var(--color-noir-panel);
    color: var(--color-noir-text);
}

.nav-icon {
    width: auto;
    height: 2rem;
    object-fit: contain;
    /*filter: grayscale(100%);*/
    opacity: 0.7;
    transition: filter 0.2s, opacity 0.2s;
}

.nav-item:hover .nav-icon, .nav-item.router-link-active .nav-icon {
    filter: none;
    opacity: 1;
}

.tooltip {
    position: absolute;
    left: 100%;
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    background-color: var(--color-noir-panel);
    color: var(--color-noir-text);
    font-size: 0.75rem;
    border-radius: 0.25rem;
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    z-index: 50;
    transition: opacity 0.2s;
    border: 1px solid var(--color-noir-dark);
}

.nav-item:hover .tooltip {
    opacity: 1;
}
</style>
