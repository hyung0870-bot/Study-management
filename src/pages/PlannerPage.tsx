import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, Moon, Plus, School, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MiniTimeline from '../components/planner/MiniTimeline';
import { useStore } from '../store/StoreContext';
import { WEEKDAYS, weekdayKeyOf } from '../lib/date';
import { buildBlocks, byStart, totalStudyMin } from '../lib/schedule';
import { tint } from '../lib/colors';
import { formatDuration, formatTime } from '../lib/time';

/** [B] 주간 시간표 */
export default function PlannerPage() {
  const { data } = useStore();
  const todayKey = weekdayKeyOf(new Date());
  const weekTotal = WEEKDAYS.reduce((n, w) => n + totalStudyMin(data.week[w.key]), 0);

  return (
    <>
      <PageHeader title="주간 계획" subtitle={`이번 주 공부 시간 총 ${formatDuration(weekTotal)}`} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {WEEKDAYS.map((w, i) => {
          const day = data.week[w.key];
          const blocks = buildBlocks(day, data.subjects);
          const studies = [...day.studies].sort(byStart);
          const isToday = w.key === todayKey;
          const total = totalStudyMin(day);

          return (
            <Link
              key={w.key}
              to={`/planner/${w.key}`}
              className={`paper-card animate-pop group block p-4 transition-shadow hover:shadow-paper ${isToday ? 'ring-2 ring-accent/40' : ''}`}
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className={`font-hand text-2xl font-bold leading-none ${
                    w.key === 'sun' ? 'text-rose-400' : w.key === 'sat' ? 'text-sky-500' : ''
                  }`}
                >
                  {w.label}
                </span>
                {isToday && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">오늘</span>}
                <span className="ml-auto text-xs text-ink-soft">{total > 0 && `공부 ${formatDuration(total)}`}</span>
                <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </div>

              <MiniTimeline blocks={blocks} />

              {/* 고정 일정 요약 */}
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                {day.school && (
                  <span className="flex items-center gap-1">
                    <School size={12} /> {day.school.start}~{day.school.end}
                  </span>
                )}
                {day.academies.length > 0 && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} /> 학원 {day.academies.length}
                  </span>
                )}
                {day.etc.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} /> 기타 {day.etc.length}
                  </span>
                )}
                {day.sleep && (
                  <span className="flex items-center gap-1">
                    <Moon size={12} /> {day.sleep.start} 취침
                  </span>
                )}
              </div>

              {/* 공부 계획 목록 */}
              <div className="mt-3 border-t border-dashed border-slate-200 pt-2.5">
                {studies.length === 0 ? (
                  <span className="flex items-center gap-1 text-xs text-ink-soft/70">
                    <Plus size={14} /> 공부 계획을 세워 보세요
                  </span>
                ) : (
                  <ul className="space-y-1.5">
                    {studies.map((s) => {
                      const sub = data.subjects.find((x) => x.id === s.subjectId);
                      const color = sub?.color ?? '#a0a7b4';
                      return (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
                          <span
                            className="rounded-md px-1.5 font-hand text-base font-bold leading-6"
                            style={{ backgroundColor: tint(color, 0.15), color }}
                          >
                            {sub?.name ?? '?'}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-ink-soft">{s.amount}</span>
                          <span className="shrink-0 text-[11px] text-ink-soft">{formatTime(s.start)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
