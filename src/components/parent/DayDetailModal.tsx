import { Check, X } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { formatKoreanDate } from '../../lib/date';
import { tint } from '../../lib/colors';
import { formatDuration, formatTime } from '../../lib/time';
import type { DailyRecord } from '../../types';

interface Props {
  open: boolean;
  date: Date | null;
  record: DailyRecord | null;
  onClose: () => void;
}

/** 특정 날짜를 눌렀을 때 뜨는 과목별 완료/미완료 상세 팝업 */
export default function DayDetailModal({ open, date, record, onClose }: Props) {
  if (!date) return null;
  const items = record?.items ?? [];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={formatKoreanDate(date)}
      footer={
        <button type="button" className="btn-ghost w-full" onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className="pt-1">
        <div className="mb-4 flex items-baseline justify-between rounded-2xl bg-slate-50 p-3">
          <span className="text-xs text-ink-soft">학습 완료율</span>
          <span className="font-hand text-2xl font-bold">
            {items.length ? (
              <>
                <b className={doneCount === items.length ? 'text-emerald-500' : 'text-rose-500'}>{doneCount}</b> / {items.length}개
                ({Math.round((doneCount / items.length) * 100)}%)
              </>
            ) : (
              '계획 없음'
            )}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">이 날은 등록된 공부 일정이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.planId}
                className="flex items-center gap-3 rounded-2xl p-2.5"
                style={{ backgroundColor: it.done ? '#f0fdf4' : '#fff1f2' }}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                    it.done ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                >
                  {it.done ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                </span>
                <span
                  className="rounded-md px-1.5 font-hand text-lg font-bold leading-6"
                  style={{ backgroundColor: tint(it.color, 0.2), color: it.color }}
                >
                  {it.subjectName}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{it.amount}</p>
                  <p className="text-[11px] text-ink-soft">
                    {formatTime(it.start)} ~ {formatTime(it.end)} ({formatDuration(it.minutes)})
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    it.done ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {it.done ? '완료' : '미완료'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
