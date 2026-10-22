<template>
  <div
    ref="root"
    class="field field--floating"
    :class="{ 'field--validated': error !== undefined, 'field--invalid': error, 'field--filled': hasValue, 'field--open': isOpen }"
  >
    <div class="field__control">
      <button
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
        v-if="showClear"
        class="select-clear"
        icon="lucide:x"
        :label="clearLabel"
        @click.stop="clear"
      />
      <label :id="labelId" class="field__label" :for="id">{{ label }}</label>
      <Teleport :to="popupTarget">
      <ul v-if="isOpen" ref="dropdown" :style="floatingStyles" :id="listId" class="select-dropdown" role="listbox" :aria-labelledby="labelId">
        <li
          v-for="(option, index) in options"
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
  options: readonly {
    value: string
    label: string
  }[]
}>()
const model = defineModel<string>()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
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
const hasValue = computed(() => model.value !== undefined && model.value !== '')
const showClear = computed(() => props.clearable && hasValue.value && !props.disabled)
const clearLabel = computed(() => `Очистить ${props.label.toLowerCase()}`)
const selectedLabel = computed(() => props.options.find((option) => option.value === model.value)?.label ?? '')
const labelId = computed(() => `${props.id}-label`)
const listId = computed(() => `${props.id}-options`)
const errorId = computed(() => `${props.id}-error`)
const describedBy = computed(() => props.error ? errorId.value : undefined)
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
  if (props.disabled || !props.options.length) return
  isOpen.value = true
  const selectedIndex = props.options.findIndex((option) => option.value === model.value)
  activeIndex.value = Math.max(0, selectedIndex)
  void revealActive()
}

function close() {
  isOpen.value = false
  search = ''
}

function toggle() {
  if (isOpen.value) close()
  else open()
}

function select(value: string) {
  model.value = value
  close()
  trigger.value?.focus()
}

function clear() {
  model.value = ''
  close()
  trigger.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
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
      activeIndex.value = Math.max(0, Math.min(props.options.length - 1, activeIndex.value + step))
      void revealActive()
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const option = props.options[activeIndex.value]
    if (isOpen.value && option) select(option.value)
    else open()
  } else if (isOpen.value && (event.key === 'Home' || event.key === 'End')) {
    event.preventDefault()
    activeIndex.value = event.key === 'Home' ? 0 : props.options.length - 1
    void revealActive()
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
