<template>
  <fieldset class="rating-field">
    <legend class="field__label">
      Твоя оценка <span class="muted">/ {{ max }}</span>
    </legend>
    <div class="rating-options">
      <label
        v-for="option in ratingOptions"
        :key="option.value"
        class="rating-option"
        :class="{ 'is-selected': model === option.value }"
        ><input
          v-model="model"
          type="radio"
          name="rating"
          :value="option.value"
          :aria-label="option.label"
        /><span>{{ option.value }}</span></label
      >
    </div>
    <small>{{ min }} — не понравилось, {{ max }} — в любимое.</small>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ min: number; max: number }>()
const ratingOptions = computed(() =>
  Array.from({ length: props.max - props.min + 1 }, (_, index) => {
    const value = props.min + index
    return { value, label: `${value} из ${props.max}` }
  }),
)

const model = defineModel<number>({ required: true })
</script>

<style scoped lang="scss" src="@/styles/ui/rating-input.scss"></style>
