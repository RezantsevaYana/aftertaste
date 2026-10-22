<template>
  <div ref="root" class="field field--floating" :class="fieldClasses">
    <div class="field__control">
      <VueDatePicker
        :key="`${range}-${selectionMode}`"
        ref="picker"
        v-model="pickerValue"
        :range="isRange ? { partialRange: false } : false"
        :month-picker="isMonth"
        :model-type="isMonth ? 'MM' : 'yyyy-MM-dd'"
        :time-config="{ enableTimePicker: false }"
        :config="{ modeHeight: 200 }"
        auto-apply
        :locale="ru"
        :start-date="startDate"
        :min-date="minDate"
        :max-date="maxDate"
        :year-range="yearRange"
        :teleport="popupTarget"
        :floating="floatingConfig"
        :ui="pickerUi"
        :input-attrs="inputAttrs"
        :aria-labels="ariaLabels"
        :transitions="false"
        @open="isOpen = true"
        @closed="onClosed"
      >
        <template v-if="filterModes" #top-extra>
          <div class="date-modes" role="group" aria-label="Точность даты">
            <button
              v-for="mode in modes"
              :key="mode.value"
              type="button"
              class="date-mode"
              :class="{ 'is-active': selectionMode === mode.value }"
              :aria-pressed="selectionMode === mode.value"
              @click="changeMode(mode.value)"
            >{{ mode.label }}</button>
          </div>
        </template>
        <template #dp-input="{ toggleMenu, onFocus, onBlur }">
          <button
            :id="id"
            ref="trigger"
            type="button"
            class="select-trigger date-trigger"
            :aria-expanded="isOpen"
            :aria-label="triggerLabel"
            :aria-describedby="describedBy"
            :aria-invalid="!!error"
            aria-haspopup="dialog"
            @click.stop="toggleMenu"
            @focus="onFocus"
            @blur="onBlur"
            @keydown.down.prevent="picker?.openMenu()"
          >
            <span>{{ displayValue }}</span>
            <BaseIcon v-if="!hasValue" icon="lucide:calendar-days" />
          </button>
        </template>
      </VueDatePicker>
      <IconButton
        v-if="hasValue"
        class="date-clear"
        icon="lucide:x"
        :label="clearLabel"
        @click.stop="clearDate"
      />
      <label class="field__label" :for="id">{{ label }}</label>
      <small v-if="error" :id="errorId" class="field__error" role="alert">{{ error }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VueDatePicker, type FloatingConfig } from '@vuepic/vue-datepicker'
import { ru } from 'date-fns/locale'
import { formatDate, isCalendarDate } from '@/shared/lib/date'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import IconButton from '@/shared/ui/buttons/IconButton.vue'
import { usePopupTarget } from '@/shared/composables/usePopupTarget'

const props = defineProps<{
  id: string
  label: string
  min: string
  max: string
  range?: boolean
  filterModes?: boolean
  error?: string
}>()
const emit = defineEmits<{
  blur: []
}>()
const model = defineModel<string | string[]>()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const picker = ref<InstanceType<typeof VueDatePicker>>()
const popupTarget = usePopupTarget(root)
const isOpen = ref(false)
type SelectionMode = 'month' | 'date' | 'period'
const modes: { value: SelectionMode; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'date', label: 'Дата' },
  { value: 'period', label: 'Период' },
]
const selectionMode = ref<SelectionMode>('period')
const isMonth = computed(() => !!props.filterModes && selectionMode.value === 'month')
const isRange = computed(() => props.filterModes ? selectionMode.value === 'period' : !!props.range)
async function changeMode(mode: SelectionMode) {
  if (selectionMode.value === mode) return
  model.value = ''
  selectionMode.value = mode
  await nextTick()
  picker.value?.openMenu()
}
const pickerValue = computed({
  get: () => {
    if (isMonth.value) return typeof model.value === 'string' && model.value.length === 2 ? model.value : null
    if (Array.isArray(model.value)) return model.value
    if (model.value?.length !== 10) return null
    return isRange.value ? [model.value, model.value] : model.value
  },
  set: (value: string | string[] | null) => { model.value = value ?? '' },
})
const floatingConfig: Partial<FloatingConfig> = {
  strategy: 'fixed',
  placement: 'bottom-start',
  offset: 6,
  flip: { padding: 8 },
  shift: { padding: 8 },
  arrow: false,
}
const pickerUi = computed(() => ({
  menu: isMonth.value ? 'aftertaste-datepicker-theme aftertaste-datepicker-month' : 'aftertaste-datepicker-theme',
}))
const inputAttrs = { clearable: false, hideInputIcon: true }
const ariaLabels = computed(() => ({
  menu: isMonth.value ? 'Выбор месяца' : isRange.value ? 'Выбор периода' : 'Выбор даты',
  nextMonth: 'Следующий месяц',
  prevMonth: 'Предыдущий месяц',
  openYearsOverlay: 'Выбрать год',
  openMonthsOverlay: 'Выбрать месяц',
  nextYear: 'Следующий год',
  prevYear: 'Предыдущий год',
  toggleOverlay: 'Переключить выбор месяца и года',
}))
const errorId = computed(() => `${props.id}-error`)
const describedBy = computed(() => props.error ? errorId.value : undefined)
const hasValue = computed(() => Array.isArray(model.value) ? model.value.some(Boolean) : !!model.value)
const clearLabel = computed(() => `Очистить ${props.label.toLowerCase()}`)
const fieldClasses = computed(() => ({ 'field--validated': props.error !== undefined, 'field--invalid': !!props.error, 'field--filled': hasValue.value || isOpen.value }))
const yearRange = computed<[number, number]>(() => [Number(props.min.slice(0, 4)), Number(props.max.slice(0, 4))])
const startDate = computed(() => typeof model.value === 'string' && model.value.length === 7 ? new Date(`${model.value}-01T12:00:00`) : undefined)
const minDate = computed(() => new Date(`${props.min}T00:00:00`))
const maxDate = computed(() => new Date(`${props.max}T00:00:00`))
const rangeFormatter = new Intl.DateTimeFormat('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('ru', { month: 'long' })
const displayValue = computed(() => {
  if (isMonth.value && typeof model.value === 'string' && /^\d{2}$/.test(model.value)) {
    return monthFormatter.format(new Date(2000, Number(model.value) - 1, 1))
  }
  if (Array.isArray(model.value)) {
    return model.value.map((date) => isCalendarDate(date)
      ? rangeFormatter.format(new Date(`${date}T12:00:00`))
      : '').join(' — ')
  }
  return model.value ? formatDate(model.value) : ''
})
const triggerLabel = computed(() => displayValue.value ? `${props.label}: ${displayValue.value}` : props.label)
function clearDate() {
  picker.value?.clearValue()
  model.value = ''
  picker.value?.closeMenu()
  trigger.value?.focus()
}
function onClosed() {
  isOpen.value = false
  emit('blur')
}
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.preventDefault()
  event.stopPropagation()
  picker.value?.closeMenu()
  trigger.value?.focus()
}
onMounted(() => document.addEventListener('keydown', onEscape, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onEscape, true))
</script>

<style scoped lang="scss" src="@/styles/ui/date-picker.scss"></style>
