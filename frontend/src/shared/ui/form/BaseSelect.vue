<template>
  <div
    ref="root"
    class="field field--floating"
    :class="{ 'field--validated': error !== undefined, 'field--invalid': error, 'field--filled': hasValue, 'field--open': isOpen }"
  >
    <div class="field__control">
      <input
        v-if="allowCustom"
        :id="id"
        ref="trigger"
        v-bind="$attrs"
        class="select-trigger select-trigger--editable"
        type="text"
        role="combobox"
        :value="model ?? ''"
        :disabled="disabled"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-labelledby="labelId"
        :aria-activedescendant="activeOptionId"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        @input="onInput"
        @focus="open"
        @click="open"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <button
        v-else
        :id="id"
        ref="trigger"
        v-bind="$attrs"
        class="select-trigger"
        type="button"
        role="combobox"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-labelledby="labelId"
        :aria-activedescendant="activeOptionId"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        @click="toggle"
        @keydown="onKeydown"
        @blur="close"
      >
        <span class="select-value">{{ selectedLabel }}</span>
        <BaseIcon v-if="!showClear" class="select-chevron" icon="lucide:chevron-down" />
      </button>
      <IconButton
        v-if="allowCustom && !showClear"
        class="select-toggle"
        icon="lucide:chevron-down"
        :label="`Показать варианты: ${label.toLowerCase()}`"
        :disabled="disabled"
        @mousedown.prevent
        @click="toggleEditable"
      />
      <IconButton
        v-if="showClear"
        class="select-clear"
        icon="lucide:x"
        :label="clearLabel"
        @mousedown.prevent
        @click.stop="clear"
      />
      <label :id="labelId" class="field__label" :for="id">{{ label }}</label>
      <Teleport :to="popupTarget">
      <ul v-if="isOpen" ref="dropdown" :style="floatingStyles" :id="listId" class="select-dropdown" role="listbox" :aria-labelledby="labelId">
        <li
          v-for="(option, index) in displayedOptions"
          :id="optionId(index)"
          :key="option.value"
          class="select-option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': model === option.value }"
          role="option"
          :aria-selected="model === option.value"
          @mousedown.prevent
          @click="select(option.value)"
          @pointermove="activeIndex = index"
        >
          <span>{{ option.label }}</span>
          <BaseIcon v-if="model === option.value" icon="lucide:check" />
        </li>
      </ul>
      </Teleport>
      <small v-if="error" :id="errorId" class="field__error" role="alert">{{ error }}</small>
    </div>
    <span v-if="error !== undefined" class="field__error-space" aria-hidden="true">{{ error || ' ' }}</span>
    <small v-if="allowCustom" :id="hintId" class="select-hint">Выбери из списка или напиши свой вариант.</small>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { usePopupTarget } from '@/shared/composables/usePopupTarget'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import IconButton from '@/shared/ui/buttons/IconButton.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  error?: string
  label: string
  id: string
  disabled?: boolean
  clearable?: boolean
  allowCustom?: boolean
  options: readonly {
    value: string
    label: string
  }[]
}>()
const model = defineModel<string>()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement | HTMLInputElement>()
const dropdown = ref<HTMLElement>()
const popupTarget = usePopupTarget(root)
const { floatingStyles } = useFloating(trigger, dropdown, {
  strategy: 'fixed',
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(6),
    flip({ padding: 8 }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ rects, availableHeight, availableWidth, elements }) {
        Object.assign(elements.floating.style, {
          width: `${Math.min(rects.reference.width, availableWidth)}px`,
          maxHeight: `${Math.max(0, Math.min(220, availableHeight))}px`,
        })
      },
    }),
  ],
})
const isOpen = ref(false)
const activeIndex = ref(-1)
const query = ref('')
const displayedOptions = computed(() => {
  if (!props.allowCustom) return props.options
  const text = query.value.trim()
  const needle = text.toLocaleLowerCase('ru')
  const matches = props.options.filter(option => option.label.toLocaleLowerCase('ru').includes(needle))
  const exactMatch = props.options.some(option => option.value.toLocaleLowerCase('ru') === needle)
  return text && !exactMatch
    ? [...matches, { value: text, label: `Использовать «${text}»` }]
    : matches
})
const hasValue = computed(() => model.value !== undefined && model.value !== '')
const showClear = computed(() => props.clearable && hasValue.value && !props.disabled)
const clearLabel = computed(() => `Очистить ${props.label.toLowerCase()}`)
const selectedLabel = computed(() => props.options.find((option) => option.value === model.value)?.label ?? '')
const labelId = computed(() => `${props.id}-label`)
const listId = computed(() => `${props.id}-options`)
const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)
const describedBy = computed(() => [props.error ? errorId.value : '', props.allowCustom ? hintId.value : ''].filter(Boolean).join(' ') || undefined)
const activeOptionId = computed(() => isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined)
let search = ''
let lastKeyTime = 0

function optionId(index: number) {
  return `${props.id}-option-${index}`
}

async function revealActive() {
  await nextTick()
  const list = dropdown.value
  const option = list?.children[activeIndex.value] as HTMLElement | undefined
  if (!list || !option) return
  if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
  else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
  }
}

function open() {
  if (props.disabled || (!props.allowCustom && !props.options.length)) return
  if (isOpen.value) return
  query.value = ''
  isOpen.value = true
  const selectedIndex = displayedOptions.value.findIndex((option) => option.value === model.value)
  activeIndex.value = props.allowCustom ? selectedIndex : Math.max(0, selectedIndex)
  void revealActive()
}

function close() {
  isOpen.value = false
  search = ''
  query.value = ''
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  model.value = value
  isOpen.value = true
  query.value = value
  activeIndex.value = -1
}

function onBlur() {
  const value = (model.value ?? '').trim()
  const known = props.options.find(option => option.value.toLocaleLowerCase('ru') === value.toLocaleLowerCase('ru'))
  model.value = known?.value ?? value
  close()
}

function toggleEditable() {
  if (isOpen.value) close()
  else {
    trigger.value?.focus()
    open()
  }
}

function toggle() {
  if (isOpen.value) close()
  else open()
}

function select(value: string) {
  model.value = value
  trigger.value?.focus()
  close()
}

function clear() {
  model.value = ''
  trigger.value?.focus()
  close()
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.isComposing) return
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
  } else if (event.key === 'Tab') {
    close()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) open()
    else {
      const step = event.key === 'ArrowDown' ? 1 : -1
      activeIndex.value = activeIndex.value < 0
        ? step > 0 ? 0 : displayedOptions.value.length - 1
        : Math.max(0, Math.min(displayedOptions.value.length - 1, activeIndex.value + step))
      void revealActive()
    }
  } else if (event.key === 'Enter' || (!props.allowCustom && event.key === ' ')) {
    event.preventDefault()
    const option = displayedOptions.value[activeIndex.value]
    if (isOpen.value && option) select(option.value)
    else if (props.allowCustom) {
      onBlur()
    }
    else open()
  } else if (!props.allowCustom && isOpen.value && (event.key === 'Home' || event.key === 'End')) {
    event.preventDefault()
    activeIndex.value = event.key === 'Home' ? 0 : displayedOptions.value.length - 1
    void revealActive()
  } else if (!props.allowCustom && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    if (!isOpen.value) open()
    const now = Date.now()
    search = (now - lastKeyTime > 700 ? '' : search) + event.key.toLocaleLowerCase('ru')
    lastKeyTime = now
    const index = props.options.findIndex((option) => option.label.toLocaleLowerCase('ru').startsWith(search))
    if (index >= 0) {
      activeIndex.value = index
      void revealActive()
    }
  }
}

function onOutsidePointer(event: PointerEvent) {
  if (event.target instanceof Node && !root.value?.contains(event.target) && !dropdown.value?.contains(event.target)) close()
}

onMounted(() => document.addEventListener('pointerdown', onOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointer))
</script>

<style scoped lang="scss" src="@/styles/ui/base-select.scss"></style>
