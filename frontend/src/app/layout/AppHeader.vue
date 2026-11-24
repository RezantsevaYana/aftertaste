<template>
  <header class="site-header">
    <div class="header-content">
      <a class="brand" href="./" aria-label="Aftertaste — моя коллекция" @click.prevent="emit('catalog', 'done')">
        <img class="brand-record" src="/brand/vinyl-mark-v1.png" alt="" width="34" height="34" />
        aftertaste
      </a>
      <template v-if="auth.user">
        <nav class="header-navigation" aria-label="Основные разделы">
          <button type="button" :aria-current="activePage === 'catalog' ? 'page' : undefined" @click="emit('catalog')">Моя коллекция</button>
          <button type="button" :aria-current="activePage === 'people' ? 'page' : undefined" @click="emit('navigate', 'people')">Люди</button>
          <button type="button" :aria-current="activePage === 'recommendations' ? 'page' : undefined" @click="emit('navigate', 'recommendations')">Мне советуют<span v-if="social.count" class="header-counter">{{ social.count }}</span></button>
        </nav>
        <div class="header-account">
          <BaseDropdown :label="accountMenuLabel" :disabled="auth.loading">
            <template #trigger>
              <UserAvatar :avatar="auth.user.avatar" :first-name="auth.user.firstName" :last-name="auth.user.lastName" />

            </template>
            <template #default="{ close }">
              <div class="account-menu">
                <div class="account-identity">
                  <strong>{{ accountLabel }}</strong>
                  <small>{{ auth.user.email }}</small>
                </div>
                <nav aria-label="Аккаунт">
                  <button type="button" @click="openCollection(close)"><BaseIcon icon="lucide:library" />Коллекция</button>
                  <button type="button" @click="close(); emit('navigate', 'people')"><BaseIcon icon="lucide:users-round" />Люди</button>
                  <button type="button" @click="close(); emit('navigate', 'recommendations')"><BaseIcon icon="lucide:gift" />Мне советуют</button>
                  <button type="button" @click="openProfile(close)"><BaseIcon icon="lucide:user-round" />Личный кабинет</button>
                  <button type="button" class="account-logout" :disabled="auth.loading" @click="signOut(close)"><BaseIcon icon="lucide:log-out" />Выйти</button>
                </nav>
              </div>
            </template>
          </BaseDropdown>
          <span v-if="auth.error" class="account-error" role="alert">{{ auth.error }}</span>
        </div>
      </template>
      <span v-else class="header-note">Личный культурный дневник</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useSocialStore } from '@/stores/social'
import { computed } from 'vue'
import type { EntryStatus } from '@/entities/entry'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import BaseDropdown from '@/shared/ui/navigation/BaseDropdown.vue'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  activePage?: 'catalog' | 'people' | 'recommendations' | 'profile'
  activeSection?: EntryStatus
}>()
const emit = defineEmits<{
  navigate: [page: 'people' | 'recommendations']
  profile: []
  catalog: [section?: EntryStatus]
  logout: []
}>()
const social = useSocialStore()
const auth = useAuthStore()
const firstName = computed(() => auth.user?.firstName || 'Аккаунт')
const accountLabel = computed(() => [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ') || 'Твой аккаунт')
const accountMenuLabel = computed(() => `${firstName.value} — меню аккаунта`)

function openCollection(close: () => void) {
  close()
  emit('catalog', 'done')
}
function openProfile(close: () => void) {
  close()
  emit('profile')
}
function signOut(close: () => void) {
  close()
  emit('logout')
}
</script>

<style scoped lang="scss" src="@/styles/layout/app-header.scss"></style>
