<template>
  <label class="field" :for="id"
    ><span class="field__label">{{ label }}</span
    ><select :id="id" v-model="model">
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select></label
  >
</template>

<script setup lang="ts">
defineProps<{
  label: string
  id: string
  options: readonly { value: string; label: string }[]
}>()
const model = defineModel<string>()
</script>

<style scoped lang="scss" src="@/styles/ui/base-select.scss"></style>
