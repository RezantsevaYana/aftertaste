import { BadRequestException } from '@nestjs/common';

function name(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100 || value.split('').some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new BadRequestException(`${label}: укажи от 1 до 100 символов`);
  }
  return value.trim();
}

export function validateAvatar(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2_800_000) {
    throw new BadRequestException('Аватар должен быть JPG, PNG или WebP до 2 МБ');
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new BadRequestException('Выбери аватар в формате JPG, PNG или WebP');
  const buffer = Buffer.from(match[2]!, 'base64');
  const valid = match[1] === 'jpeg' ? buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : match[1] === 'png' ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  if (!valid || buffer.length > 2 * 1024 * 1024) throw new BadRequestException('Не удалось прочитать аватар. Выбери другое изображение.');
  return value;
}

export function validateProfile(body: unknown) {
  if (!body || typeof body !== 'object') throw new BadRequestException('Укажи имя и фамилию');
  const profile = body as Record<string, unknown>;
  return { firstName: name(profile.firstName, 'Имя'), lastName: name(profile.lastName, 'Фамилия'), avatar: validateAvatar(profile.avatar) };
}
