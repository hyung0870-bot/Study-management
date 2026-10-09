import { WEEKDAYS } from '../../lib/date';
import type { WeekMinutes } from '../../lib/schedule';
import { sumWeek } from '../../lib/schedule';
import { formatDuration } from '../../lib/time';

/** 분 → 칸에 들어갈 짧은 표기: 30분 / 1시간 / 1시간 30분(두 줄) */
function Cell({ min, color }: { min: number; color: string }) {
  if (!min) return <span className="text-slate-300">-</span>;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return (
    <span className="font-bold leading-tight" style={{ color }}>
      {h > 0 && <span className="block">{h}시간</span>}
      {m > 0 && <span className="block">{m}분</span>}
    </span>
  );
}

/** 요일별 할당 시간 + 주간 합계 */
export default function WeekMinutesGrid({ minutes, color }: { minutes: WeekMinutes; color: string }) {
  const total = sumWeek(minutes);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => {
          const v = minutes[w.key];
          return (
            <div
              key={w.key}
              className="flex min-h-[52px] flex-col items-center justify-start rounded-lg py-1"
              style={{ backgroundColor: v ? `${color}1f` : '#f7f8fa' }}
            >
              <span
                className={`text-[10px] font-bold ${w.key === 'sun' ? 'text-rose-400' : w.key === 'sat' ? 'text-sky-500' : 'text-ink-soft'}`}
              >
                {w.short}
              </span>
              <span className="mt-0.5 text-[10px]">
                <Cell min={v} color={color} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-right text-xs text-ink-soft">
        주간 합계 <b className="text-sm text-ink">{formatDuration(total)}</b>
      </p>
    </div>
  );
}
