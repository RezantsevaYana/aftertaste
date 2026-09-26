<template>
  <label class="field" :for="id"
    ><span class="field__label">{{ label }}</span
    ><textarea :id="id" v-model="model" rows="4" v-bind="$attrs" />
  </label>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; id: string }>()
const model = defineModel<string>()
</script>

<style scoped lang="scss" src="@/styles/ui/BaseTextarea.scss"></style>
