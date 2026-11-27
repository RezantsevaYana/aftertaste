<template>
  <section class="recommendations-page">
    <div class="social-heading"><h1>Мне советуют</h1><p>Личные рекомендации от друзей. Добавляй в планы то, что тебе интересно.</p></div>
    <nav v-sliding-tabs class="social-tabs" aria-label="Рекомендации"><button type="button" :aria-current="tab === 'incoming' ? 'page' : undefined" @click="tab = 'incoming'">Входящие<span>{{ social.incoming.length }}</span></button><button type="button" :aria-current="tab === 'sent' ? 'page' : undefined" @click="tab = 'sent'">Отправленные<span>{{ social.sent.length }}</span></button></nav>
    <div v-if="social.loading && !social.ready" class="social-loading" role="status"><VinylLoader />Загружаем рекомендации…</div>
    <p v-if="social.error || error" class="social-error" role="alert">{{ error || social.error }} <button type="button" @click="social.load()">Попробовать снова</button></p>
    <div v-if="social.ready" class="recommendations-list">
      <article v-for="item in items" :key="item.id" class="recommendation">
        <button type="button" class="recommendation-person" @click="emit('person', item.person.id)"><UserAvatar :avatar="item.person.avatar" :first-name="item.person.firstName" :last-name="item.person.lastName" size="medium" /><span><strong>{{ tab === 'sent' ? 'Для ' : '' }}{{ personName(item.person) }}</strong><small>{{ item.dateLabel }}</small></span></button>
        <div class="recommended-work"><EntryImage :type="item.work.type" /><div><h2>{{ item.work.title }}</h2><p>{{ item.description }}</p><p v-if="item.note" class="recommendation-note">{{ item.note }}</p></div></div>
        <div v-if="tab === 'incoming'" class="recommendation-actions"><BaseButton size="compact" :loading="busyId === item.id && accepting" :disabled="!!busyId" @click="handle(item.id, true)">Добавить в планы</BaseButton><BaseButton size="compact" variant="secondary" :loading="busyId === item.id && !accepting" :disabled="!!busyId" @click="handle(item.id, false)">Убрать</BaseButton></div>
        <p v-else class="sent-status">Отправлено</p>
      </article>
      <div v-if="!items.length && !social.error" class="social-empty"><h2>{{ tab === 'incoming' ? 'Новых рекомендаций пока нет' : 'Ты ещё не отправляла рекомендации' }}</h2><p>{{ tab === 'incoming' ? 'Здесь появятся новые рекомендации от твоих друзей.' : 'Открой свою запись и выбери «Порекомендовать».' }}</p><BaseButton variant="secondary" @click="openEmptyDestination">{{ tab === 'incoming' ? 'Найти людей' : 'Моя коллекция' }}</BaseButton></div>
    </div>
    <BaseToast v-if="toast" :message="toast" @close="toast = ''" />
  </section>
</template>
<script setup lang="ts">
import { vSlidingTabs } from '@/shared/directives/sliding-tabs'
import { computed, onMounted, ref } from 'vue'
import { useSocialStore } from '@/stores/social'
import { acceptRecommendation, dismissRecommendation } from '@/api/social'
import { personName } from '@/entities/person'
import { contentTypes, EntryImage } from '@/entities/entry'
import { BaseButton, BaseToast, VinylLoader } from '@/shared/ui'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'
const emit = defineEmits<{
  person: [id: string]
  people: []
  catalog: []
}>()
const social = useSocialStore(), tab = ref<'incoming' | 'sent'>('incoming')
const accepting = ref(false)
const busyId = ref(''), error = ref(''), toast = ref('')
const items = computed(() => (tab.value === 'incoming' ? social.incoming : social.sent).map(item => ({ ...item,
  dateLabel: new Date(item.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long' }),
  description: [item.work.type === 'custom' ? item.work.customCategoryName : contentTypes.find(type => type.value === item.work.type)?.singular, item.work.author || item.work.artist || item.work.director].filter(Boolean).join(' · '),
})))
function openEmptyDestination() { if (tab.value === 'incoming') emit('people'); else emit('catalog') }
async function handle(id: string, accept: boolean) {
  if (busyId.value) return
  busyId.value = id; accepting.value = accept; error.value = ''
  try {
    if (accept) { const result = await acceptRecommendation(id); await social.catalogChanged(); toast.value = !result.categoryEnabled ? 'План добавлен. Его категория выключена в настройках.' : result.created ? 'Добавлено в планы. Источник сохранён.' : 'Запись уже есть в твоей коллекции.' }
    else { await dismissRecommendation(id); toast.value = 'Рекомендация убрана из входящих' }
    await social.load()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось обработать рекомендацию' }
  finally { busyId.value = '' }
}
onMounted(() => void social.load())
defineExpose({ canLeave: () => !busyId.value })
</script>
<style scoped lang="scss" src="@/styles/social/recommendations-page.scss"></style>
