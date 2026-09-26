# Backend aftertaste

Сервер: Node.js 24 + TypeScript + NestJS, модули ESM.

Из корня репозитория:

```sh
nvm use
cd backend
npm install
npm run start:dev
```

Сервер доступен на http://localhost:3000. Стартовый `GET /` возвращает
`Hello World!`. Остановка — Ctrl+C.

Из `backend/`: `npm run build` — сборка, `npm test` — модульные тесты,
`npm run test:e2e` — проверка HTTP-ответа, `npm run lint` — проверка кода.
Тесты работают на Vitest и Supertest.
