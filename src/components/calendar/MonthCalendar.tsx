import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { toDateKey } from '../../lib/date';
import { progressOf, recordFor, statusOf } from '../../lib/records';

interface Props {
  selected: Date;
  onSelect: (d: Date) => void;
  /** true: 미완료 날짜를 붉게 강조 (학부모 모드) */
  highlightIncomplete?: boolean;
}

const HEAD = ['월', '화', '수', '목', '금', '토', '일'];

/** 월간 달력 - 날짜별 체크리스트 달성 상태 표시 */
export default function MonthCalendar({ selected, onSelect, highlightIncomplete }: Props) {
  const { data } = useStore();
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // 월요일 시작
    const days = new Date(y, m + 1, 0).getDate();
    const arr: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(y, m, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  const selKey = toDateKey(selected);
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div className="paper-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="rounded-full p-1.5 text-ink-soft hover:bg-slate-100">
          <ChevronLeft size={20} />
        </button>
        <span className="font-hand text-2xl font-bold">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </span>
        <button type="button" onClick={() => move(1)} aria-label="다음 달" className="rounded-full p-1.5 text-ink-soft hover:bg-slate-100">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {HEAD.map((h, i) => (
          <span key={h} className={`pb-1 text-[11px] font-bold ${i === 6 ? 'text-rose-400' : i === 5 ? 'text-sky-500' : 'text-ink-soft'}`}>
            {h}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = toDateKey(d);
          const st = statusOf(key);
          const { total, pct } = progressOf(st === 'future' ? null : recordFor(data, d));
          const complete = total > 0 && pct === 100;
          const incomplete = total > 0 && pct < 100 && st === 'past';
          const isSel = key === selKey;
          const bad = highlightIncomplete && incomplete;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-all ${
                isSel ? 'bg-ink font-bold text-white' : bad ? 'bg-rose-50 text-rose-600' : 'hover:bg-slate-50'
              } ${st === 'today' && !isSel ? 'ring-2 ring-accent/50 font-bold' : ''} ${st === 'future' && !isSel ? 'text-ink-soft/60' : ''}`}
            >
              <span>{d.getDate()}</span>
              <span className="mt-0.5 h-1.5">
                {complete && <span className={`block h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-emerald-400'}`} />}
                {total > 0 && !complete && st !== 'future' && (
                  <span className={`block h-1.5 w-1.5 rounded-full ${isSel ? 'bg-rose-300' : 'bg-rose-500'}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 다 했어요
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> 덜 했어요
        </span>
      </div>
    </div>
  );
}
