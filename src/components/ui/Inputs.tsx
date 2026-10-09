import type { ReactNode } from 'react';
import type { HHMM } from '../../types';
import { durationMin, formatDuration } from '../../lib/time';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

interface TimeRangeProps {
  start: HHMM;
  end: HHMM;
  onChange: (start: HHMM, end: HHMM) => void;
  startLabel?: string;
  endLabel?: string;
}

/** 시작 ~ 끝 시간 입력 + 소요시간 표시 */
export function TimeRangeInput({ start, end, onChange, startLabel = '시작', endLabel = '끝' }: TimeRangeProps) {
  const dur = durationMin(start, end);
  return (
    <div>
      <div className="flex items-end gap-2">
        <Field label={startLabel}>
          <input type="time" className="input-note" value={start} onChange={(e) => onChange(e.target.value || start, end)} />
        </Field>
        <span className="pb-2.5 font-hand text-xl text-ink-soft">~</span>
        <Field label={endLabel}>
          <input type="time" className="input-note" value={end} onChange={(e) => onChange(start, e.target.value || end)} />
        </Field>
      </div>
      <p className={`mt-1.5 text-xs ${dur === 0 ? 'text-rose-500' : 'text-ink-soft'}`}>
        {dur === 0 ? '시작과 끝 시간이 같아요' : `⏱ ${formatDuration(dur)}${dur >= 12 * 60 && startLabel !== '취침' ? ' (시간을 다시 확인해 주세요)' : ''}`}
      </p>
    </div>
  );
}
