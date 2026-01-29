<template>
    <div class="svg-container">
        <svg viewBox="0 0 413 166" version="1.1" xmlns="http://www.w3.org/2000/svg" class="nt-police-svg">
            <g transform="matrix(0.56,0,0,0.605,-211,-98.5)">
                <path d="M423.809,205.819C424.992,203.778 427.158,202.524 429.5,202.524C431.842,202.524 434.008,203.778 435.191,205.819C438.928,212.267 443.846,220.755 447.848,227.659C449.317,230.195 449.331,233.331 447.883,235.879C446.435,238.428 443.747,240 440.837,240C433.654,240 424.963,240 417.827,240C414.986,240 412.362,238.465 410.948,235.977C409.535,233.488 409.548,230.427 410.983,227.951C415.014,220.995 420.019,212.359 423.809,205.819Z" class="yellow" />
            </g>
            <text x="50" y="46" class="text-en text-32">{{ mainLabel }}</text>

            <template v-if="type === 'no-scene'">
                <text x="20" y="98" class="text-en text-16">032A: NO SCENE FOUND</text>
            </template>
            <template v-if="type === 'error'">
                <text x="20" y="98" class="text-en text-16">{{ label }}</text>
            </template>
            <template v-if="type !== 'loading'">
                <text x="20" y="116" class="text-en text-16">?PRE BLACKOUT INFORMATION?</text>
                <text x="20" y="132" class="text-en text-16">CAN'T PROCEED</text>
            </template>

            <text x="0" y="164" class="text-en text-10">NT POLICE DEPT</text>
            <text x="108" y="164" class="text-jp text-10">ネオ東京警察署</text>
            <text x="386" y="164" class="text-en text-10 align-end">FOR AUTHORIZED PERSONEL ONLY</text>

            <g transform="matrix(0.75,0,0, 0.75,-0.5,-314)" class="version-group">
                <text x="526" y="441">V</text>
                <text x="526" y="459">3</text>
                <text x="528" y="476">.</text>
                <text x="526" y="493">5</text>
            </g>
            <rect x="1.5" y="1.5" width="382.504" height="145.218" class="outline-rect" />
            <path d="M1.5,70.603l382.504,0c20.377,0 26.431,-4.728 26.657,-26.657c0.437,-42.444 0,-42.446 0,-42.446l-26.657,0" class="outline-path" />

          <g class="data-bars" v-if="type === 'loading'">
                <path v-for="n in bars" :key="n" :d="calculateBarPath(n)" class="bar-fill" />
          </g>

        </svg>
    </div>
</template>
<script setup>
import { computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        default: 'loading'
    },
    label: {
        type: String,
        default: null
    },
    loaded: {
        type: Number,
        default: 0
    }
});

const bars = computed(() => {
    if (!props.loaded) return 0
    return Math.ceil( props.loaded / 7.7 )
})

const mainLabel = computed(() => {
    if (props.type === 'no-scene') { return 'ERROR: 032A' }
    if (props.type === 'loading')  { return `LOADING ${props.loaded}%` }
    if (props.type === 'error')    { return 'ERROR: 099X' }
    return label
});

/**
 * Logic to generate the repeated bar paths
 * The original SVG had 13 identical shapes shifted by 28.924 units
 */
const calculateBarPath = (index) => {
    const startX = 30.17 + (index - 1) * 28.924;
    const width = 22.504; // Derived from original path logic
    const height = 50.31;
    const y = 84.501;
    const r = 5.626; // Corner radius

    // Returns the path data for a rounded rectangle bar
    return `M${startX},${y} l0,${height} c0,${3.105} -2.521,${r} -${r},${r} l-11.252,0 c-3.105,0 -${r},-2.521 -${r},-${r} l0,-${height} c0,-3.105 2.521,-${r} ${r},-${r} l11.252,0 c3.105,0 ${r},2.521 ${r},${r} Z`;
};
</script>
<style>
/* Color Palette */
:root {
    --neon-cyan: #00ffc7;
    --neon-mint: #25fbc3;
}

.nt-police-svg {
    font-family: var(--font-mono);
    width: 100%;
    height: auto;
    fill-rule: evenodd;
    clip-rule: evenodd;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-miterlimit: 1.5;
}

.yellow {
    fill: rgb(209, 220, 0);
}

/* Text Styles */
.text-jp {
    font-size: 10px;
    fill: var(--neon-mint);
}

.text-en {
    fill: var(--neon-cyan);
    letter-spacing: 0.5px;
}

.text-10 {
    font-size: 10px;
}

.text-16 {
    font-size: 16px;
}

.text-32 {
    font-size: 32px;
}

.align-end {
    text-anchor: end
}

.version-group text {
    /*font-family: 'GigaSans-SemiBold', 'Giga Sans', sans-serif;*/
    font-size: 13.333px;
    fill: var(--neon-cyan);
}

/* Graphic Styles */
.outline-rect,
.outline-path {
    fill: none;
    stroke: var(--neon-cyan);
    stroke-width: 3px;
}

.bar-fill {
    fill: var(--neon-cyan);
}

.svg-container {
    background-color: #0b0e14;
    /* Dark background to make neon pop */
    padding: 20px;
    border-radius: 8px;
}
</style>