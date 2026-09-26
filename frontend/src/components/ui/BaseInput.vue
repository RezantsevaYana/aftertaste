<template>
  <label class="field" :for="id"
    ><span class="field__label">{{ label }}</span>
    <input
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :aria-describedby="hint ? `${id}-hint` : undefined"
    />
    <small v-if="hint" :id="`${id}-hint`">{{ hint }}</small>
  </label>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; id: string; hint?: string }>()
const model = defineModel<string | number>()
</script>

<style scoped lang="scss" src="@/styles/ui/BaseInput.scss"></style>
