import type { DateKey, WeekdayKey } from '../types';

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'mon', label: '월요일', short: '월' },
  { key: 'tue', label: '화요일', short: '화' },
  { key: 'wed', label: '수요일', short: '수' },
  { key: 'thu', label: '목요일', short: '목' },
  { key: 'fri', label: '금요일', short: '금' },
  { key: 'sat', label: '토요일', short: '토' },
  { key: 'sun', label: '일요일', short: '일' },
];

/** JS Date.getDay() (일=0) → WeekdayKey */
export function weekdayKeyOf(date: Date): WeekdayKey {
  const map: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[date.getDay()];
}

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatKoreanDate(date: Date): string {
  const w = WEEKDAYS.find((w) => w.key === weekdayKeyOf(date))!;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${w.label}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
