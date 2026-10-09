import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sheet from '../ui/Sheet';
import { Field, TimeRangeInput } from '../ui/Inputs';
import ConflictHint from './ConflictHint';
import { tint } from '../../lib/colors';
import { durationMin } from '../../lib/time';
import type { Block } from '../../lib/schedule';
import type { HHMM, StudyPlanItem, Subject } from '../../types';

export type StudyDraft = Omit<StudyPlanItem, 'id'>;

interface Props {
  open: boolean;
  initial: StudyPlanItem | null;
  defaults: { start: HHMM; end: HHMM };
  subjects: Subject[];
  otherBlocks: Block[];
  onSave: (v: StudyDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const AMOUNT_EXAMPLES = ['3페이지', '1단원', '문제집 2장', '단어 20개'];

export default function StudySheet({ open, initial, defaults, subjects, otherBlocks, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<StudyDraft>({ subjectId: '', amount: '', ...defaults });

  useEffect(() => {
    if (!open) return;
    setDraft(
      initial
        ? { subjectId: initial.subjectId, amount: initial.amount, start: initial.start, end: initial.end }
        : { subjectId: subjects[0]?.id ?? '', amount: '', ...defaults },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const valid = !!draft.subjectId && durationMin(draft.start, draft.end) > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? '공부 계획 수정' : '공부 계획 추가'}
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
              onSave({ ...draft, amount: draft.amount.trim() });
              onClose();
            }}
          >
            {initial ? '저장하기' : '추가하기'}
          </button>
        </div>
      }
    >
      {subjects.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-soft">
          먼저 과목을 만들어 주세요.
          <br />
          <Link to="/subjects" className="mt-3 inline-block font-bold text-accent" onClick={onClose}>
            과목 관리로 가기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-5 pt-1">
          <div>
            <span className="mb-2 block text-xs font-bold text-ink-soft">과목</span>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const active = draft.subjectId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, subjectId: s.id }))}
                    className="rounded-full border-2 px-3.5 py-1 font-hand text-lg font-bold transition-all"
                    style={
                      active
                        ? { backgroundColor: s.color, borderColor: s.color, color: 'white' }
                        : { backgroundColor: tint(s.color, 0.1), borderColor: 'transparent', color: s.color }
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="학습 분량">
            <input
              className="input-note"
              placeholder="예: 3페이지, 1단원"
              maxLength={30}
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            />
          </Field>
          <div className="-mt-3 flex flex-wrap gap-1.5">
            {AMOUNT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-ink-soft hover:bg-slate-100"
                onClick={() => setDraft((d) => ({ ...d, amount: ex }))}
              >
                {ex}
              </button>
            ))}
          </div>

          <TimeRangeInput
            start={draft.start}
            end={draft.end}
            startLabel="시작 시간"
            endLabel="끝 시간"
            onChange={(start, end) => setDraft((d) => ({ ...d, start, end }))}
          />

          <ConflictHint range={draft} others={otherBlocks} />
        </div>
      )}
    </Sheet>
  );
}
