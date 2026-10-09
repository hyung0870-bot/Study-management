import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronDown, PartyPopper, NotebookPen } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MonthCalendar from '../components/calendar/MonthCalendar';
import { useStore } from '../store/StoreContext';
import { formatKoreanDate, toDateKey } from '../lib/date';
import { progressOf, recordFor, sameItems, statusOf } from '../lib/records';
import { tint } from '../lib/colors';
import { formatDuration, formatTime } from '../lib/time';

/** [C] 매일의 학업 체크리스트 (메인) */
export default function TodayPage() {
  const { data, update } = useStore();
  const [selected, setSelected] = useState(() => new Date());
  const [calOpen, setCalOpen] = useState(false);

  const today = new Date();
  const todayKey = toDateKey(today);
  const selKey = toDateKey(selected);
  const status = statusOf(selKey);
  const record = recordFor(data, selected);
  const { done, total, pct } = progressOf(record);

  // 오늘 기록을 저장 → 날이 지나면 그대로 스냅샷으로 남음
  const todayRecord = recordFor(data, today)!;
  useEffect(() => {
    if (todayRecord.items.length === 0 && !data.records[todayKey]) return;
    if (sameItems(data.records[todayKey], todayRecord)) return;
    update((prev) => ({ ...prev, records: { ...prev.records, [todayKey]: todayRecord } }));
  }, [todayRecord, todayKey, data.records, update]);

  const toggle = (planId: string) => {
    if (status !== 'today') return;
    update((prev) => {
      const rec = recordFor(prev, today)!;
      const items = rec.items.map((i) =>
        i.planId === planId ? { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : undefined } : i,
      );
      return { ...prev, records: { ...prev.records, [todayKey]: { date: todayKey, items } } };
    });
  };

  const title = status === 'today' ? '오늘 할 일' : status === 'past' ? '지난 기록' : '미리 보기';
  const message =
    total === 0 ? '' : pct === 100 ? '모두 끝냈어요! 정말 멋져요 🎉' : pct >= 50 ? '절반 넘었어요, 조금만 더! 💪' : '하나씩 차근차근 해 봐요 ✏️';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={formatKoreanDate(selected)}
        right={
          <button
            type="button"
            onClick={() => setCalOpen((o) => !o)}
            className={`btn-ghost !px-3 !py-2 !text-xs ${calOpen ? '!bg-ink !text-white' : ''}`}
          >
            <CalendarDays size={16} /> 달력
            <ChevronDown size={14} className={`transition-transform ${calOpen ? 'rotate-180' : ''}`} />
          </button>
        }
      />

      {calOpen && (
        <div className="animate-pop mb-4">
          <MonthCalendar
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
            }}
          />
          {selKey !== todayKey && (
            <button type="button" onClick={() => setSelected(new Date())} className="mt-2 w-full text-center text-xs font-bold text-accent">
              오늘로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* 진행률 */}
      <div className="paper-card mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-hand text-xl font-bold">{status === 'future' ? '예정된 공부' : '달성도'}</span>
          <span className="font-hand text-3xl font-bold text-accent">
            {status === 'future' ? `${total}개` : `${pct}%`}
          </span>
        </div>
        {status !== 'future' && (
          <>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {total ? `${total}개 중 ${done}개 완료 · ${message}` : ''}
            </p>
          </>
        )}
      </div>

      {/* 체크리스트 */}
      {!record || total === 0 ? (
        <div className="paper-card flex flex-col items-center gap-2 py-10 text-center text-ink-soft">
          <NotebookPen size={30} />
          <p className="font-hand text-xl">
            {status === 'past' ? '이 날은 기록이 없어요' : '공부 계획이 없어요'}
          </p>
          {status !== 'past' && (
            <Link to="/planner" className="text-xs font-bold text-accent">
              주간 계획 세우러 가기 →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {record.items.map((it, i) => {
            const clickable = status === 'today';
            return (
              <li key={it.planId} className="animate-pop" style={{ animationDelay: `${i * 30}ms` }}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => toggle(it.planId)}
                  className={`paper-card flex w-full items-center gap-3 overflow-hidden p-0 text-left transition-all ${
                    it.done ? 'opacity-70' : ''
                  } ${clickable ? 'active:scale-[0.99]' : 'cursor-default'}`}
                >
                  <span className="w-1.5 self-stretch" style={{ backgroundColor: it.color }} />
                  <div className="min-w-0 flex-1 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 font-hand text-xl font-bold leading-7 ${it.done ? 'strike-hand' : ''}`}
                        style={{ backgroundColor: tint(it.color, 0.14), color: it.done ? undefined : it.color }}
                      >
                        {it.subjectName}
                      </span>
                      <span className={`truncate text-sm ${it.done ? 'strike-hand' : ''}`}>{it.amount}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatTime(it.start)} ~ {formatTime(it.end)} · {formatDuration(it.minutes)}
                    </p>
                  </div>
                  <span
                    className={`mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      it.done ? 'scale-105 border-emerald-400 bg-emerald-400 text-white' : 'border-slate-300 bg-white'
                    } ${status === 'future' ? 'opacity-30' : ''}`}
                  >
                    {it.done && <Check size={20} strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status === 'today' && total > 0 && pct === 100 && (
        <div className="animate-pop mt-4 flex items-center justify-center gap-2 font-hand text-2xl font-bold text-emerald-500">
          <PartyPopper /> 오늘 공부 끝!
        </div>
      )}
      {status !== 'today' && total > 0 && (
        <p className="mt-4 text-center text-xs text-ink-soft">
          {status === 'past' ? '지난 기록은 볼 수만 있어요' : '체크는 그날이 되면 할 수 있어요'}
        </p>
      )}
    </>
  );
}
