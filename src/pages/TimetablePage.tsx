import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import CircularTimetable from '../components/timetable/CircularTimetable';
import { useStore } from '../store/StoreContext';
import { WEEKDAYS, formatKoreanDate, weekdayKeyOf } from '../lib/date';
import { buildBlocks, byStart, KIND_LABEL, type BlockKind } from '../lib/schedule';
import { FIXED_COLORS, tint } from '../lib/colors';
import { DAY_MIN, durationMin, formatDuration, formatTime, toSegments } from '../lib/time';
import type { WeekdayKey } from '../types';

/** [D] 24시간 원형 시간표 */
export default function TimetablePage() {
  const { data } = useStore();
  const todayKey = weekdayKeyOf(new Date());
  const [dayKey, setDayKey] = useState<WeekdayKey>(todayKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const blocks = useMemo(() => buildBlocks(data.week[dayKey], data.subjects), [data, dayKey]);
  const list = [...blocks].sort(byStart);

  // 종류별 합계 (겹친 시간은 각각 계산)
  const sums = useMemo(() => {
    const m: Partial<Record<BlockKind, number>> = {};
    blocks.forEach((b) => (m[b.kind] = (m[b.kind] ?? 0) + durationMin(b.start, b.end)));
    return m;
  }, [blocks]);

  // 실제로 비어 있는 시간 (겹침 제외)
  const freeMin = useMemo(() => {
    const used = new Uint8Array(DAY_MIN);
    blocks.forEach((b) => toSegments(b).forEach(([s, e]) => used.fill(1, s, e)));
    return used.reduce((n, v) => n + (v ? 0 : 1), 0);
  }, [blocks]);

  const legend: { kind: BlockKind; color: string }[] = [
    { kind: 'study', color: '#5b8def' },
    { kind: 'school', color: FIXED_COLORS.school },
    { kind: 'academy', color: FIXED_COLORS.academy },
    { kind: 'etc', color: FIXED_COLORS.etc },
    { kind: 'sleep', color: FIXED_COLORS.sleep },
  ];

  const isToday = dayKey === todayKey;

  return (
    <>
      <PageHeader
        title="하루 시간표"
        subtitle={isToday ? formatKoreanDate(new Date()) : WEEKDAYS.find((w) => w.key === dayKey)!.label}
        right={
          <Link to={`/planner/${dayKey}`} className="btn-ghost !px-3 !py-2 !text-xs">
            <Pencil size={14} /> 수정
          </Link>
        }
      />

      {/* 요일 선택 */}
      <div className="mb-4 flex gap-1.5">
        {WEEKDAYS.map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => {
              setDayKey(w.key);
              setSelectedId(null);
            }}
            className={`relative flex h-9 flex-1 items-center justify-center rounded-xl font-hand text-lg font-bold transition-colors ${
              w.key === dayKey ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:text-ink'
            }`}
          >
            {w.short}
            {w.key === todayKey && <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div className="paper-card mb-4 p-3" onClick={() => setSelectedId(null)}>
        <CircularTimetable blocks={blocks} showNow={isToday} selectedId={selectedId} onSelect={setSelectedId} />

        {/* 범례 + 합계 */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
          {legend.map(({ kind, color }) => (
            <span key={kind} className="flex items-center gap-1 text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {KIND_LABEL[kind]} <b className="text-ink">{formatDuration(sums[kind] ?? 0)}</b>
            </span>
          ))}
          <span className="flex items-center gap-1 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" />
            빈 시간 <b className="text-ink">{formatDuration(freeMin)}</b>
          </span>
        </div>
      </div>

      {/* 시간 순서 목록 */}
      {list.length === 0 ? (
        <Link to={`/planner/${dayKey}`} className="paper-card block py-8 text-center text-sm text-ink-soft">
          아직 일정이 없어요. 주간 계획에서 추가해 보세요 →
        </Link>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const sel = selectedId === b.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(sel ? null : b.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                    sel ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: tint(b.color, sel ? 0.22 : 0.12), ['--tw-ring-color' as string]: b.color }}
                >
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-hand text-xl font-bold leading-6">
                      {b.label}
                      <span className="ml-1.5 align-middle text-[10px] font-normal text-ink-soft">{KIND_LABEL[b.kind]}</span>
                    </p>
                    {b.detail && <p className="truncate text-xs text-ink-soft">{b.detail}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold">
                      {formatTime(b.start)} ~ {formatTime(b.end)}
                    </p>
                    <p className="text-[11px] text-ink-soft">{formatDuration(durationMin(b.start, b.end))}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
