<template>
  <fieldset class="rating-field">
    <legend class="field__label">
      Твоя оценка <span class="muted">/ 10</span>
    </legend>
    <div class="rating-options">
      <label
        v-for="rating in 10"
        :key="rating"
        class="rating-option"
        :class="{ 'is-selected': model === rating }"
        ><input
          v-model="model"
          type="radio"
          name="rating"
          :value="rating"
          :aria-label="`${rating} из 10`"
        /><span>{{ rating }}</span></label
      >
    </div>
    <small>1 — не понравилось, 10 — в любимое.</small>
  </fieldset>
</template>

<script setup lang="ts">
const model = defineModel<number>({ required: true })
</script>

<style scoped lang="scss" src="@/styles/ui/rating-input.scss"></style>
