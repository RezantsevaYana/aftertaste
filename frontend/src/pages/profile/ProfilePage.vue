<template>
  <section class="profile-page" aria-labelledby="profile-title">
    <aside class="profile-sidebar">
      <div class="profile-identity">
        <UserAvatar :avatar="auth.user?.avatar" :first-name="auth.user?.firstName" :last-name="auth.user?.lastName" size="medium" />
        <div><strong>{{ auth.user?.firstName || 'Твой аккаунт' }}</strong><small>Твой аккаунт</small></div>
      </div>
      <nav class="profile-navigation" aria-label="Разделы кабинета">
        <button v-for="item in tabs" :key="item.id" type="button" :aria-current="tab === item.id ? 'page' : undefined" @click="selectTab(item.id)">
          <BaseIcon :icon="item.icon" />{{ item.label }}
        </button>
      </nav>
      <button class="profile-logout" type="button" :disabled="auth.loading" @click="emit('logout')"><BaseIcon icon="lucide:log-out" />Выйти из аккаунта</button>
    </aside>
    <div class="profile-main">
      <div class="profile-page-heading">
        <h1 id="profile-title" ref="heading" tabindex="-1">Личный кабинет</h1>
        <p>Твой профиль и твои правила коллекции.</p>
      </div>
      <nav class="profile-tabs" aria-label="Разделы кабинета">
        <button v-for="item in tabs" :key="item.id" type="button" :aria-current="tab === item.id ? 'page' : undefined" @click="selectTab(item.id)">{{ item.mobileLabel }}</button>
      </nav>
      <ProfileForm v-if="tab === 'profile'" ref="profileForm" />
      <PasswordChangeForm v-else-if="tab === 'security'" ref="passwordForm" />
      <CategoriesSettings v-else-if="tab === 'categories'" ref="categoriesForm" />
      <PrivacySettings v-else ref="privacyForm" />
      <button type="button" class="profile-back" @click="emit('back')"><BaseIcon icon="lucide:arrow-left" />К коллекции</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import ProfileForm from '@/pages/profile/components/ProfileForm.vue'
import PasswordChangeForm from '@/pages/profile/components/PasswordChangeForm.vue'
import CategoriesSettings from '@/pages/profile/components/CategoriesSettings.vue'
import PrivacySettings from '@/pages/profile/components/PrivacySettings.vue'

const emit = defineEmits<{
  back: []
  logout: []
}>()
const props = withDefaults(defineProps<{
  initialTab?: 'profile' | 'security' | 'categories' | 'privacy'
}>(), { initialTab: 'profile' })
const auth = useAuthStore()
const tabs = [
  { id: 'profile', label: 'Профиль', mobileLabel: 'Профиль', icon: 'lucide:user-round' },
  { id: 'security', label: 'Пароль', mobileLabel: 'Пароль', icon: 'lucide:lock-keyhole' },
  { id: 'categories', label: 'Мои категории', mobileLabel: 'Категории', icon: 'lucide:grid-2x2' },
  { id: 'privacy', label: 'Приватность', mobileLabel: 'Приватность', icon: 'lucide:shield' },
] as const
const tab = ref(props.initialTab)
const profileForm = ref<InstanceType<typeof ProfileForm>>()
const passwordForm = ref<InstanceType<typeof PasswordChangeForm>>()
const categoriesForm = ref<InstanceType<typeof CategoriesSettings>>()
const privacyForm = ref<InstanceType<typeof PrivacySettings>>()
const heading = ref<HTMLHeadingElement>()

async function canLeave() {
  const activeForm = { profile: profileForm.value, security: passwordForm.value, categories: categoriesForm.value, privacy: privacyForm.value }[tab.value]
  return activeForm ? activeForm.canLeave() : true
}

async function selectTab(value: typeof tab.value) {
  if (value === tab.value || !await canLeave()) return
  tab.value = value
  await nextTick()
  heading.value?.focus({ preventScroll: true })
}

defineExpose({ canLeave, openTab: selectTab })
</script>

<style scoped lang="scss" src="@/styles/auth/profile-page.scss"></style>
