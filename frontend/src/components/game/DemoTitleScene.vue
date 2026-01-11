<script setup>
import { defineProps, defineEmits } from 'vue';
import ClickButton from '../inputs/ClickButton.vue';

const props = defineProps({
    title:       { type: String, default: 'CYBER NOIR' },
    subtitle:    { type: String, default: 'Press Start' },
    nextSceneId: { type: [String, Number], default: null }
});

const emit = defineEmits(['scene-complete']);

const start = () => {
    // E.g. play a sound, then emit
    console.log("Emitting next scene:", props.nextSceneId);
    emit('scene-complete', { targetSceneId: props.nextSceneId });
};
</script>

<style scoped>
    .titles-container {
        font-family: "Wallace", "Courier New", Courier, monospace;
        text-transform: uppercase;
        letter-spacing: 2px;
        line-height: 1.6;
        padding: 0 10%;
        background-color: #000;
        color: #fff;
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .red {
        color: #ff0000;
    }

    h1 {
        font-size: 8vh;
        font-weight: 800;
        letter-spacing: 0.3em;
        margin-bottom: 3vh;
        display: block;
    }

    p {
        margin-bottom: 1.4vh;
        max-width: 80%;
        font-size: 1.4vh;
    }

    .start-button-wrapper {
        margin-top: 3rem;
    }

    /* Animations */
    .line-anim {
        opacity: 0;
        transform: translateY(10px);
        animation: fadeInSlide 1.5s ease-out forwards;
    }

    .delay-1 { animation-delay: 0.5s; }
    .delay-2 { animation-delay: 4.0s; }
    .delay-3 { animation-delay: 7.5s; }
    .delay-4 { animation-delay: 11.0s; }
    .delay-5 { animation-delay: 14.5s; }
    .delay-6 { animation-delay: 18.0s; }
    .delay-7 { animation-delay: 21.5s; }
    .delay-8 {
        visibility: hidden;
        animation-delay: 24s;
    }

    .line-anim.delay-8 {
        animation:
            fadeInSlide 1.5s ease-out forwards;
        animation-delay: 24s;
    }

    .line-anim.delay-8 {
        animation-fill-mode: forwards;
        visibility: visible;
    }


    @keyframes fadeInSlide {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .pulse {
        animation: pulseEffect 2s infinite;
    }

    @keyframes pulseEffect {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
</style>

<template>
    <div class="titles-container" @click="start" >
        <h1 class="line-anim delay-8 red pulse">{{ title }}</h1>

        <p class="line-anim delay-1">
            <span class="red">Replicants</span> zijn bio-geëngineerde mensen, ontworpen door de Tyrell Corporation voor gebruik buiten de aarde. Hun verbeterde kracht maakte hen tot ideale slavenarbeiders.
        </p>

        <p class="line-anim delay-2">Na een reeks gewelddadige opstanden werd de productie verboden en ging de Tyrell Corporation failliet.</p>

        <p class="line-anim delay-3">De instorting van ecosystemen in het midden van de jaren 2020 leidde tot de opkomst van industrieel Niander Mallace, wiens beheersing van synthetische landbouw een wereldwijde hongersnood voorkwam.</p>

        <p class="line-anim delay-4">Mallace verwierf de restanten van Tyrell Corp en creëerde een nieuwe generatie replicants — gehoorzaam en controleerbaar.</p>

        <p class="line-anim delay-5">Veel oudere modellen — Nexus-8 replicants met een onbeperkte levensduur — overleefden. Zij worden opgejaagd en “gepensioneerd”.</p>

        <p class="line-anim delay-6">Degenen die op hen jagen, dragen nog steeds de naam…</p>

        <p class="line-anim delay-7 red" style="font-size: 1.5rem; font-weight: bold;">Nexus Runners</p>

        <div class="start-button-wrapper line-anim delay-8">
            <ClickButton
                label="INITIALIZE_SEQUENCE"
                buttonType="red"
                @click="start"
            />
        </div>
    </div>
</template>