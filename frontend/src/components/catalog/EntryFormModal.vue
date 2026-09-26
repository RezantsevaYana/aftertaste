<template>
  <BaseModal
    :title="entry ? 'Редактировать запись' : 'Что добавим?'"
    eyebrow="Добавить в коллекцию"
    @close="emit('close')"
    ><form class="entry-form" @submit.prevent="submit">
      <BaseSelect
        id="entry-type"
        v-model="draft.type"
        label="Тип контента"
        :options="contentTypes"
      /><BaseInput
        id="entry-title"
        v-model="draft.title"
        label="Название"
        placeholder="Например, «Бойцовский клуб»"
        required
        maxlength="200"
      /><RatingInput v-model="draft.rating" /><BaseTextarea
        id="entry-review"
        v-model="draft.review"
        label="Рецензия · необязательно"
        placeholder="Что понравилось, а что нет? Чем запомнилось?"
        maxlength="10000"
      /><BaseInput
        id="entry-month"
        v-model="draft.month"
        type="month"
        :label="
          draft.type === 'book'
            ? 'Когда прочитала'
            : draft.type === 'theatre'
              ? 'Когда посетила'
              : 'Когда посмотрела'
        "
        required
        min="1900-01"
        max="2100-12"
      /><PhotoInput v-model="draft.photo" @busy="photoBusy = $event" />
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <footer class="modal__actions">
        <BaseButton variant="secondary" @click="emit('close')"
          >Отмена</BaseButton
        ><BaseButton type="submit" :disabled="photoBusy">{{
          photoBusy
            ? 'Читаем фото…'
            : entry
              ? 'Сохранить изменения'
              : 'Добавить в каталог'
        }}</BaseButton>
      </footer>
    </form></BaseModal
  >
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { Entry, EntryDraft } from '@/types/entry'
import { contentTypes, currentMonth } from '@/types/entry'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RatingInput from '@/components/ui/RatingInput.vue'
import PhotoInput from '@/components/ui/PhotoInput.vue'
const props = defineProps<{ entry?: Entry }>()
const emit = defineEmits<{ close: []; save: [draft: EntryDraft] }>()
const draft = reactive<EntryDraft>(
  props.entry
    ? { ...props.entry }
    : { type: 'book', title: '', rating: 7, review: '', month: currentMonth() },
)
const photoBusy = ref(false)
const error = ref('')
function submit() {
  if (!draft.title.trim()) {
    error.value = 'Укажи название.'
    return
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.month)) {
    error.value = 'Укажи месяц и год.'
    return
  }
  emit('save', {
    ...draft,
    title: draft.title.trim(),
    review: draft.review.trim(),
  })
}
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryFormModal.scss"></style>
