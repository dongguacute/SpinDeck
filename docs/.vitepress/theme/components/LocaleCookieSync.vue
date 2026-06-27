<script setup lang="ts">
import { watchEffect } from "vue";
import { useData, inBrowser } from "vitepress";

const { lang } = useData();

watchEffect(() => {
  if (inBrowser) {
    document.cookie = `nf_lang=${lang.value}; expires=Mon, 1 Jan 2030 00:00:00 UTC; path=/`;
  }
});
</script>

<template><span hidden aria-hidden="true" /></template>
