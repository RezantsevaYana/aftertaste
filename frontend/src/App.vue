<template>
  <header class="site-header">
    <a class="brand" href="./">aftertaste<span>✳</span></a
    ><span class="header-note">смотрим. читаем. оцениваем.</span
    ><span class="profile-badge" aria-label="Личный каталог">я</span>
  </header>
  <main class="page">
    <section class="intro">
      <div>
        <p class="eyebrow">Твой каталог и твои оценки</p>
        <h1>
          <span class="intro-heading-top"
            >Сколько<span class="intro-stamp" aria-hidden="true"
              >?/10</span
            ></span
          >
          <span class="intro-heading-bottom">по десятибалльной?</span>
        </h1>
        <p class="intro-description">
          Книги, фильмы, сериалы и спектакли.<br />Оценивай и записывай свои
          впечатления.
        </p>
      </div>
      <div class="intro-action">
        <BaseButton @click="addEntry">＋ Добавить запись</BaseButton
        ><span>Всё, что посмотрела и прочитала</span>
      </div>
    </section>
    <section class="catalog-section" aria-label="Каталог">
      <div class="catalog-title">
        <h2>
          Мой каталог <span>{{ entries.length }}</span>
        </h2>
        <span class="local-label"><i /> Сохранено в этом браузере</span>
      </div>
      <div class="catalog-toolbar">
        <div class="filters" role="group" aria-label="Тип контента">
          <button
            :class="{ active: activeType === 'all' }"
            :aria-pressed="activeType === 'all'"
            @click="activeType = 'all'"
          >
            Все <span>{{ entries.length }}</span></button
          ><button
            v-for="type in contentTypes"
            :key="type.value"
            :class="{ active: activeType === type.value }"
            :aria-pressed="activeType === type.value"
            @click="activeType = type.value"
          >
            {{ type.label }}
          </button>
        </div>
        <BaseInput
          id="catalog-search"
          v-model="search"
          class="search-field"
          label="Поиск по названию"
          type="search"
          placeholder="Поиск по названию…"
        />
      </div>
      <EntryList
        :entries="visibleEntries"
        :filtered="activeType !== 'all' || !!search"
        @open="selectedEntry = $event"
        @add="addEntry"
      />
    </section>
    <footer class="site-footer">
      <span>aftertaste — посмотрела, оценила, записала</span
      ><span>Можно не соглашаться с критиками</span>
    </footer>
  </main>
  <EntryDetailsModal
    v-if="selectedEntry"
    :entry="selectedEntry"
    @close="selectedEntry = undefined"
    @edit="editEntry"
  />
  <EntryFormModal
    v-if="formOpen"
    :entry="editingEntry"
    @close="formOpen = false"
    @save="save"
  />
  <NotificationModal
    v-if="notification"
    v-bind="notification"
    @close="notification = undefined"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { contentTypes } from '@/types/entry'
import type { ContentType, Entry, EntryDraft } from '@/types/entry'
import { loadEntries, saveEntries } from '@/services/entries'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import NotificationModal from '@/components/ui/NotificationModal.vue'
import EntryList from '@/components/catalog/EntryList.vue'
import EntryFormModal from '@/components/catalog/EntryFormModal.vue'
import EntryDetailsModal from '@/components/catalog/EntryDetailsModal.vue'

const entries = ref<Entry[]>([])
const notification = ref<{
  status: 'success' | 'error'
  title: string
  message: string
}>()
let storageAvailable = true
try {
  entries.value = loadEntries()
} catch {
  storageAvailable = false
  notification.value = {
    status: 'error',
    title: 'Каталог не загрузился',
    message:
      'Не удалось прочитать данные браузера. Попробуй перезагрузить страницу или проверить доступ к хранилищу. Сохранение временно недоступно, чтобы не перезаписать твои записи.',
  }
}
const activeType = ref<ContentType | 'all'>('all')
const search = ref<string | number>('')
const formOpen = ref(false)
const editingEntry = ref<Entry>()
const selectedEntry = ref<Entry>()
const visibleEntries = computed(() =>
  entries.value.filter(
    (entry) =>
      (activeType.value === 'all' || entry.type === activeType.value) &&
      entry.title
        .toLocaleLowerCase('ru')
        .includes(String(search.value).trim().toLocaleLowerCase('ru')),
  ),
)
function addEntry() {
  editingEntry.value = undefined
  formOpen.value = true
}
async function editEntry() {
  editingEntry.value = selectedEntry.value
  selectedEntry.value = undefined
  await nextTick()
  formOpen.value = true
}
async function save(draft: EntryDraft) {
  const isEditing = !!editingEntry.value
  try {
    if (!storageAvailable) throw new Error('Storage unavailable')
    const entry: Entry = {
      ...draft,
      id: editingEntry.value?.id ?? crypto.randomUUID(),
    }
    const updated = isEditing
      ? entries.value.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...entries.value]
    saveEntries(updated)
    entries.value = updated
    formOpen.value = false
    activeType.value = 'all'
    search.value = ''
    await nextTick()
    notification.value = {
      status: 'success',
      title: isEditing ? 'Изменения сохранены' : 'Запись в каталоге',
      message:
        'Всё на месте: оценка, дата и твой комментарий. Запись сохранена в этом браузере.',
    }
  } catch {
    notification.value = {
      status: 'error',
      title: 'Не удалось сохранить',
      message:
        'Хранилище браузера недоступно или заполнено. Попробуй убрать фото и повторить. Все заполненные поля остались в форме.',
    }
  }
}
</script>

<style scoped lang="scss" src="@/styles/App.scss"></style>
