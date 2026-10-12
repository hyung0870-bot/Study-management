import { useEffect, useState } from 'react';
import Sheet from '../ui/Sheet';
import { Field } from '../ui/Inputs';
import type { CalendarEvent, CalendarEventType, DateKey, FamilyMember } from '../../types';

interface Props {
  open: boolean;
  selectedDateKey?: DateKey;
  initialEvent?: CalendarEvent | null;
  familyMembers: FamilyMember[];
  activeMember: FamilyMember | null;
  onSave: (event: {
    id?: string;
    title: string;
    type: CalendarEventType;
    startDate: DateKey;
    endDate?: DateKey;
    memo?: string;
    createdByName?: string;
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const EVENT_TYPES: { type: CalendarEventType; label: string; icon: string; bg: string; text: string }[] = [
  { type: 'birthday', label: '생일', icon: '🎂', bg: 'bg-rose-50 border-rose-200 text-rose-700', text: 'text-rose-600' },
  { type: 'trip', label: '여행일정', icon: '✈️', bg: 'bg-sky-50 border-sky-200 text-sky-700', text: 'text-sky-600' },
  { type: 'anniversary', label: '기념일', icon: '🎉', bg: 'bg-amber-50 border-amber-200 text-amber-700', text: 'text-amber-600' },
  { type: 'other', label: '기타 일정', icon: '📌', bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', text: 'text-indigo-600' },
];

export default function CalendarEventModal({
  open,
  selectedDateKey,
  initialEvent,
  familyMembers,
  activeMember,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const isEditing = !!initialEvent;
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>('birthday');
  const [startDate, setStartDate] = useState(selectedDateKey || todayStr);
  const [isRange, setIsRange] = useState(false);
  const [endDate, setEndDate] = useState(selectedDateKey || todayStr);
  const [memo, setMemo] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initialEvent) {
      setTitle(initialEvent.title);
      setType(initialEvent.type);
      setStartDate(initialEvent.startDate);
      const hasRange = !!initialEvent.endDate && initialEvent.endDate !== initialEvent.startDate;
      setIsRange(hasRange);
      setEndDate(initialEvent.endDate || initialEvent.startDate);
      setMemo(initialEvent.memo || '');
      setCreatorName(initialEvent.createdByName || '');
    } else {
      setTitle('');
      setType('birthday');
      const start = selectedDateKey || todayStr;
      setStartDate(start);
      setIsRange(false);
      setEndDate(start);
      setMemo('');
      setCreatorName(activeMember?.name || (familyMembers[0]?.name ?? '가족'));
    }
  }, [open, initialEvent, selectedDateKey, activeMember, familyMembers, todayStr]);

  const submit = () => {
    setError('');
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('일정 제목을 입력해 주세요');
      return;
    }
    if (!startDate) {
      setError('시작 날짜를 선택해 주세요');
      return;
    }
    if (isRange && endDate && endDate < startDate) {
      setError('종료 날짜는 시작 날짜 이후여야 해요');
      return;
    }

    onSave({
      id: initialEvent?.id,
      title: trimmedTitle,
      type,
      startDate,
      endDate: isRange ? endDate : undefined,
      memo: memo.trim() || undefined,
      createdByName: creatorName.trim() || undefined,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? '📅 가족 일정 수정' : '📅 새 가족 일정 등록'}
      footer={
        <div className="flex gap-2 w-full">
          {isEditing && initialEvent?.id && onDelete && (
            <button
              type="button"
              className="btn-ghost !text-rose-500 font-bold"
              onClick={() => {
                onDelete(initialEvent.id);
                onClose();
              }}
            >
              삭제
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1 !bg-accent hover:opacity-95"
            onClick={submit}
          >
            {isEditing ? '수정 완료' : '일정 등록하기'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* 일정 종류 선택 */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">일정 종류</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setType(t.type);
                  if (t.type === 'trip') setIsRange(true);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                  type === t.type
                    ? `${t.bg} shadow-xs font-bold scale-[1.02]`
                    : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
                }`}
              >
                <span className="text-xl mb-0.5">{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 일정 제목 */}
        <Field label="일정 제목">
          <input
            type="text"
            className="input-note"
            placeholder={
              type === 'birthday'
                ? '예: 민수 생일 🎉'
                : type === 'trip'
                  ? '예: 제주도 가족 여행 🏖️'
                  : type === 'anniversary'
                    ? '예: 결혼기념일 ❤️'
                    : '예: 학교 운동회'
            }
            maxLength={30}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        {/* 날짜 선택 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-ink-soft">날짜 설정</label>
            <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={isRange}
                onChange={(e) => {
                  setIsRange(e.target.checked);
                  if (e.target.checked && !endDate) setEndDate(startDate);
                }}
                className="rounded accent-accent"
              />
              <span>기간으로 설정 (며칠 동안)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-ink-soft mb-1 block">
                {isRange ? '시작일' : '날짜'}
              </span>
              <input
                type="date"
                className="input-note text-sm"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!isRange || (endDate && endDate < e.target.value)) {
                    setEndDate(e.target.value);
                  }
                }}
              />
            </div>

            {isRange && (
              <div>
                <span className="text-[11px] text-ink-soft mb-1 block">종료일</span>
                <input
                  type="date"
                  className="input-note text-sm"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* 등록자 선택 / 입력 */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">등록자 (가족 구성원)</label>
          {familyMembers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {familyMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCreatorName(m.name)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    creatorName === m.name
                      ? 'bg-ink text-white'
                      : 'bg-slate-100 text-ink-soft hover:bg-slate-200'
                  }`}
                >
                  <span>{m.avatar || '👤'}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          ) : null}
          <input
            type="text"
            className="input-note text-xs"
            placeholder="등록자 이름"
            value={creatorName}
            maxLength={10}
            onChange={(e) => setCreatorName(e.target.value)}
          />
        </div>

        {/* 메모 */}
        <Field label="메모 (선택)">
          <textarea
            className="input-note resize-none text-xs"
            rows={2}
            placeholder="준비물, 장소, 축하 메시지 등을 적어보세요"
            value={memo}
            maxLength={100}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Field>

        {error && (
          <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-500">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
