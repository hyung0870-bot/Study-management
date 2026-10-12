import type { CalendarEvent, DateKey } from '../types';
import { toDateKey } from './date';

/** 양력 Date 객체를 한국 음력 정보로 변환 */
export interface LunarDateInfo {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
}

const chineseFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
});

// 캐싱을 통해 동일 날짜 변환 속도 최적화
const lunarCache = new Map<string, LunarDateInfo>();

export function getLunarDate(solarDate: Date): LunarDateInfo {
  const dateKey = toDateKey(solarDate);
  if (lunarCache.has(dateKey)) {
    return lunarCache.get(dateKey)!;
  }

  const parts = chineseFormatter.formatToParts(solarDate);
  const yearPart = parts.find((p) => (p.type as string) === 'relatedYear' || p.type === 'year')?.value ?? '2026';
  const monthPart = parts.find((p) => p.type === 'month')?.value ?? '1';
  const dayPart = parts.find((p) => p.type === 'day')?.value ?? '1';


  const isLeapMonth = monthPart.includes('윤') || monthPart.startsWith('leap');
  const cleanMonth = parseInt(monthPart.replace(/[^0-9]/g, ''), 10) || 1;
  const cleanDay = parseInt(dayPart.replace(/[^0-9]/g, ''), 10) || 1;
  const cleanYear = parseInt(yearPart.replace(/[^0-9]/g, ''), 10) || solarDate.getFullYear();

  const info: LunarDateInfo = {
    lunarYear: cleanYear,
    lunarMonth: cleanMonth,
    lunarDay: cleanDay,
    isLeapMonth,
  };

  lunarCache.set(dateKey, info);
  return info;
}

/** 특정 연도(solarYear)에서 특정 음력 월/일에 해당하는 양력 DateKey 찾기 (캐시 포함) */
const solarByLunarCache = new Map<string, DateKey | null>();

export function findSolarDateForLunar(
  solarYear: number,
  targetMonth: number,
  targetDay: number,
  targetIsLeap = false,
): DateKey | null {
  const cacheKey = `${solarYear}-${targetMonth}-${targetDay}-${targetIsLeap ? 'leap' : 'norm'}`;
  if (solarByLunarCache.has(cacheKey)) {
    return solarByLunarCache.get(cacheKey)!;
  }

  // 음력 월/일은 대략 양력 기준 해당 연도의 1월 중순부터 이듬해 2월 사이에 분포
  const start = new Date(solarYear, 0, 15);
  const end = new Date(solarYear + 1, 2, 5);

  let candidate: DateKey | null = null;
  const cur = new Date(start);

  while (cur <= end) {
    const lun = getLunarDate(cur);
    if (
      lun.lunarMonth === targetMonth &&
      lun.lunarDay === targetDay &&
      (targetIsLeap ? lun.isLeapMonth : !lun.isLeapMonth)
    ) {
      // 해당 연도에 가장 가까운 양력 날짜(보통 solarYear 내)
      const curYear = cur.getFullYear();
      if (curYear === solarYear || (curYear === solarYear + 1 && !candidate)) {
        candidate = toDateKey(cur);
        if (curYear === solarYear) break;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  // 만약 윤달을 못 찾았을 경우 평달로 대체
  if (!candidate && targetIsLeap) {
    candidate = findSolarDateForLunar(solarYear, targetMonth, targetDay, false);
  }

  solarByLunarCache.set(cacheKey, candidate);
  return candidate;
}

/**
 * 특정 날짜(queryDateKey)에 해당 CalendarEvent가 발생하는지 판별
 */
export function isEventOccurringOnDate(event: CalendarEvent, queryDateKey: DateKey): boolean {
  const queryDate = new Date(queryDateKey + 'T00:00:00');
  const eventStartDate = new Date(event.startDate + 'T00:00:00');

  // 시작 날짜 이전이면 발생하지 않음
  if (queryDateKey < event.startDate) {
    return false;
  }

  const recurrence = event.recurrence ?? 'none';
  const isLunar = event.calendarType === 'lunar';

  // 1) 반복이 없는 일반 일정 ('none')
  if (recurrence === 'none') {
    if (event.endDate) {
      return queryDateKey >= event.startDate && queryDateKey <= event.endDate;
    }
    return queryDateKey === event.startDate;
  }

  // 2) 매주 같은 요일 반복 ('weekly')
  if (recurrence === 'weekly') {
    return queryDate.getDay() === eventStartDate.getDay();
  }

  // 3) 매달 같은 날짜 반복 ('monthly')
  if (recurrence === 'monthly') {
    if (isLunar) {
      const lun = getLunarDate(queryDate);
      const targetDay = event.lunarDay ?? parseInt(event.startDate.slice(8, 10), 10);
      return lun.lunarDay === targetDay;
    } else {
      const targetDay = parseInt(event.startDate.slice(8, 10), 10);
      return queryDate.getDate() === targetDay;
    }
  }

  // 4) 매년 같은 날짜 반복 ('yearly')
  if (recurrence === 'yearly') {
    if (isLunar) {
      // 음력 반복: 음력 월/일 일치 확인
      const lun = getLunarDate(queryDate);
      const targetMonth = event.lunarMonth ?? parseInt(event.startDate.slice(5, 7), 10);
      const targetDay = event.lunarDay ?? parseInt(event.startDate.slice(8, 10), 10);
      const targetLeap = !!event.isLeapMonth;

      if (targetLeap) {
        return lun.lunarMonth === targetMonth && lun.lunarDay === targetDay && lun.isLeapMonth;
      }
      return lun.lunarMonth === targetMonth && lun.lunarDay === targetDay && !lun.isLeapMonth;
    } else {
      // 양력 반복: 월/일이 같음 (예: 05-12)
      return queryDateKey.slice(5) === event.startDate.slice(5);
    }
  }

  return false;
}
