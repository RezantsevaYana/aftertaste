<template>
  <fieldset class="rating-field" :class="{ 'rating-field--invalid': error }">
    <legend class="field__label">
      Твоя оценка <span class="muted">/ {{ max }}</span>
    </legend>
    <div class="rating-control">
    <div ref="optionsElement" class="rating-options" @focusin="revealFocusedOption">
      <label
        v-for="option in ratingOptions"
        :key="option.value"
        class="rating-option"
        :class="option.classes"
        ><input
          v-model="model"
          type="radio"
          :name="radioName"
          :value="option.value"
          :aria-invalid="!!error"
          :aria-describedby="error ? errorId : undefined"
          :aria-label="option.label"
          @click="reactionVersion++"
        /><span :key="model === option.value ? reactionVersion : 0" class="rating-number">{{ option.value }}</span>
        <span v-if="model === option.value && option.value === 10 && reactionVersion > 0" :key="`grooves-${reactionVersion}`" class="rating-grooves" aria-hidden="true" />
        </label
      >
    </div>
    <p class="rating-reaction" :class="{ 'rating-reaction--low': model === 1 }" role="status" aria-live="polite">
      <BaseIcon v-if="reactionIcon" :icon="reactionIcon" />{{ reactionText }}
    </p>
    <small v-if="error" :id="errorId" class="rating-error" role="alert">{{ error }}</small>
    </div>
    <small>{{ min }} — не понравилось, {{ max }} — в любимое.</small>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'

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
    return {
      value,
      label: `${value} из ${props.max}`,
      classes: {
        'is-selected': model.value === value,
        'rating-option--favorite': value === 10,
        'rating-option--low': value === 1,
        'has-reaction': reactionVersion.value > 0,
      },
    }
  }),
)

const model = defineModel<number>({ required: true })
const reactionVersion = ref(0)
const reactionText = computed(() => model.value === 10 ? 'Это — на повтор.' : model.value === 1 ? 'Одного раза хватило.' : `Твоя оценка — ${model.value} из ${props.max}.`)
const reactionIcon = computed(() => model.value === 10 ? 'lucide:repeat' : model.value === 1 ? 'lucide:skip-forward' : undefined)
const optionsElement = ref<HTMLElement>()

function revealOption(option: HTMLElement | null, smooth: boolean) {
  const container = optionsElement.value
  if (!container || !option || container.scrollWidth <= container.clientWidth) return
  const bounds = container.getBoundingClientRect()
  const item = option.getBoundingClientRect()
  if (item.left >= bounds.left + 6 && item.right <= bounds.right - 6) return
  container.scrollTo({
    left: container.scrollLeft + item.left - bounds.left - (container.clientWidth - item.width) / 2,
    behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
  })
}
function revealFocusedOption(event: FocusEvent) {
  revealOption((event.target as HTMLElement).closest('.rating-option'), true)
}
onMounted(() => revealOption(optionsElement.value?.querySelector('.is-selected') ?? null, false))
watch(model, () => revealOption(optionsElement.value?.querySelector('.is-selected') ?? null, true), { flush: 'post' })
</script>

<style scoped lang="scss" src="@/styles/ui/rating-input.scss"></style>
