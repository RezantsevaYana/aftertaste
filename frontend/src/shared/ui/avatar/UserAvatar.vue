<template>
  <span class="user-avatar" :class="[`user-avatar--${size}`, { 'user-avatar--photo': avatar }]" aria-hidden="true">
    <img v-if="avatar" :src="avatar" alt="" />
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  size?: 'small' | 'medium' | 'large'
}>(), { size: 'small' })

const initials = computed(() => [props.firstName, props.lastName]
  .map(name => Array.from(name?.trim() ?? '')[0] ?? '')
  .join('').toLocaleUpperCase('ru') || 'a')
</script>

<style scoped lang="scss" src="@/styles/ui/user-avatar.scss"></style>
