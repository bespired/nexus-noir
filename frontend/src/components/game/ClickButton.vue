<script setup>

const props = defineProps({
    label: {
        type: String,
        default: ''
    },
    buttonType: {
        type: String,
        default: 'green'
    },
    icon: {
        type: String,
        default: null
    },
});
const emit = defineEmits(['click']);

const handleClick = (event) => {
    emit('click', event);
};
</script>

<template>
    <div class="click-button" :class="buttonType" @click="handleClick">
        <slot>
            <span v-if="icon" :class="{ label }">{{ icon }}</span>
            <span>{{ label }}</span>
            <span v-if="buttonType==='link'">&nbsp;&nbsp;&gt;</span>
        </slot>
    </div>
</template>


<style>
    .click-button {
        display: inline-flex;
        padding: 6px 14px;
        border-radius: 4px;
        min-width: 80px;
        justify-content: center;
        text-transform: uppercase;
        user-select: none;
        cursor: pointer;
        transition-duration: 300ms;
        transition-property: all;
        font-size: 14px;
    }
    .click-button ~ .click-button {
        margin-left: 10px;
    }

    .click-button > .label {
        margin-right: 4px;
    }

    .click-button img {
        max-height: 2em;
    }

    .click-button:hover {
        transform: translateY(-2px);
    }

    .click-button[class*="small"] {
        padding: 5px 14px;
        font-size: 12px;
    }

    .click-button[class*="add"] {
        background-color: rgb(245, 158, 11);
        color: black;
        border: 1px solid rgba(245, 158, 11, 0.5);
    }

    .click-button[class*="add"]:hover {
        background-color: #facc15;
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
        color: white;
    }

    .click-button[class*="link"] {
        background-color: rgba(245, 158, 11,0.15);
        color: rgb(245, 158, 11);
        border: 1px solid rgba(245, 158, 11, 0.5);
    }
    .click-button[class*="link"]:hover {
        background-color: rgb(245, 158, 11);
        color: white;
    }


    .click-button[class*="back"]  {
        padding: 0;
    }

    .click-button[class*="back"]:hover {
        color: white;
        transform: translateX(-2px);
    }


    .click-button[class*="black"] {
        background-color:black;
        color: white;
        border: 1px solid black;
        min-width: 40px;
    }

    .click-button[class*="black"]:hover {
        border: 1px solid rgb(245, 158, 11);
    }

    .click-button[class*="blue"] {
        background-color: rgba(59, 130, 246, 0.15);
        color: rgb(59, 130, 246);
        border: 1px solid rgba(59, 130, 246, 0.5);
    }

    .click-button[class*="blue"]:hover {
        background-color: rgb(59, 130, 246);
        color: white;
    }


    .click-button[class*="red"] {
        background-color: rgba(239, 68, 68, 0.15);
        color: rgb(239, 68, 68);
        border: 1px solid rgba(239, 68, 68, 0.5);
    }

    .click-button[class*="red"]:hover {
        background-color: rgb(239, 68, 68);
        color: white;
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
    }


    .click-button[class*="green"] {
        background-color: rgba(16, 185, 129, 0.15);
        color: rgb(16, 185, 129);
        border: 1px solid rgba(16, 185, 129, 0.5);
    }

    .click-button[class*="green"]:hover {
        background-color: rgb(16, 185, 129);
        color: white;
    }



</style>
