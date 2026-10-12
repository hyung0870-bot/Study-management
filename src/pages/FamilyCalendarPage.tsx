import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import CalendarEventModal from '../components/calendar/CalendarEventModal';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { toDateKey, formatKoreanDate, uid } from '../lib/date';
import type { CalendarEvent, CalendarEventType, DateKey } from '../types';

const HEAD = ['월', '화', '수', '목', '금', '토', '일'];

const TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; icon: string; tagBg: string; text: string; dot: string }
> = {
  birthday: {
    label: '생일',
    icon: '🎂',
    tagBg: 'bg-rose-50 text-rose-700 ring-rose-200/60',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  trip: {
    label: '여행일정',
    icon: '✈️',
    tagBg: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    text: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  anniversary: {
    label: '기념일',
    icon: '🎉',
    tagBg: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  other: {
    label: '기타',
    icon: '📌',
    tagBg: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
};

export default function FamilyCalendarPage() {
  const { data, update } = useStore();
  const { activeMember } = useParentAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [cursor, setCursor] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | 'all'>('all');

  const events = data.calendarEvents ?? [];
  const members = data.familyMembers ?? [];

  // 날짜 그리드 계산
  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // 월요일 시작 (0 = 월)
    const days = new Date(y, m + 1, 0).getDate();
    const arr: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(y, m, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  const selKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());

  const moveMonth = (n: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };

  // 특정 날짜에 걸쳐 있는 이벤트들 찾기
  const getEventsForDate = (dateKey: DateKey) => {
    return events.filter((ev) => {
      if (ev.endDate) {
        return dateKey >= ev.startDate && dateKey <= ev.endDate;
      }
      return ev.startDate === dateKey;
    });
  };

  // 선택된 날짜의 이벤트 목록
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selKey).filter((ev) =>
      typeFilter === 'all' ? true : ev.type === typeFilter,
    );
  }, [events, selKey, typeFilter]);

  // 이번 달 전체 다가오는 이벤트들
  const upcomingMonthEvents = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const startStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return events
      .filter((ev) => {
        const evEnd = ev.endDate || ev.startDate;
        const matchesMonth = evEnd >= startStr && ev.startDate <= endStr;
        const matchesFilter = typeFilter === 'all' ? true : ev.type === typeFilter;
        return matchesMonth && matchesFilter;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, cursor, typeFilter]);

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setModalOpen(true);
  };

  const handleSaveEvent = (saved: {
    id?: string;
    title: string;
    type: CalendarEventType;
    startDate: DateKey;
    endDate?: DateKey;
    memo?: string;
    createdByName?: string;
  }) => {
    update((prev) => {
      const prevEvents = prev.calendarEvents ?? [];
      let nextEvents: CalendarEvent[];
      if (saved.id) {
        // 수정
        nextEvents = prevEvents.map((ev) =>
          ev.id === saved.id
            ? {
                ...ev,
                title: saved.title,
                type: saved.type,
                startDate: saved.startDate,
                endDate: saved.endDate,
                memo: saved.memo,
                createdByName: saved.createdByName || ev.createdByName,
              }
            : ev,
        );
      } else {
        // 신규 등록
        const newEv: CalendarEvent = {
          id: 'ev-' + uid(),
          title: saved.title,
          type: saved.type,
          startDate: saved.startDate,
          endDate: saved.endDate,
          memo: saved.memo,
          createdById: activeMember?.id,
          createdByName: saved.createdByName || activeMember?.name || '가족',
          createdAt: new Date().toISOString(),
        };
        nextEvents = [...prevEvents, newEv];
      }
      return { ...prev, calendarEvents: nextEvents };
    });
  };

  const handleDeleteEvent = (id: string) => {
    update((prev) => ({
      ...prev,
      calendarEvents: (prev.calendarEvents ?? []).filter((e) => e.id !== id),
    }));
  };

  return (
    <>
      <PageHeader
        title="가족 달력"
        subtitle="생일, 여행, 기념일 등 온 가족 일정을 함께 기록해요"
        right={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-95 transition-all"
          >
            <Plus size={15} />
            <span>일정 추가</span>
          </button>
        }
      />

      {/* 일정 종류 필터 칩 */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
            typeFilter === 'all'
              ? 'bg-ink text-white shadow-xs'
              : 'bg-white text-ink-soft hover:bg-slate-100 ring-1 ring-slate-200'
          }`}
        >
          전체 보기
        </button>
        {(['birthday', 'trip', 'anniversary', 'other'] as CalendarEventType[]).map((t) => {
          const cfg = TYPE_CONFIG[t];
          const isActive = typeFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-ink text-white shadow-xs'
                  : 'bg-white text-ink-soft hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* 월간 달력 카드 */}
      <div className="paper-card p-4 mb-4">
        {/* 달력 헤더 월 이동 */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="이전 달"
            className="rounded-full p-1.5 text-ink-soft hover:bg-slate-100 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-hand text-2xl font-bold">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </span>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="다음 달"
            className="rounded-full p-1.5 text-ink-soft hover:bg-slate-100 active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {HEAD.map((h, i) => (
            <span
              key={h}
              className={`pb-1 text-[11px] font-bold ${
                i === 6 ? 'text-rose-400' : i === 5 ? 'text-sky-500' : 'text-ink-soft'
              }`}
            >
              {h}
            </span>
          ))}

          {/* 일별 날짜 셀 */}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const key = toDateKey(d);
            const isToday = key === todayKey;
            const isSel = key === selKey;
            const dayEvents = getEventsForDate(key);


            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`relative flex min-h-[50px] aspect-square flex-col items-center justify-between p-1 rounded-xl text-xs transition-all ${
                  isSel
                    ? 'bg-ink font-bold text-white shadow-xs'
                    : isToday
                      ? 'ring-2 ring-accent/60 font-bold bg-accent/5 text-ink'
                      : 'hover:bg-slate-50 text-ink'
                }`}
              >
                <span className="text-xs">{d.getDate()}</span>

                {/* 일정 도트 또는 미니 배지 */}
                <div className="flex w-full flex-wrap justify-center gap-0.5 my-auto max-h-4 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.other;
                    return (
                      <span
                        key={ev.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSel ? 'bg-white' : cfg.dot
                        }`}
                        title={ev.title}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className={`text-[8px] leading-none ${isSel ? 'text-white' : 'text-ink-soft'}`}>
                      +
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-ink-soft border-t border-slate-100 pt-2.5">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> 생일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> 여행
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> 기념일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> 기타
          </span>
        </div>
      </div>

      {/* 선택된 날짜 상세 일정 */}
      <div className="paper-card p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-accent" />
            <span className="font-hand text-xl font-bold text-ink">
              {formatKoreanDate(selectedDate)}
            </span>
            {selKey === todayKey && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                오늘
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
          >
            <Plus size={14} />
            <span>이 날에 일정 추가</span>
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="py-6 text-center text-ink-soft">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-xs">등록된 가족 일정이 없어요</p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-2 text-xs font-bold text-accent underline underline-offset-2"
            >
              새 일정 등록하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDateEvents.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.other;
              return (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEdit(ev)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-ink">{ev.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${cfg.tagBg}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-soft">
                        {ev.endDate && ev.endDate !== ev.startDate ? (
                          <span>
                            {ev.startDate} ~ {ev.endDate}
                          </span>
                        ) : (
                          <span>{ev.startDate}</span>
                        )}
                        {ev.createdByName && (
                          <span>• 등록: {ev.createdByName}</span>
                        )}
                      </div>
                      {ev.memo && (
                        <p className="text-xs text-ink-soft mt-1 bg-slate-50 px-2 py-1 rounded-lg">
                          {ev.memo}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-ink-soft group-hover:text-ink shrink-0 ml-2">
                    수정
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 이번 달 전체 일정 리스트 */}
      <div className="paper-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-hand text-xl font-bold text-ink flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" />
            <span>{cursor.getMonth() + 1}월의 모든 가족 일정</span>
          </span>
          <span className="text-xs font-bold text-ink-soft">
            총 {upcomingMonthEvents.length}건
          </span>
        </div>

        {upcomingMonthEvents.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-soft">
            이번 달에 등록된 일정이 아직 없어요
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingMonthEvents.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.other;
              return (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEdit(ev)}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-ink truncate">{ev.title}</span>
                        <span className={`text-[10px] font-bold ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        {ev.startDate}
                        {ev.endDate && ev.endDate !== ev.startDate && ` ~ ${ev.endDate}`}
                        {ev.createdByName && ` (${ev.createdByName})`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-ink-soft shrink-0">자세히</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 일정 추가/수정 모달 */}
      <CalendarEventModal
        open={modalOpen}
        selectedDateKey={selKey}
        initialEvent={editingEvent}
        familyMembers={members}
        activeMember={activeMember}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
