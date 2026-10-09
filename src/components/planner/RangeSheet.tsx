import { useEffect, useState } from 'react';
import Sheet from '../ui/Sheet';
import { Field, TimeRangeInput } from '../ui/Inputs';
import ConflictHint from './ConflictHint';
import { durationMin } from '../../lib/time';
import type { Block } from '../../lib/schedule';
import type { HHMM, NamedTimeRange } from '../../types';

export type RangeDraft = Omit<NamedTimeRange, 'id'>;

interface Props {
  open: boolean;
  kindLabel: string; // '학원' | '기타 일정'
  placeholder: string;
  initial: NamedTimeRange | null;
  defaults: { start: HHMM; end: HHMM };
  otherBlocks: Block[];
  onSave: (v: RangeDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** 학원 / 기타 일정 입력 (이름 + 시작 + 끝) */
export default function RangeSheet({ open, kindLabel, placeholder, initial, defaults, otherBlocks, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<RangeDraft>({ name: '', ...defaults });

  useEffect(() => {
    if (!open) return;
    setDraft(initial ? { name: initial.name, start: initial.start, end: initial.end } : { name: '', ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const valid = draft.name.trim().length > 0 && durationMin(draft.start, draft.end) > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${kindLabel} ${initial ? '수정' : '추가'}`}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              className="btn-ghost !text-rose-500"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              삭제
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!valid}
            onClick={() => {
              onSave({ ...draft, name: draft.name.trim() });
              onClose();
            }}
          >
            {initial ? '저장하기' : '추가하기'}
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        <Field label={`${kindLabel} 이름`}>
          <input
            autoFocus={!initial}
            className="input-note"
            placeholder={placeholder}
            maxLength={20}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <TimeRangeInput
          start={draft.start}
          end={draft.end}
          startLabel="시작 시간"
          endLabel="끝 시간"
          onChange={(start, end) => setDraft((d) => ({ ...d, start, end }))}
        />
        <ConflictHint range={draft} others={otherBlocks} />
      </div>
    </Sheet>
  );
}
