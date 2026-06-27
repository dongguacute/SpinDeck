<script setup lang="ts">
import { onMounted } from "vue";

function updateFooterYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll(".vp-footer-year").forEach((el) => {
    el.textContent = year;
  });
}

onMounted(updateFooterYear);
</script>

<template><span hidden aria-hidden="true" /></template>
