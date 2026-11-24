<template>
  <AppLayout :active-page="page" :active-section="activeSection" @navigate="openSocialPage" @profile="openProfile()" @catalog="openCatalog" @logout="logout">
    <div v-if="!auth.ready" class="auth-status" role="status"><VinylLoader /> Проверяем сессию…</div>
    <div v-else-if="auth.error && !auth.user" class="auth-status" role="alert">
      <p>{{ auth.error }}</p>
      <BaseButton @click="auth.restore">Попробовать снова</BaseButton>
    </div>
    <AuthPage v-else-if="resetToken" ref="resetPage" :key="resetToken" :reset-token="resetToken" @reset-done="finishReset" />
    <div v-else-if="auth.user && !preferences.ready" class="auth-status" role="status">
      <template v-if="preferences.error"><p role="alert">{{ preferences.error }}</p><BaseButton @click="preferences.load">Попробовать снова</BaseButton></template>
      <template v-else><VinylLoader /> Загружаем настройки…</template>
    </div>
    <template v-else-if="auth.user">
      <div v-show="page === 'catalog'" :key="`catalog-${auth.user.id}`"><CatalogPage ref="catalogPage" v-model:section="activeSection" @categories="openProfile('categories')" /></div>
      <PeoplePage v-if="page === 'people'" ref="peoplePage" :key="`people-${auth.user.id}`" />
      <RecommendationsPage v-if="page === 'recommendations'" ref="recommendationsPage" :key="`recommendations-${auth.user.id}`" @people="openSocialPage('people')" @person="openPerson" @catalog="openCatalog" />
      <ProfilePage v-if="showProfile" ref="profilePage" :key="`profile-${auth.user.id}`" :initial-tab="profileTab" @back="openCatalog" @logout="logout" />
    </template>
    <AuthPage v-else />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import PeoplePage from '@/pages/people/PeoplePage.vue'
import RecommendationsPage from '@/pages/recommendations/RecommendationsPage.vue'
import { useSocialStore } from '@/stores/social'
import AppLayout from './layout/AppLayout.vue'
import { CatalogPage } from '@/pages/catalog'
import ProfilePage from '@/pages/profile/ProfilePage.vue'
import AuthPage from '@/pages/auth/AuthPage.vue'
import { useAuthStore } from '@/stores/auth'
import VinylLoader from '@/shared/ui/feedback/VinylLoader.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import type { EntryStatus } from '@/entities/entry'
import { usePreferencesStore } from '@/stores/preferences'

const auth = useAuthStore()
const preferences = usePreferencesStore()
const profileTab = ref<'profile' | 'security' | 'categories' | 'privacy'>('profile')
const resetToken = ref('')
const page = ref<'catalog' | 'people' | 'recommendations' | 'profile'>('catalog')
const showProfile = computed({ get: () => page.value === 'profile', set: value => { page.value = value ? 'profile' : 'catalog' } })
const social = useSocialStore()
const catalogPage = ref<InstanceType<typeof CatalogPage>>()
const peoplePage = ref<InstanceType<typeof PeoplePage>>()
const recommendationsPage = ref<InstanceType<typeof RecommendationsPage>>()
const activeSection = ref<EntryStatus>('done')
const profilePage = ref<InstanceType<typeof ProfilePage>>()
const resetPage = ref<InstanceType<typeof AuthPage>>()
async function canLeaveCurrentPage() {
  if (resetPage.value && !await resetPage.value.canLeave()) return false
  if (profilePage.value && !await profilePage.value.canLeave()) return false
  if (catalogPage.value && !await catalogPage.value.canLeave()) return false
  if (peoplePage.value && !peoplePage.value.canLeave()) return false
  if (recommendationsPage.value && !recommendationsPage.value.canLeave()) return false
  return true
}
async function receiveResetToken() {
  const url = new URL(window.location.href)
  const token = new URLSearchParams(url.hash.slice(1)).get('resetToken') ?? url.searchParams.get('resetToken')
  if (!token) return
  url.hash = ''; url.searchParams.delete('resetToken')
  window.history.replaceState(null, '', url.pathname + url.search)
  if (!await canLeaveCurrentPage()) return
  showProfile.value = false
  resetToken.value = token
}
void receiveResetToken()
function finishReset() { resetToken.value = ''; void auth.restore() }
watch(() => auth.user?.id, (id) => {
  showProfile.value = false
  activeSection.value = 'done'
  preferences.reset()
  social.reset()
  if (id) { void preferences.load(); void social.load() }
})
async function openProfile(tab: typeof profileTab.value = 'profile') {
  if (showProfile.value) { await profilePage.value?.openTab(tab); return }
  if (!await canLeaveCurrentPage()) return
  if (resetToken.value) {
    resetToken.value = ''; await auth.restore()
    if (!auth.user) return
  }
  profileTab.value = tab
  showProfile.value = true
}
async function openCatalog(section?: EntryStatus) {
  if (!await canLeaveCurrentPage()) return
  if (resetToken.value) { resetToken.value = ''; await auth.restore() }
  if (section) activeSection.value = section
  showProfile.value = false
}
async function openSocialPage(destination: 'people' | 'recommendations') {
  if (!await canLeaveCurrentPage()) return
  if (resetToken.value) { resetToken.value = ''; await auth.restore() }
  if (auth.user) page.value = destination
}
async function openPerson(id: string) {
  await openSocialPage('people')
  await nextTick()
  peoplePage.value?.openPerson(id)
}
async function logout() {
  if (!await canLeaveCurrentPage()) return
  await auth.logout()
  if (!auth.user) resetToken.value = ''
}
onMounted(() => {
  window.addEventListener('aftertaste:session-expired', auth.expire)
  window.addEventListener('hashchange', receiveResetToken)
  void auth.restore()
})
onUnmounted(() => {
  window.removeEventListener('aftertaste:session-expired', auth.expire)
  window.removeEventListener('hashchange', receiveResetToken)
})
</script>

<style scoped lang="scss" src="@/styles/app.scss"></style>
