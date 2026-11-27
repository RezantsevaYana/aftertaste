<template>
  <section class="people-page">
    <template v-if="!selectedId">
      <div class="social-heading"><h1>Люди</h1><p>Находи знакомых и тех, чей вкус тебе интересен.</p></div>
      <nav v-sliding-tabs class="social-tabs" aria-label="Люди"><button v-for="item in tabs" :key="item.value" type="button" :aria-current="tab === item.value ? 'page' : undefined" @click="tab = item.value; query = ''">{{ item.label }}<span v-if="item.count !== undefined">{{ item.count }}</span></button></nav>
      <div class="people-search"><BaseInput id="people-search" v-model="query" type="search" label="Имя или ник" maxlength="100" /></div>
      <p v-if="error" class="social-error" role="alert">{{ error }} <button type="button" @click="load()">Попробовать снова</button></p>
      <div v-if="loading" class="social-loading" role="status"><VinylLoader />Ищем людей…</div>
      <div v-else class="people-list">
        <article v-for="person in users" :key="person.id" class="person-row">
          <button type="button" class="person-identity" :disabled="busy" @click="openPerson(person.id)"><UserAvatar :avatar="person.avatar" :first-name="person.firstName" :last-name="person.lastName" size="medium" /><span><strong>{{ personName(person) }}</strong><small>@{{ person.handle }}</small></span></button>
          <PersonActions :person="person" :busy="busy" :loading-action="busyPersonId === person.id ? busyAction : ''" @action="act(person, $event)" />
        </article>
        <div v-if="!users.length && !error" class="social-empty"><h2>{{ emptyTitle }}</h2><p>{{ query ? 'Попробуй другое имя или ник.' : 'Найди человека через поиск и открой его коллекцию.' }}</p><BaseButton v-if="tab !== 'search'" variant="secondary" @click="tab = 'search'">Найти людей</BaseButton></div>
        <BaseButton v-if="nextCursor" variant="secondary" :loading="loadingMore" @click="load(true)">Показать ещё</BaseButton>
      </div>
    </template>
    <template v-else>
      <div class="people-back"><BaseButton variant="secondary" size="compact" :disabled="busy" @click="selectedId = ''; collection = undefined; load()">Назад к людям</BaseButton></div>
      <div v-if="profileLoading" class="social-loading" role="status"><VinylLoader />Загружаем коллекцию…</div>
      <p v-if="error" class="social-error" role="alert">{{ error }} <button type="button" @click="loadProfile()">Попробовать снова</button></p>
      <template v-if="collection && !profileLoading">
        <section class="person-profile"><UserAvatar :avatar="collection.person.avatar" :first-name="collection.person.firstName" :last-name="collection.person.lastName" size="large" /><div><h1>{{ personName(collection.person) }}</h1><p>@{{ collection.person.handle }}</p></div><PersonActions :person="collection.person" allow-remove :busy="busy" :loading-action="busyPersonId === collection.person.id ? busyAction : ''" @action="act(collection.person, $event)" /></section>
        <nav v-sliding-tabs class="social-tabs" aria-label="Коллекция пользователя"><button type="button" :aria-current="shelf === 'done' ? 'page' : undefined" @click="shelf = 'done'">Впечатления</button><button v-if="collection.canViewPlans" type="button" :aria-current="shelf === 'plan' ? 'page' : undefined" @click="shelf = 'plan'">Планы</button></nav>
        <p v-if="!collection.canViewPlans" class="public-privacy">Планы доступны друзьям, если владелец разрешил их просмотр. Оценки впечатлений доступны всем.</p>
        <div class="public-entry-grid"><div v-for="entry in visibleEntries" :key="entry.id" class="public-entry"><EntryCard :entry="entry" readonly @open="selectedEntry = entry" /><BaseButton size="compact" variant="secondary" :loading="copyingId === entry.id" :disabled="busy || copiedIds.has(entry.id)" @click="copy(entry)">{{ copiedIds.has(entry.id) ? 'Уже в твоей коллекции' : 'Добавить в планы' }}</BaseButton></div></div>
        <div v-if="!visibleEntries.length" class="social-empty"><h2>Здесь пока нет записей</h2></div>
      </template>
    </template>
    <SharedEntryDetails v-if="selectedEntry" :entry="selectedEntry" :busy="busy" :error="error" @close="selectedEntry = undefined" @copy="copy(selectedEntry)" />
    <BaseToast v-if="toast" :message="toast" @close="toast = ''" />
  </section>
</template>
<script setup lang="ts">
import { vSlidingTabs } from '@/shared/directives/sliding-tabs'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findPeople, loadPerson, requestFriend, acceptFriend, removeFriend, setFollowing, copyToPlans, type PersonCollection, type RemoteEntry } from '@/api/social'
import { personName, type SocialPerson } from '@/entities/person'
import { EntryCard } from '@/entities/entry'
import { BaseButton, BaseInput, BaseToast, VinylLoader } from '@/shared/ui'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'
import PersonActions from '@/pages/people/components/PersonActions.vue'
import SharedEntryDetails from '@/pages/people/components/SharedEntryDetails.vue'
import { useSocialStore } from '@/stores/social'
const social = useSocialStore()
const tab = ref('search'), query = ref<string | number>('')
const users = ref<SocialPerson[]>([]), counts = ref({ friends: 0, following: 0, requests: 0 }), nextCursor = ref<string | null>(null)
const loading = ref(false), loadingMore = ref(false), profileLoading = ref(false), busy = ref(false), error = ref(''), toast = ref('')
const selectedId = ref(''), collection = ref<PersonCollection>(), shelf = ref<'done' | 'plan'>('done'), selectedEntry = ref<RemoteEntry>()
const busyPersonId = ref(''), busyAction = ref('')
const copyingId = ref(''), copiedIds = ref(new Set<string>())
let version = 0, profileVersion = 0, timer: ReturnType<typeof setTimeout> | undefined
const tabs = computed(() => [{ value: 'search', label: 'Поиск', count: undefined }, { value: 'friends', label: 'Друзья', count: counts.value.friends }, { value: 'following', label: 'Подписки', count: counts.value.following }, { value: 'requests', label: 'Заявки', count: counts.value.requests }])
const emptyTitle = computed(() => query.value ? 'Никого не нашли' : tab.value === 'requests' ? 'Новых заявок нет' : tab.value === 'friends' ? 'Здесь будут твои друзья' : tab.value === 'following' ? 'Здесь будут твои подписки' : 'Пока никого не нашли')
const visibleEntries = computed(() => collection.value?.entries.filter(entry => entry.status === shelf.value) ?? [])
async function load(more = false) {
  if (more && loadingMore.value) return
  const current = ++version
  if (more) loadingMore.value = true
  else loading.value = true
  error.value = ''
  try { const result = await findPeople(tab.value, String(query.value), more ? nextCursor.value ?? undefined : undefined); if (current !== version) return; users.value = more ? [...users.value, ...result.users] : result.users; counts.value = result.counts; nextCursor.value = result.nextCursor }
  catch (cause) { if (current === version) error.value = cause instanceof Error ? cause.message : 'Не удалось найти людей' }
  finally { if (current === version) { loading.value = false; loadingMore.value = false } }
}
async function loadProfile() {
  const current = ++profileVersion, id = selectedId.value
  profileLoading.value = true; error.value = ''
  try { const result = await loadPerson(id); if (current === profileVersion && selectedId.value === id) { collection.value = result; if (!result.canViewPlans) shelf.value = 'done' } }
  catch (cause) { if (current === profileVersion) { collection.value = undefined; error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить коллекцию' } }
  finally { if (current === profileVersion) profileLoading.value = false }
}
function openPerson(id: string) { selectedId.value = id; shelf.value = 'done'; copiedIds.value = new Set(); void loadProfile() }
async function act(person: SocialPerson, action: 'accept' | 'remove' | 'request' | 'follow') {
  if (busy.value) return
  busy.value = true; busyPersonId.value = person.id; busyAction.value = action; error.value = ''
  try {
    if (action === 'follow') await setFollowing(person.id, !person.following)
    else if (action === 'request') await requestFriend(person.id)
    else if (action === 'accept') await acceptFriend(person.id)
    else await removeFriend(person.id)
    if (selectedId.value) await loadProfile()
    else await load()
    await social.load()
    toast.value = action === 'accept' ? 'Теперь вы друзья. Подписка включена.' : action === 'request' ? 'Заявка отправлена' : 'Связи обновлены'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить изменение' }
  finally { busy.value = false; busyPersonId.value = ''; busyAction.value = '' }
}
async function copy(entry: RemoteEntry) {
  if (busy.value) return
  busy.value = true; copyingId.value = entry.id; error.value = ''
  try { const result = await copyToPlans(selectedId.value, entry.id); copiedIds.value.add(entry.id); selectedEntry.value = undefined; await social.catalogChanged(); toast.value = !result.categoryEnabled ? 'План добавлен. Его категория выключена в настройках.' : result.created ? 'Добавлено в планы. Источник сохранён.' : 'Эта запись уже есть в твоей коллекции.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось добавить в планы' }
  finally { busy.value = false; copyingId.value = '' }
}
watch([tab, query], () => { clearTimeout(timer); ++version; loadingMore.value = false; timer = setTimeout(() => void load(), 250) })
onMounted(() => void load())
onBeforeUnmount(() => { clearTimeout(timer); version++; profileVersion++ })
defineExpose({ openPerson, canLeave: () => !busy.value })
</script>
<style scoped lang="scss" src="@/styles/social/people-page.scss"></style>
