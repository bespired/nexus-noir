<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

const store  = useStore();
const dialog = computed(() => store.state.game.dialog);
</script>

<template>
    <div v-if="dialog" class="dialog-modal">
        <!-- teletype question    -->
        <!-- draw possible ansers -->
    </div>
</template>