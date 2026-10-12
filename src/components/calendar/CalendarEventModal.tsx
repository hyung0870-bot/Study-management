import { useEffect, useState } from 'react';
import { Repeat, Moon, Sun } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { Field } from '../ui/Inputs';
import { getLunarDate } from '../../lib/lunar';
import type {
  CalendarDateType,
  CalendarEvent,
  CalendarEventType,
  DateKey,
  FamilyMember,
  RecurrenceType,
} from '../../types';

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
    calendarType?: CalendarDateType;
    lunarMonth?: number;
    lunarDay?: number;
    isLeapMonth?: boolean;
    recurrence?: RecurrenceType;
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

const RECURRENCE_OPTIONS: { type: RecurrenceType; label: string; desc: string }[] = [
  { type: 'none', label: '반복 없음', desc: '해당 날짜에 1회' },
  { type: 'weekly', label: '매주 반복', desc: '매주 같은 요일마다' },
  { type: 'monthly', label: '매달 반복', desc: '매달 같은 날마다' },
  { type: 'yearly', label: '매년 반복', desc: '매년 같은 날마다 (생일/기념일 추천)' },
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

  // 1. 양력 / 음력 설정
  const [calendarType, setCalendarType] = useState<CalendarDateType>('solar');
  const [lunarMonth, setLunarMonth] = useState<number>(1);
  const [lunarDay, setLunarDay] = useState<number>(1);
  const [isLeapMonth, setIsLeapMonth] = useState(false);

  // 2. 반복 설정
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [error, setError] = useState('');

  // 시작 날짜가 바뀔 때, 양력 기준의 현재 음력 정보도 함께 자동 계산
  useEffect(() => {
    if (!startDate) return;
    try {
      const d = new Date(startDate + 'T00:00:00');
      const lun = getLunarDate(d);
      if (!isEditing || calendarType === 'solar') {
        setLunarMonth(lun.lunarMonth);
        setLunarDay(lun.lunarDay);
        setIsLeapMonth(lun.isLeapMonth);
      }
    } catch (e) {
      console.error('lunar convert error', e);
    }
  }, [startDate, isEditing, calendarType]);

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
      setCalendarType(initialEvent.calendarType || 'solar');
      setRecurrence(initialEvent.recurrence || 'none');

      if (initialEvent.lunarMonth && initialEvent.lunarDay) {
        setLunarMonth(initialEvent.lunarMonth);
        setLunarDay(initialEvent.lunarDay);
        setIsLeapMonth(!!initialEvent.isLeapMonth);
      } else {
        const lun = getLunarDate(new Date(initialEvent.startDate + 'T00:00:00'));
        setLunarMonth(lun.lunarMonth);
        setLunarDay(lun.lunarDay);
        setIsLeapMonth(lun.isLeapMonth);
      }
    } else {
      setTitle('');
      setType('birthday');
      const start = selectedDateKey || todayStr;
      setStartDate(start);
      setIsRange(false);
      setEndDate(start);
      setMemo('');
      setCreatorName(activeMember?.name || (familyMembers[0]?.name ?? '가족'));
      setCalendarType('solar');
      setRecurrence('yearly'); // 생일 기본 추천: 매년 반복

      const lun = getLunarDate(new Date(start + 'T00:00:00'));
      setLunarMonth(lun.lunarMonth);
      setLunarDay(lun.lunarDay);
      setIsLeapMonth(lun.isLeapMonth);
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
      endDate: isRange && recurrence === 'none' ? endDate : undefined,
      memo: memo.trim() || undefined,
      createdByName: creatorName.trim() || undefined,
      calendarType,
      lunarMonth: calendarType === 'lunar' ? lunarMonth : undefined,
      lunarDay: calendarType === 'lunar' ? lunarDay : undefined,
      isLeapMonth: calendarType === 'lunar' ? isLeapMonth : undefined,
      recurrence,
    });
    onClose();
  };

  // 현재 날짜의 음력 정보
  const currentLunar = (() => {
    try {
      return getLunarDate(new Date(startDate + 'T00:00:00'));
    } catch {
      return null;
    }
  })();

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
        {/* 1. 일정 종류 선택 */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">일정 종류</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setType(t.type);
                  if (t.type === 'trip') {
                    setIsRange(true);
                    setRecurrence('none');
                  } else if (t.type === 'birthday' || t.type === 'anniversary') {
                    setIsRange(false);
                    setRecurrence('yearly');
                  }
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

        {/* 2. 일정 제목 */}
        <Field label="일정 제목">
          <input
            type="text"
            className="input-note"
            placeholder={
              type === 'birthday'
                ? '예: 엄마 생신 🎂'
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

        {/* 3. 양력 / 음력 선택 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-ink-soft">달력 기준</label>
            {currentLunar && (
              <span className="text-[11px] text-ink-soft">
                기준일 음력: {currentLunar.isLeapMonth ? '윤' : ''}{currentLunar.lunarMonth}월 {currentLunar.lunarDay}일
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCalendarType('solar')}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-2.5 text-xs font-bold transition-all ${
                calendarType === 'solar'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                  : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
              }`}
            >
              <Sun size={15} className="text-amber-500" />
              <span>양력 (일반 달력)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarType('lunar');
                if (currentLunar) {
                  setLunarMonth(currentLunar.lunarMonth);
                  setLunarDay(currentLunar.lunarDay);
                  setIsLeapMonth(currentLunar.isLeapMonth);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-2.5 text-xs font-bold transition-all ${
                calendarType === 'lunar'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
              }`}
            >
              <Moon size={15} className="text-indigo-600" />
              <span>음력 (음력 생일/제사 등)</span>
            </button>
          </div>

          {calendarType === 'lunar' && (
            <div className="mt-2.5 rounded-2xl bg-indigo-50/70 p-3 ring-1 ring-indigo-100 text-xs space-y-2">
              <p className="font-bold text-indigo-900 flex items-center gap-1">
                🌙 음력 날짜 설정
              </p>
              <div className="flex items-center gap-2">
                <span className="text-ink-soft">음력</span>
                <select
                  value={lunarMonth}
                  onChange={(e) => setLunarMonth(parseInt(e.target.value, 10))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
                <select
                  value={lunarDay}
                  onChange={(e) => setLunarDay(parseInt(e.target.value, 10))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[11px] text-ink-soft cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={isLeapMonth}
                    onChange={(e) => setIsLeapMonth(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>윤달</span>
                </label>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                💡 음력 반복 일정을 선택하시면 매년 해당 음력일에 맞춰 양력 달력에 자동으로 일정이 배치됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 4. 반복 설정 */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink-soft">
            <Repeat size={13} className="text-accent" />
            <span>반복 일정 설정</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setRecurrence(opt.type);
                  if (opt.type !== 'none') setIsRange(false);
                }}
                className={`flex flex-col items-start p-2.5 rounded-2xl border-2 text-left transition-all ${
                  recurrence === opt.type
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
                }`}
              >
                <span className={`text-xs font-bold ${recurrence === opt.type ? 'text-accent' : 'text-ink'}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-ink-soft mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. 날짜 선택 (기준 시작일) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-ink-soft">
              {recurrence !== 'none' ? '기준 시작 날짜' : '날짜 설정'}
            </label>
            {recurrence === 'none' && (
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
            )}
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

            {isRange && recurrence === 'none' && (
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

        {/* 6. 등록자 선택 / 입력 */}
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

        {/* 7. 메모 */}
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
