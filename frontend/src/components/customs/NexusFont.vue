<template>
  <span :class="`nexus-${type}`">
    {{ mappedText }}
  </span>
</template>
<style>
.nexus-blocky { letter-spacing: .7em }
</style>
<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'slant'
  }
});

// Mapping starting offsets based on your image
const getOffset = (type) => {
  switch (type) {
    case 'slant':
      return 0x01B1; // 'uhorn'
    case 'blocky':
      return 0x01D1; // 'uni010D'
    default:
      return null;
  }
};

const fontStyle = {
  fontFamily: 'nexusnoir',
  textTransform: 'uppercase',
  display: 'inline-block'
};

const mappedText = computed(() => {
  const offset = getOffset(props.type);
  const input = props.label.toUpperCase();

  // If no offset (default) or it's a special char we don't want to shift
  if (offset === null) return input;

  return input
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);

      // Map A-Z (65-90) to the target range
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(offset + (code - 65));
      }

      // Keep spaces and numbers as they are (unless you want to map them too)
      return char;
    })
    .join('');
});
</script>