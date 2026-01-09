<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

</script>

<template>
    <div class="about">
        <h1>CYBER_NOIR</h1>
        <h2>// INVESTIGATION_SYSTEM</h2>
        <p>{{ t('about.trying') }}</p>
        <br />
        <nexus-font type="slant" label="Nexus Runners" />
        <p>{{ t('about.of_the') }}</p>
        <nexus-font type="blocky" label="NEO TOKYO POLICE DEP" />
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

.about h1 {
    font-size: 3em;
}
</style>