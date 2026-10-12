import { useState } from 'react';
import Sheet from '../ui/Sheet';
import { Field, TimeRangeInput } from '../ui/Inputs';
import { tint } from '../../lib/colors';
import { durationMin } from '../../lib/time';
import type { Block, BlockKind } from '../../lib/schedule';
import type { HHMM, Subject } from '../../types';

export type PlanEditAction =
  | { type: 'save_study'; id?: string; subjectId: string; amount: string; start: HHMM; end: HHMM }
  | { type: 'save_special'; id?: string; activityName: string; category: string; amount: string; start: HHMM; end: HHMM }
  | { type: 'save_range'; kind: 'academy' | 'etc'; id?: string; name: string; start: HHMM; end: HHMM }
  | { type: 'delete'; kind: BlockKind; id: string; isSpecial?: boolean };

interface Props {
  open: boolean;
  selectedBlock: Block | null;
  emptyTimeSlot: { start: HHMM; end: HHMM } | null;
  subjects: Subject[];
  isToday?: boolean;
  onAction: (action: PlanEditAction) => void;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = ['수학', '국어', '영어', '과학', '사회', '독서', '예체능', '기타'];

export default function ScheduleDetailModal({
  open,
  selectedBlock,
  emptyTimeSlot,
  subjects,
  onAction,
  onClose,
}: Props) {
  // 모드: 'edit' (기존 블록 수정) vs 'add' (새 항목 추가)
  const isEditing = !!selectedBlock;

  // 추가 시 분류: 'regular_study' | 'special_mission' | 'academy' | 'etc'
  const [addType, setAddType] = useState<'regular_study' | 'special_mission' | 'academy' | 'etc'>('regular_study');

  // 일반 공부 계획 폼 필드
  const [subjectId, setSubjectId] = useState(() => subjects[0]?.id ?? '');
  const [amount, setAmount] = useState('');

  // 특별 미션 폼 필드
  const [specialName, setSpecialName] = useState('');
  const [specialCategory, setSpecialCategory] = useState('수학');

  // 학원/기타 폼 필드
  const [rangeName, setRangeName] = useState('');

  // 공통 시간
  const [start, setStart] = useState('16:00');
  const [end, setEnd] = useState('16:30');

  // 모달이 열릴 때 상태 초기화
  useState(() => {
    if (selectedBlock) {
      setStart(selectedBlock.start);
      setEnd(selectedBlock.end);
      if (selectedBlock.isSpecial) {
        setSpecialName(selectedBlock.label.replace(/^⭐\s*/, ''));
        const sub = subjects.find((s) => s.name === selectedBlock.label.replace(/^⭐\s*/, ''));
        if (sub?.category) setSpecialCategory(sub.category);
        setAmount(selectedBlock.detail === '특별 미션' ? '' : selectedBlock.detail || '');
      } else if (selectedBlock.kind === 'study') {
        const sub = subjects.find((s) => s.name === selectedBlock.label);
        if (sub) setSubjectId(sub.id);
        setAmount(selectedBlock.detail || '');
      } else {
        setRangeName(selectedBlock.label || '');
      }
    } else if (emptyTimeSlot) {
      setStart(emptyTimeSlot.start);
      setEnd(emptyTimeSlot.end);
      setAmount('');
      setSpecialName('');
      setRangeName('');
    }
  });

  if (!open) return null;

  const valid = durationMin(start, end) > 0;

  const handleSave = () => {
    if (!valid) return;

    if (isEditing && selectedBlock) {
      if (selectedBlock.isSpecial) {
        onAction({
          type: 'save_special',
          id: selectedBlock.id,
          activityName: specialName.trim() || selectedBlock.label.replace(/^⭐\s*/, ''),
          category: specialCategory,
          amount,
          start,
          end,
        });
      } else if (selectedBlock.kind === 'study') {
        onAction({
          type: 'save_study',
          id: selectedBlock.id,
          subjectId: subjectId || subjects[0]?.id,
          amount,
          start,
          end,
        });
      } else if (selectedBlock.kind === 'academy' || selectedBlock.kind === 'etc') {
        onAction({
          type: 'save_range',
          kind: selectedBlock.kind,
          id: selectedBlock.id,
          name: rangeName.trim() || selectedBlock.label,
          start,
          end,
        });
      }
    } else {
      // 신규 추가
      if (addType === 'regular_study') {
        onAction({
          type: 'save_study',
          subjectId: subjectId || subjects[0]?.id,
          amount,
          start,
          end,
        });
      } else if (addType === 'special_mission') {
        onAction({
          type: 'save_special',
          activityName: specialName.trim() || '특별 미션',
          category: specialCategory,
          amount,
          start,
          end,
        });
      } else if (addType === 'academy' || addType === 'etc') {
        onAction({
          type: 'save_range',
          kind: addType,
          name: rangeName.trim() || (addType === 'academy' ? '학원' : '기타 일정'),
          start,
          end,
        });
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (!selectedBlock) return;
    onAction({
      type: 'delete',
      kind: selectedBlock.kind,
      id: selectedBlock.id,
      isSpecial: selectedBlock.isSpecial,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? `${selectedBlock.label} 일정 수정` : '새 일정 추가'}
      footer={
        <div className="flex gap-2 w-full">
          {isEditing && selectedBlock && selectedBlock.id !== 'school' && selectedBlock.id !== 'sleep' && (
            <button
              type="button"
              className="btn-ghost !text-rose-500 font-bold"
              onClick={handleDelete}
            >
              삭제
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!valid}
            onClick={handleSave}
          >
            {isEditing ? '수정 저장' : '일정에 추가'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* 새 항목 추가 시 종류 선택 탭 */}
        {!isEditing && (
          <div>
            <span className="mb-1.5 block text-xs font-bold text-ink-soft">추가할 일정 종류</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setAddType('regular_study')}
                className={`rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ${
                  addType === 'regular_study'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
                }`}
              >
                일반 공부 (주간)
              </button>
              <button
                type="button"
                onClick={() => setAddType('special_mission')}
                className={`rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ${
                  addType === 'special_mission'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
                }`}
              >
                ⭐ 특별 미션 (오늘)
              </button>
              <button
                type="button"
                onClick={() => setAddType('academy')}
                className={`rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ${
                  addType === 'academy'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
                }`}
              >
                학원 일정
              </button>
              <button
                type="button"
                onClick={() => setAddType('etc')}
                className={`rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ${
                  addType === 'etc'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
                }`}
              >
                기타 일정
              </button>
            </div>
          </div>
        )}

        {/* 1. 일반 공부 설정 */}
        {(isEditing ? selectedBlock?.kind === 'study' && !selectedBlock?.isSpecial : addType === 'regular_study') && (
          <div className="space-y-3">
            <div>
              <span className="mb-2 block text-xs font-bold text-ink-soft">활동 / 과목 선택</span>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {subjects.map((s) => {
                  const active = subjectId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubjectId(s.id)}
                      className="flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-hand text-base font-bold transition-all"
                      style={
                        active
                          ? { backgroundColor: s.color, borderColor: s.color, color: 'white' }
                          : { backgroundColor: tint(s.color, 0.1), borderColor: 'transparent', color: s.color }
                      }
                    >
                      <span>{s.name}</span>
                      {s.category && (
                        <span className={`text-[10px] px-1 rounded-full font-sans ${active ? 'bg-white/20' : 'bg-black/5'}`}>
                          {s.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="학습 분량">
              <input
                className="input-note"
                placeholder="예: 3페이지, 1단원"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* 2. 특별 미션 설정 */}
        {(isEditing ? selectedBlock?.isSpecial : addType === 'special_mission') && (
          <div className="space-y-3">
            <Field label="활동 이름 (교재명)">
              <input
                className="input-note"
                placeholder="예: 디딤돌 쎈수학, 독서노트"
                value={specialName}
                onChange={(e) => setSpecialName(e.target.value)}
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-xs font-bold text-ink-soft">과목 (대분류)</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DEFAULT_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSpecialCategory(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                      specialCategory === c ? 'bg-ink text-white' : 'bg-slate-100 text-ink-soft'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <Field label="학습 분량 (선택)">
              <input
                className="input-note"
                placeholder="예: 5문제 오답노트"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* 3. 학원 / 기타 일정 설정 */}
        {(isEditing
          ? selectedBlock?.kind === 'academy' || selectedBlock?.kind === 'etc'
          : addType === 'academy' || addType === 'etc') && (
          <Field label={isEditing ? '일정 이름' : addType === 'academy' ? '학원 이름' : '기타 일정 이름'}>
            <input
              className="input-note"
              placeholder="예: 피아노학원, 저녁식사, 운동"
              value={rangeName}
              onChange={(e) => setRangeName(e.target.value)}
            />
          </Field>
        )}

        {/* 공통 시간 설정 */}
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
