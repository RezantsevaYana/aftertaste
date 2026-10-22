<template>
  <fieldset class="rating-field" :class="{ 'rating-field--invalid': error }">
    <legend class="field__label">
      Твоя оценка <span class="muted">/ {{ max }}</span>
    </legend>
    <div class="rating-control">
    <div class="rating-options">
      <label
        v-for="option in ratingOptions"
        :key="option.value"
        class="rating-option"
        :class="{ 'is-selected': model === option.value }"
        ><input
          v-model="model"
          type="radio"
          :name="radioName"
          :value="option.value"
          :aria-invalid="!!error"
          :aria-describedby="error ? errorId : undefined"
          :aria-label="option.label"
        /><span>{{ option.value }}</span></label
      >
    </div>
    <small v-if="error" :id="errorId" class="rating-error" role="alert">{{ error }}</small>
    </div>
    <small>{{ min }} — не понравилось, {{ max }} — в любимое.</small>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  error?: string
  min: number
  max: number
}>()
const errorId = useId()
const radioName = useId()
const ratingOptions = computed(() =>
  Array.from({ length: props.max - props.min + 1 }, (_, index) => {
    const value = props.min + index
    return { value, label: `${value} из ${props.max}` }
  }),
)

const model = defineModel<number>({ required: true })
</script>

<style scoped lang="scss" src="@/styles/ui/rating-input.scss"></style>
