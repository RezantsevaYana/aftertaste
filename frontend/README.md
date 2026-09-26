# Aftertaste — фронтенд

Прототип личного каталога на Vue 3 + TypeScript. Бэкенд пока не нужен.

## Запуск

Из корня проекта:

```sh
nvm use
cd frontend
npm install
npm run dev
```

`npm run build` проверяет TypeScript и собирает production-версию.

## Карта компонентов

- `src/App.vue` — экран каталога: поиск, фильтры, открытие модалок, сохранение.
- `src/components/catalog/EntryList.vue` — группировка записей по месяцам и пустое состояние.
- `src/components/catalog/EntryCard.vue` — карточка записи с фото или декоративной обложкой.
- `src/components/catalog/EntryDetailsModal.vue` — просмотр полной рецензии.
- `src/components/catalog/EntryFormModal.vue` — общая форма добавления и редактирования. Получает необязательный `entry`, отправляет события `save` и `close`. Форма редактирует копию записи: отмена не меняет каталог.
- `src/components/ui/BaseModal.vue` — оболочка модалки на нативном `dialog`: фокус, Escape, закрытие снаружи, блокировка прокрутки.
- `src/components/ui/NotificationModal.vue` — универсальное уведомление. Props: `status` (`success` или `error`), `title`, `message`; событие `close`.
- `src/components/ui/BaseButton.vue` — кнопка с вариантами `primary`, `secondary`, `ghost`.
- `src/components/ui/BaseInput.vue`, `BaseTextarea.vue`, `BaseSelect.vue` — поля с `v-model` и подписями.
- `src/components/ui/RatingInput.vue` — оценка 1–10 с клавиатурным выбором.
- `src/components/ui/PhotoInput.vue` — выбор и предпросмотр JPG, PNG, WebP до 2 МБ.
- `src/types/entry.ts` — типы записи, четыре категории и форматирование даты.
- `src/data/entries.ts` — четыре демонстрационные записи.
- `src/services/entries.ts` — чтение и сохранение в `localStorage`.
- `src/styles/main.scss` — глобальные стили и reset.
- `src/styles/_variables.scss` — палитра, семейства шрифтов и карта брейкпоинтов.
- `src/styles/_mixins.scss` — общие миксины полей, действий модалок и адаптивности.
- `src/styles/ui/` — изолированные стили кнопок, полей и других UI-компонентов.
- `src/styles/catalog/` — стили компонентов каталога.
- `src/styles/App.scss` — стили основного экрана.

## Данные и будущий API

При первом открытии показываются демонстрационные записи. После первого сохранения весь каталог хранится в этом браузере под ключом `aftertaste.entries.v1`. Это не аккаунт и не синхронизация между устройствами. Фото пока хранится как data URL; при переполнении localStorage появляется ошибка, форма остаётся заполненной.

`EntryDraft`: `type`, `title`, `rating`, `review`, `month` (строка `YYYY-MM`), необязательный `photo`. У сохранённого `Entry` также есть `id`. Рецензия необязательна; дата относится к прочтению, просмотру или посещению.

Для подключения бэка начни с `services/entries.ts`: замени локальное хранение API-запросами. В `App.vue` нужно будет ожидать загрузку/сохранение, добавить состояние ожидания и отдельные операции создания и обновления. Загрузку фото можно заменить на multipart и хранить URL в записи. Визуальные компоненты останутся теми же.

## Что проверить вручную

1. Добавить запись каждого типа, выбрать оценку и месяц: запись появляется в нужной группе.
2. Открыть запись и отредактировать её; отмена не должна сохранять изменения.
3. Перезагрузить страницу: сохранённые записи остаются.
4. Проверить поиск, фильтры и пустые результаты.
5. Прикрепить фото, заменить и убрать; файл больше 2 МБ должен показать ошибку.
6. Проверить модалки с клавиатуры (Tab, Escape) и экран на ширине 375 px.
7. Для проверки ошибки сохранения временно выбросить `throw new Error('Test')` в начале `saveEntries`: уведомление об ошибке должно появиться поверх заполненной формы. После проверки убрать эту строку.

## Соглашения Vue и SCSS

Порядок блоков: `template` → `script setup lang="ts"` → `style scoped lang="scss"`.
Все стили лежат отдельно от компонентов в `src/styles/`, с подпапками `ui` и `catalog`. Файл сохраняет имя компонента и подключается через алиас `@`:

```vue
<style scoped lang="scss" src="@/styles/ui/BaseButton.scss"></style>
```

Общие значения и миксины подключаем явно:

```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.button {
  background: $color-accent;
  font-family: $font-body;
}

@include respond-below('tablet') {
  .button {
    width: 100%;
  }
}
```

Брейкпоинты: `wide` 1920, `desktop` 1440, `laptop` 1024, `tablet` 768, `mobile` 480 px. `respond-below` включает указанную ширину, `respond-above` — строго больше неё. Четыре колонки каталога появляются выше 1440 px, три — выше 1024, две — выше 480, одна — на 480 и меньше.

Шрифты: [Literata](https://github.com/googlefonts/literata) для выразительных книжных заголовков и [Onest](https://github.com/google/fonts/blob/main/ofl/onest/METADATA.pb) для интерфейса. Оба поддерживают кириллицу и распространяются под SIL OFL. Подключены через Google Fonts в `index.html` с `display=swap`; без сети используются Georgia и Arial. Семейства можно заменить в `_variables.scss`.

Постоянные договорённости для следующих сессий сохранены в корневом `AGENTS.md`.
