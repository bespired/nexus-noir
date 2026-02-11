<script setup>


const emit = defineEmits(['value']);

const handleChange = (value) => {
    emit('onInput', parseInt(currentValue));
};
</script>

<template>
        <div class="slider-rails">

            <input
              ref="input"
              v-model="currentValue"
              type="range"
              class="slider"
              @input="onInput"
            />
        </div>
</template>


<style>

.slider-rails {
    width: 87px;
    height: 665px;
}
.slider {
    transform: rotateZ(-90deg) translateY(100%);
}

</style>
