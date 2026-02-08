<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useStore } from 'vuex';

const store  = useStore();
const engine = inject('engine');

const activeDialog = computed(() => store.state.game.activeDialog);
const currentNode  = computed(() => activeDialog.value?.currentNode);
const currentChoices = computed(() =>
    currentNode.value?.choices || currentNode.value?.answers || []);

const stage = computed(() => store.state.game.stage);
const stagestyle = computed(() => `
    width:  ${stage.value.width}px;
    height: ${stage.value.height}px;
`);

const displayedText = ref('');
const isTyping = ref(false);
let typingInterval = null;

const startTyping = (text) => {
    if (!text) return;

    clearInterval(typingInterval);
    displayedText.value = '';
    isTyping.value = true;

    let index = 0;
    typingInterval = setInterval(() => {
        if (index < text.length) {
            displayedText.value += text[index];
            index++;
            // Optional: Play subtle typing sound
        } else {
            clearInterval(typingInterval);
            isTyping.value = false;
        }
    }, 30); // Speed of teletype
};

watch(() => currentNode.value, (newNode) => {
    if (newNode) {
        console.log(`[DIALOG-UI] New Node:`, newNode.id, newNode.text);
        startTyping(newNode.text);
    } else {
        displayedText.value = '';
    }
}, { immediate: true });

onMounted(() => {
    console.log(`[DIALOG-UI] Mounted. Current Node:`, currentNode.value?.id);
    if (currentNode.value?.text) {
        startTyping(currentNode.value.text);
    }
});

const handleChoice = (choice) => {
    if (isTyping.value) {
        // Skip typing if clicked during animation
        clearInterval(typingInterval);
        displayedText.value = currentNode.value.text;
        isTyping.value = false;
        return;
    }

    if (engine?.value?.dialogs) {
        engine.value.dialogs.selectChoice(choice);
    }
};

const closeDialog = () => {
    if (engine?.value?.dialogs) {
        engine.value.dialogs.endDialog();
    }
};
</script>

<template>
    <transition name="dialog-fade">
        <div v-if="activeDialog" class="dialog-overlay" :style="stagestyle">
            <div class="dialog-container">
                <!-- Header / Portrait placeholder -->
                <div class="dialog-header">
                    <!-- <span class="signal-indicator">SIGNAL_ACTIVE</span> -->
                    <h3 class="character-name">{{ activeDialog.characterName || activeDialog.title || 'ENCRYPTED_SIGNATURE' }}</h3>
                </div>

                <!-- Main Text -->
                <div class="dialog-body">
                    <p class="dialog-text">
                        {{ displayedText }}<span v-if="isTyping" class="cursor">_</span>
                    </p>
                </div>

                <!-- Choices -->
                <div v-if="!isTyping" class="dialog-choices">
                    <div
                        v-for="(choice, index) in currentChoices"
                        :key="index"
                        class="choice-item"
                        @click="handleChoice(choice)"
                    >
                        <span class="choice-bullet">></span>
                        <span class="choice-text">{{ choice.text }}</span>
                    </div>

                    <!-- Fallback / Close if no choices -->
                    <div
                        v-if="currentChoices.length === 0"
                        class="choice-item close"
                        @click="closeDialog"
                    >
                        <span class="choice-bullet">></span>
                        <span class="choice-text">DISCONNECT_SIGNAL</span>
                    </div>
                </div>

                <!-- Bottom Bar Decor -->
                <div class="dialog-footer">
                    <div class="noir-bar"></div>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
.dialog-overlay {
    z-index: 1000;
    pointer-events: auto; /* Catch clicks */
    align-content: center;
}

.dialog-container {
    width: 80%;
    max-width: 900px;
    color: #fff;
    background: linear-gradient(to top,
        rgba(0, 0, 0, 0.70) 0%, rgba(0, 0, 0, 0.25) 70%, transparent 100%);
    font-family: 'Wallace', 'Courier New', Courier, monospace;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    margin-left: auto;
    margin-right: auto;
    transform: translateY(50%);
}

.dialog-header {
    display: flex;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid rgba(255, 0, 0, 0.3);
    padding-bottom: 5px;
}

.character-name {
    margin: 0;
    font-size: 0.9rem;
    letter-spacing: 0.3em;
    color: #ff0000;
    text-transform: uppercase;
}

.signal-indicator {
    font-size: 0.6rem;
    color: #ff0000;
    font-weight: bold;
    animation: blink 1s infinite;
}

.dialog-body {
    min-height: 80px;
}

.dialog-text {
    font-size: 1.5vw;
    line-height: 1.5;
    margin: 0;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.9);
}

.cursor {
    animation: blink 0.5s infinite;
    color: #ff0000;
}

.dialog-choices {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
}

.choice-item {
    cursor: pointer;
    display: flex;
    gap: 15px;
    align-items: anchor-center;
    padding: 8px 15px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    transition: all 0.2s;
}

.choice-item:hover {
    background: rgba(255, 0, 0, 0.1);
    border-color: rgba(255, 0, 0, 0.3);
    padding-left: 25px;
}

.choice-bullet {
    color: #ff0000;
    font-weight: bold;
}

.choice-text {
    font-size: 1.25vw;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.dialog-footer {
    height: 4px;
    width: 100%;
}

.noir-bar {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #ff0000 0%, transparent 100%);
    opacity: 0.5;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

/* Transitions */
.dialog-fade-enter-active, .dialog-fade-leave-active {
    transition: opacity 0.5s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to {
    opacity: 0;
}
</style>