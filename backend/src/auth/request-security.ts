import type { Request, Response, NextFunction } from 'express';

// Custom header makes cross-site form requests fail; exact origins restrict credentialed CORS.
export function requestSecurity(request: Request, response: Response, next: NextFunction) {
  if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.path.startsWith('/api/') && request.get('X-Aftertaste-Request') !== '1') {
    response.status(403).json({ message: 'Обнови страницу и попробуй снова' });
    return;
  }
  next();
}

const attempts = new Map<string, { count: number; resetAt: number }>();
export function authRateLimit(request: Request, response: Response, next: NextFunction) {
  if (request.method !== 'POST' || !['/api/auth/login', '/api/auth/register', '/api/auth/password', '/api/auth/password-reset', '/api/auth/password-reset/request', '/api/auth/password-reset/check'].includes(request.path)) return next();
  const now = Date.now();
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  const key = request.ip ?? 'unknown';
  const value = attempts.get(key) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
  attempts.set(key, value);
  if (++value.count > 20) {
    response.setHeader('Retry-After', Math.ceil((value.resetAt - now) / 1000));
    response.status(429).json({ message: 'Слишком много попыток. Попробуй через 15 минут.' });
    return;
  }
  next();
}
