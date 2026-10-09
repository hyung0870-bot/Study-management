import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { WEEKDAYS } from '../../lib/date';
import type { WeekdayKey } from '../../types';

interface Props {
  open: boolean;
  source: WeekdayKey;
  onCopy: (targets: WeekdayKey[]) => void;
  onClose: () => void;
}

/** 이 요일의 일정을 다른 요일로 통째로 복사 */
export default function CopyDaySheet({ open, source, onCopy, onClose }: Props) {
  const [targets, setTargets] = useState<WeekdayKey[]>([]);
  useEffect(() => {
    if (open) setTargets([]);
  }, [open]);

  const toggle = (k: WeekdayKey) => setTargets((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  const sourceLabel = WEEKDAYS.find((w) => w.key === source)!.label;
  const weekdays: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="다른 요일에 복사"
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!targets.length}
          onClick={() => {
            onCopy(targets);
            onClose();
          }}
        >
          {targets.length ? `${targets.length}개 요일에 복사하기` : '요일을 골라 주세요'}
        </button>
      }
    >
      <p className="mb-4 text-sm text-ink-soft">
        <b className="text-ink">{sourceLabel}</b>의 모든 일정(공부·학교·학원·수면·기타)을 복사해요.
        <br />
        선택한 요일의 기존 일정은 <b className="text-rose-500">덮어써져요</b>.
      </p>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className="rounded-full bg-slate-50 px-3 py-1 text-xs text-ink-soft hover:bg-slate-100"
          onClick={() => setTargets(weekdays.filter((k) => k !== source))}
        >
          평일 전체
        </button>
        <button
          type="button"
          className="rounded-full bg-slate-50 px-3 py-1 text-xs text-ink-soft hover:bg-slate-100"
          onClick={() => setTargets(WEEKDAYS.map((w) => w.key).filter((k) => k !== source))}
        >
          모든 요일
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => {
          const disabled = w.key === source;
          const active = targets.includes(w.key);
          return (
            <button
              key={w.key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(w.key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl font-hand text-xl font-bold transition-all ${
                disabled
                  ? 'bg-slate-50 text-slate-300'
                  : active
                    ? 'bg-accent text-white shadow-soft'
                    : 'bg-white text-ink ring-1 ring-slate-200 hover:ring-accent'
              }`}
            >
              {active ? <Check size={18} strokeWidth={3} /> : w.short}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
