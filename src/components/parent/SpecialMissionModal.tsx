import { useEffect, useState } from 'react';
import Sheet from '../ui/Sheet';
import { Field, TimeRangeInput } from '../ui/Inputs';
import { durationMin } from '../../lib/time';
import type { HHMM, Subject } from '../../types';

interface Props {
  open: boolean;
  existingSubjects: Subject[];
  defaultTimes?: { start: HHMM; end: HHMM };
  onSave: (mission: {
    activityName: string;
    category: string;
    start: HHMM;
    end: HHMM;
    amount?: string;
  }) => void;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = ['수학', '국어', '영어', '과학', '사회', '독서', '예체능', '기타'];

export default function SpecialMissionModal({
  open,
  existingSubjects,
  defaultTimes = { start: '17:00', end: '17:30' },
  onSave,
  onClose,
}: Props) {
  const [activityName, setActivityName] = useState('');
  const [category, setCategory] = useState('수학');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState(defaultTimes.start);
  const [end, setEnd] = useState(defaultTimes.end);

  const existingCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingSubjects.map((s) => s.category).filter(Boolean) as string[]]),
  );

  useEffect(() => {
    if (!open) return;
    setActivityName('');
    setCategory('수학');
    setAmount('');
    setStart(defaultTimes.start);
    setEnd(defaultTimes.end);
  }, [open, defaultTimes.start, defaultTimes.end]);

  const selectExistingSubject = (sub: Subject) => {
    setActivityName(sub.name);
    if (sub.category) setCategory(sub.category);
  };

  const valid = activityName.trim().length > 0 && category.trim().length > 0 && durationMin(start, end) > 0;

  const submit = () => {
    if (!valid) return;
    onSave({
      activityName: activityName.trim(),
      category: category.trim(),
      amount: amount.trim(),
      start,
      end,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="⭐ 특별 미션 등록"
      footer={
        <button type="button" className="btn-primary w-full" disabled={!valid} onClick={submit}>
          오늘 할 일에 등록하기
        </button>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
          💡 특별 미션은 주간 계획에 포함되지 않고 <b>오늘(선택된 날짜)의 체크리스트에만</b> 추가되며, 과목 관리에 특별 미션으로 자동 등록되어 통계에 집계됩니다.
        </p>

        {/* 기존 등록된 활동 빠른 선택 */}
        {existingSubjects.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-bold text-ink-soft">기존 활동/교재에서 선택</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {existingSubjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectExistingSubject(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                    activityName === s.name ? 'bg-ink text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. 활동 이름 */}
        <Field label="활동 이름 (교재명)">
          <input
            autoFocus
            className="input-note"
            placeholder="예: 쎈수학 오답노트, 독서록 쓰기, 단어 암기"
            maxLength={25}
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
          />
        </Field>

        {/* 2. 과목 */}
        <div>
          <span className="mb-2 block text-xs font-bold text-ink-soft">과목</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {existingCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                  category === cat ? 'bg-ink text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            className="input-note text-xs"
            placeholder="직접 입력하거나 위 버튼을 선택하세요"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* 3. 학습 분량 (선택) */}
        <Field label="학습 분량 (선택)">
          <input
            className="input-note"
            placeholder="예: 3문제 풀기, 1챕터 읽기"
            maxLength={25}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        {/* 4. 시간 */}
        <TimeRangeInput
          start={start}
          end={end}
          startLabel="시작 시간"
          endLabel="끝 시간"
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
      </div>
    </Sheet>
  );
}
