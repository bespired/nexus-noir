<script setup>
import { onMounted, onUnmounted, ref, watch, shallowRef } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';

const store = useStore();
const canvasRef = ref(null);

// Use shallowRef for Three.js internals to keep them non-reactive
const engine = shallowRef({
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock()
});

const init = () => {
  const scene = new THREE.Scene();

  // 1. Camera - Match your backdrop perspective
  // FOV usually around 35-45 for "cinematic" fixed-angle shots
  const camera = new THREE.PerspectiveCamera(35, 1218 / 832, 0.1, 1000);
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 0, 0);

  // 2. Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true, // Crucial: makes canvas transparent so 2D backdrop shows through
    antialias: true
  });

  // 3. Lighting (Simple Noir setup)
  const ambient = new THREE.AmbientLight(0x404040, 1);
  const spot = new THREE.SpotLight(0x00ffc7, 10); // Neo Tokyo Teal
  spot.position.set(5, 10, 5);
  scene.add(ambient, spot);

  engine.value = { ...engine.value, scene, camera, renderer };

  animate();
};

const animate = () => {
  if (!engine.value.renderer) return;

  requestAnimationFrame(animate);
  const { scene, camera, renderer } = engine.value;

  renderer.render(scene, camera);
};

// 4. Watch for Stage Bounds changes from your Store
watch(() => store.state.game.stage, (newBounds) => {
  if (!engine.value.renderer) return;

  const { width, height } = newBounds;
  engine.value.renderer.setSize(width, height, false);
  engine.value.camera.aspect = width / height;
  engine.value.camera.updateProjectionMatrix();
}, { deep: true });

onMounted(() => init());

onUnmounted(() => {
  if (engine.value.renderer) {
    engine.value.renderer.dispose();
  }
});
</script>

<template>
  <canvas ref="canvasRef" class="three-layer" />
</template>

