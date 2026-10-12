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

/** 이번 주의 특정 WeekdayKey에 해당하는 실제 Date 객체 계산 */
export function getDateOfWeekday(dayKey: WeekdayKey, referenceDate: Date = new Date()): Date {
  const weekdayOrder: Record<WeekdayKey, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 7,
  };
  const currentDay = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
  const targetDay = weekdayOrder[dayKey];
  const diffDays = targetDay - currentDay;
  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + diffDays);
  return targetDate;
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
