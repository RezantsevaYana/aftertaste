<template>
  <BaseButton class="collection-return-button" @click="emit('click')">
    <span class="collection-return-button__arrow" aria-hidden="true"><BaseIcon icon="lucide:arrow-left" /></span>
    К коллекции
  </BaseButton>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'

const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/collection-return-button.scss"></style>
