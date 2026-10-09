import type { DaySchedule, Subject, TimeRange, WeekdayKey } from '../types';
import { FIXED_COLORS } from './colors';
import { durationMin, rangesOverlap, toMin } from './time';

export type BlockKind = 'school' | 'academy' | 'sleep' | 'etc' | 'study';

/** 하루 시간표의 블록 1개 (원형 시간표 / 미니 타임라인 공용) */
export interface Block extends TimeRange {
  id: string;
  kind: BlockKind;
  label: string;
  detail?: string;
  color: string;
}

export const KIND_LABEL: Record<BlockKind, string> = {
  school: '학교',
  academy: '학원',
  sleep: '수면',
  etc: '기타',
  study: '공부',
};

export function buildBlocks(day: DaySchedule, subjects: Subject[]): Block[] {
  const blocks: Block[] = [];
  if (day.sleep) blocks.push({ id: 'sleep', kind: 'sleep', label: '잠자기', color: FIXED_COLORS.sleep, ...day.sleep });
  if (day.school) blocks.push({ id: 'school', kind: 'school', label: '학교', color: FIXED_COLORS.school, ...day.school });
  day.academies.forEach((a) =>
    blocks.push({ id: a.id, kind: 'academy', label: a.name || '학원', color: FIXED_COLORS.academy, start: a.start, end: a.end }),
  );
  day.etc.forEach((e) =>
    blocks.push({ id: e.id, kind: 'etc', label: e.name || '기타', color: FIXED_COLORS.etc, start: e.start, end: e.end }),
  );
  day.studies.forEach((s) => {
    const sub = subjects.find((x) => x.id === s.subjectId);
    blocks.push({
      id: s.id,
      kind: 'study',
      label: sub?.name ?? '(삭제된 과목)',
      detail: s.amount,
      color: sub?.color ?? '#a0a7b4',
      start: s.start,
      end: s.end,
    });
  });
  return blocks.filter((b) => durationMin(b.start, b.end) > 0);
}

/** 다른 블록과 시간이 겹치는 블록 id 집합 */
export function findConflicts(blocks: Block[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++)
      if (rangesOverlap(blocks[i], blocks[j])) {
        ids.add(blocks[i].id);
        ids.add(blocks[j].id);
      }
  return ids;
}

export function totalStudyMin(day: DaySchedule): number {
  return day.studies.reduce((acc, s) => acc + durationMin(s.start, s.end), 0);
}

export function byStart<T extends TimeRange>(a: T, b: T): number {
  return toMin(a.start) - toMin(b.start);
}

export type WeekMinutes = Record<WeekdayKey, number>;
const zeroWeek = (): WeekMinutes => ({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 });

/** 과목별 요일 학습 시간(분) */
export function subjectWeekMinutes(week: Record<WeekdayKey, DaySchedule>): Record<string, WeekMinutes> {
  const map: Record<string, WeekMinutes> = {};
  for (const k of Object.keys(week) as WeekdayKey[])
    for (const s of week[k].studies) {
      map[s.subjectId] ??= zeroWeek();
      map[s.subjectId][k] += durationMin(s.start, s.end);
    }
  return map;
}

export interface Activity {
  name: string;
  kind: 'academy' | 'etc';
  color: string;
  minutes: WeekMinutes;
}

/** 주간 계획의 학원/기타 일정을 이름별로 묶은 활동 목록 (예: 수영, 공부방) */
export function activitiesOf(week: Record<WeekdayKey, DaySchedule>): Activity[] {
  const map = new Map<string, Activity>();
  for (const k of Object.keys(week) as WeekdayKey[]) {
    const add = (list: { name: string; start: string; end: string }[], kind: Activity['kind']) =>
      list.forEach((r) => {
        const name = r.name.trim() || (kind === 'academy' ? '학원' : '기타');
        const id = `${kind}:${name}`;
        if (!map.has(id)) map.set(id, { name, kind, color: FIXED_COLORS[kind], minutes: zeroWeek() });
        map.get(id)!.minutes[k] += durationMin(r.start, r.end);
      });
    add(week[k].academies, 'academy');
    add(week[k].etc, 'etc');
  }
  return [...map.values()].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'academy' ? -1 : 1));
}

export const sumWeek = (w: WeekMinutes) => Object.values(w).reduce((a, b) => a + b, 0);
