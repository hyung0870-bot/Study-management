import type { AppData, DailyRecord, DailyRecordItem, DateKey } from '../types';
import { toDateKey, weekdayKeyOf } from './date';
import { byStart } from './schedule';
import { durationMin } from './time';

/** 해당 날짜(요일)의 현재 주간 계획으로 체크리스트 항목 생성 */
export function itemsFromPlan(data: AppData, date: Date, prev?: DailyRecord): DailyRecordItem[] {
  const day = data.week[weekdayKeyOf(date)];
  return [...day.studies].sort(byStart).map((s) => {
    const sub = data.subjects.find((x) => x.id === s.subjectId);
    const old = prev?.items.find((i) => i.planId === s.id);
    return {
      planId: s.id,
      subjectId: s.subjectId,
      subjectName: sub?.name ?? '(삭제된 과목)',
      color: sub?.color ?? '#a0a7b4',
      amount: s.amount,
      start: s.start,
      end: s.end,
      minutes: durationMin(s.start, s.end),
      done: old?.done ?? false,
      doneAt: old?.doneAt,
    };
  });
}

export type DayStatus = 'past' | 'today' | 'future';

export function statusOf(key: DateKey): DayStatus {
  const t = toDateKey(new Date());
  return key < t ? 'past' : key > t ? 'future' : 'today';
}

/**
 * 날짜별 체크리스트 조회
 * - 오늘: 현재 계획 + 저장된 체크 상태 병합 (오늘 중 계획 변경도 반영)
 * - 지난 날: 저장된 스냅샷만 (없으면 기록 없음)
 * - 미래: 현재 계획 미리보기
 */
export function recordFor(data: AppData, date: Date): DailyRecord | null {
  const key = toDateKey(date);
  const saved = data.records[key];
  const st = statusOf(key);
  if (st === 'past') return saved ?? null;
  return { date: key, items: itemsFromPlan(data, date, saved) };
}

export function progressOf(rec: DailyRecord | null): { done: number; total: number; pct: number } {
  const total = rec?.items.length ?? 0;
  const done = rec?.items.filter((i) => i.done).length ?? 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function sameItems(a: DailyRecord | undefined, b: DailyRecord): boolean {
  return !!a && JSON.stringify(a.items) === JSON.stringify(b.items);
}
