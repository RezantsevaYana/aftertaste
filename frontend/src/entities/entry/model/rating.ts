export const RATING_MIN = 1
export const RATING_MAX = 10

// Начальная оценка остаётся в пределах выбранной шкалы.
export const RATING_DEFAULT = Math.min(RATING_MAX, Math.max(RATING_MIN, 7))
