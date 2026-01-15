<script setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'nl' : 'en';
}
</script>

<template>
  <div class="app-layout">
    <Toast />
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content Area -->
    <div class="main-wrapper">
      <!-- Top Bar (Optional, for language toggle or user info) -->
      <header class="top-bar">

        <nexus-font label="Nexus Noir" class="red-font"/>

        <Button
            :label="locale.toUpperCase()"
            @click="toggleLanguage"
            text
            plain
            class="lang-btn"
        />
      </header>

      <!-- Content Router View -->
      <main class="main-content">

         <!-- This slot or router-view will be populated by the router -->
         <!-- For now, showing the welcome card as a placeholder -->
         <div class="content-center">
            <RouterView />
         </div>
      </main>
    </div>
  </div>
</template>

<style>
/* Global Layout */
.app-layout {
    display: flex;
    height: 100vh;
    width: 100%;
    background-color: var(--color-noir-bg);
    color: var(--color-noir-text);
    overflow: hidden;
}

.main-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
}

/* Top Bar */
.top-bar {
    height: 3rem;
    border-bottom: 1px solid var(--color-noir-panel);
    background-color: var(--color-noir-dark);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1rem;
    gap: 1rem;
}

.lang-btn {
    color: var(--color-noir-muted) !important;
}
.lang-btn:hover {
    color: var(--color-noir-text) !important;
}

/* Main Content */
.main-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
}

.content-center {
/*    display: flex;
    align-items: center;
    justify-content: center;*/
    height: 100%;
    position: relative;
}

/* Noir Cards */
.noir-card {
    background-color: var(--color-noir-panel) !important;
    color: var(--color-noir-text) !important;
    border: 1px solid var(--color-noir-panel) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important;
}

.welcome-card {
    width: 25rem;
    overflow: hidden;
}

.card-title {
    font-size: 1.25rem;
    font-weight: 700;
}

.card-text {
    margin: 0;
    color: var(--color-noir-muted);
}

.action-btn {
    width: 100%;
}



::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}


</style>
