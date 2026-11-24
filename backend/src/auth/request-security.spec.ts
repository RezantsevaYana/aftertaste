import express from 'express';
import request from 'supertest';
import { authRateLimit, requestSecurity } from './request-security.js';

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestSecurity, authRateLimit);
  app.all('/api/auth/login', (_req, res) => res.status(200).json({ ok: true }));
  app.post('/api/auth/password', (_req, res) => res.sendStatus(204));
  app.get('/api/entries', (_req, res) => res.json([]));
  return app;
}

describe('Request security', () => {
  it('rejects mutation without custom header but permits ordinary reads', async () => {
    const app = createApp();
    await request(app).post('/api/auth/login').expect(403);
    await request(app).post('/api/auth/login').set('X-Aftertaste-Request', '1').expect(200);
    const result = await request(app).get('/api/entries').expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it('limits attempts independently for client addresses supplied by the trusted proxy', async () => {
    const app = createApp();
    for (let i = 0; i < 20; i++) {
      await request(app).post('/api/auth/login').set('X-Aftertaste-Request', '1').set('X-Forwarded-For', '192.0.2.21').expect(200);
    }
    const blocked = await request(app).post('/api/auth/login').set('X-Aftertaste-Request', '1').set('X-Forwarded-For', '192.0.2.21').expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    await request(app).post('/api/auth/login').set('X-Aftertaste-Request', '1').set('X-Forwarded-For', '192.0.2.22').expect(200);
    await request(app).get('/api/entries').set('X-Forwarded-For', '192.0.2.21').expect(200);
  });

  it('protects password changes with the custom header and attempt limit', async () => {
    const app = createApp();
    await request(app).post('/api/auth/password').expect(403);
    for (let i = 0; i < 20; i++) {
      await request(app).post('/api/auth/password').set('X-Aftertaste-Request', '1').set('X-Forwarded-For', '192.0.2.23').expect(204);
    }
    await request(app).post('/api/auth/password').set('X-Aftertaste-Request', '1').set('X-Forwarded-For', '192.0.2.23').expect(429);
  });
});
