import type { HHMM, TimeRange } from '../types';

export const DAY_MIN = 24 * 60;

export function toMin(t: HHMM): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMin(min: number): HHMM {
  const x = ((Math.round(min) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}

/** 시작~끝 길이(분). 끝이 시작보다 이르면 자정을 넘긴 것으로 간주. 같으면 0 */
export function durationMin(start: HHMM, end: HHMM): number {
  const d = toMin(end) - toMin(start);
  if (d === 0) return 0;
  return d > 0 ? d : d + DAY_MIN;
}

export function formatDuration(min: number): string {
  if (min <= 0) return '0분';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

/** '15:30' → '오후 3:30' */
export function formatTime(t: HHMM): string {
  const min = toMin(t);
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m}`;
}

export function formatRange(r: TimeRange): string {
  return `${formatTime(r.start)} ~ ${formatTime(r.end)}`;
}

/** 하루(0~1440) 안의 구간 목록으로 변환 - 자정을 넘기면 두 조각으로 분할 */
export function toSegments(r: TimeRange): [number, number][] {
  const s = toMin(r.start);
  const e = toMin(r.end);
  if (s === e) return [];
  if (e > s) return [[s, e]];
  return [
    [s, DAY_MIN],
    [0, e],
  ].filter(([a, b]) => b > a) as [number, number][];
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return toSegments(a).some(([as, ae]) => toSegments(b).some(([bs, be]) => as < be && bs < ae));
}
