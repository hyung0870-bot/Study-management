import type { AppData, DailyRecord, DailyRecordItem, DateKey } from '../types';
import { toDateKey, weekdayKeyOf } from './date';
import { byStart } from './schedule';
import { durationMin } from './time';

/** 해당 날짜(요일)의 현재 주간 계획으로 체크리스트 항목 생성 + 특별 미션 보존 */
export function itemsFromPlan(data: AppData, date: Date, prev?: DailyRecord): DailyRecordItem[] {
  const day = data.week[weekdayKeyOf(date)];
  // 1. 일반 주간 계획에서 가져온 항목
  const regularItems: DailyRecordItem[] = [...day.studies].sort(byStart).map((s) => {
    const sub = data.subjects.find((x) => x.id === s.subjectId);
    const old = prev?.items.find((i) => i.planId === s.id);
    return {
      planId: s.id,
      subjectId: s.subjectId,
      subjectName: sub?.name ?? '(삭제된 활동)',
      category: sub?.category || '기타',
      color: sub?.color ?? '#a0a7b4',
      amount: s.amount,
      start: s.start,
      end: s.end,
      minutes: durationMin(s.start, s.end),
      done: old?.done ?? false,
      doneAt: old?.doneAt,
      isSpecial: false,
    };
  });

  // 2. 이 날짜에 등록된 특별 미션들 (prev.items 중 isSpecial === true 또는 planId가 주간 계획에 없는 것)
  const specialItems: DailyRecordItem[] = (prev?.items ?? [])
    .filter((i) => i.isSpecial)
    .map((sp) => {
      const sub = data.subjects.find((x) => x.id === sp.subjectId);
      return {
        ...sp,
        subjectName: sub?.name ?? sp.subjectName,
        category: sub?.category ?? sp.category ?? '기타',
        color: sub?.color ?? sp.color,
      };
    });

  return [...regularItems, ...specialItems].sort(byStart);
}

export type DayStatus = 'past' | 'today' | 'future';

export function statusOf(key: DateKey): DayStatus {
  const t = toDateKey(new Date());
  return key < t ? 'past' : key > t ? 'future' : 'today';
}

/**
 * 날짜별 체크리스트 조회
 * - 오늘: 현재 계획 + 특별 미션 + 저장된 체크 상태 병합
 * - 지난 날: 저장된 스냅샷 (없으면 null)
 * - 미래: 현재 계획 + 등록된 특별 미션
 */
export function recordFor(data: AppData, date: Date): DailyRecord | null {
  const key = toDateKey(date);
  const saved = data.records[key];
  const st = statusOf(key);
  if (st === 'past') return saved ?? null;
  return {
    date: key,
    items: itemsFromPlan(data, date, saved),
    childMessage: saved?.childMessage,
    parentMessage: saved?.parentMessage,
  };
}

export function progressOf(rec: DailyRecord | null): { done: number; total: number; pct: number } {
  const total = rec?.items.length ?? 0;
  const done = rec?.items.filter((i) => i.done).length ?? 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function sameItems(a: DailyRecord | undefined, b: DailyRecord): boolean {
  return (
    !!a &&
    JSON.stringify(a.items) === JSON.stringify(b.items) &&
    a.childMessage === b.childMessage &&
    a.parentMessage === b.parentMessage
  );
}
