<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

</script>

<template>
    <div class="about">
        <nexus-font type="blocky" label="GAME EMULATOR" />
    </div>
</template>

<style>
    .about {
        min-height: calc(100vh - 48px);
        display: flex;
        align-items: center;
        flex-direction: column;
        padding-top: 4rem;
    }
</style>