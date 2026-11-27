import { BadRequestException } from '@nestjs/common';

export function validateHandle(value: unknown): string {
  const handle = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(handle)) {
    throw new BadRequestException('Ник: от 3 до 50 латинских букв, цифр, точек, дефисов или подчёркиваний. Начни с буквы или цифры.');
  }
  return handle;
}
