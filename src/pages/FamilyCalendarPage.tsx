import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
  Repeat,
  Moon,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import CalendarEventModal from '../components/calendar/CalendarEventModal';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { toDateKey, formatKoreanDate, uid } from '../lib/date';
import { isEventOccurringOnDate } from '../lib/lunar';

import type {
  CalendarDateType,
  CalendarEvent,
  CalendarEventType,
  DateKey,
  RecurrenceType,
} from '../types';

const HEAD = ['월', '화', '수', '목', '금', '토', '일'];

const TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; icon: string; tagBg: string; text: string; dot: string; barBg: string }
> = {
  birthday: {
    label: '생일',
    icon: '🎂',
    tagBg: 'bg-rose-50 text-rose-700 ring-rose-200/60',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    barBg: 'bg-rose-500 text-white',
  },
  trip: {
    label: '여행일정',
    icon: '✈️',
    tagBg: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    text: 'text-sky-600',
    dot: 'bg-sky-500',
    barBg: 'bg-sky-500 text-white',
  },
  anniversary: {
    label: '기념일',
    icon: '🎉',
    tagBg: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    barBg: 'bg-amber-500 text-white',
  },
  other: {
    label: '기타',
    icon: '📌',
    tagBg: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
    barBg: 'bg-indigo-500 text-white',
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

  // 주(Week) 단위 행 및 연속 이벤트 바(Segment) 계산
  const weekRows = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // 월요일 시작 (0 = 월)
    const days = new Date(y, m + 1, 0).getDate();
    const allDays: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) allDays.push(new Date(y, m, d));
    while (allDays.length % 7) allDays.push(null);

    const rows: {
      days: (Date | null)[];
      segments: {
        event: CalendarEvent;
        colStart: number; // 0 ~ 6
        span: number; // 1 ~ 7
        isStartEdge: boolean;
        isEndEdge: boolean;
      }[];
    }[] = [];

    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7);
      const weekSegments: {
        event: CalendarEvent;
        colStart: number;
        span: number;
        isStartEdge: boolean;
        isEndEdge: boolean;
      }[] = [];

      // 이번 주에 일치하는 활성 이벤트 필터링
      const activeEvents = events.filter((ev) =>
        typeFilter === 'all' ? true : ev.type === typeFilter,
      );

      for (const ev of activeEvents) {
        let colStart = -1;
        let colEnd = -1;

        for (let col = 0; col < 7; col++) {
          const d = weekDays[col];
          if (!d) continue;
          const k = toDateKey(d);
          if (isEventOccurringOnDate(ev, k)) {
            if (colStart === -1) colStart = col;
            colEnd = col;
          }
        }

        if (colStart !== -1 && colEnd !== -1) {
          const startDay = weekDays[colStart];
          const endDay = weekDays[colEnd];
          const startKey = startDay ? toDateKey(startDay) : '';
          const endKey = endDay ? toDateKey(endDay) : '';

          const isStartEdge = !ev.startDate || startKey === ev.startDate;
          const isEndEdge = !ev.endDate || endKey === ev.endDate;

          weekSegments.push({
            event: ev,
            colStart,
            span: colEnd - colStart + 1,
            isStartEdge,
            isEndEdge,
          });
        }
      }

      // 이벤트 시작일 및 기간순 정렬
      weekSegments.sort((a, b) => {
        if (a.colStart !== b.colStart) return a.colStart - b.colStart;
        return b.span - a.span;
      });

      rows.push({
        days: weekDays,
        segments: weekSegments,
      });
    }

    return rows;
  }, [cursor, events, typeFilter]);

  const selKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());

  const moveMonth = (n: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };

  // 특정 날짜에 발생하는 이벤트들 찾기 (반복 및 음력 지원)
  const getEventsForDate = (dateKey: DateKey) => {
    return events.filter((ev) => isEventOccurringOnDate(ev, dateKey));
  };

  // 선택된 날짜의 이벤트 목록
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selKey).filter((ev) =>
      typeFilter === 'all' ? true : ev.type === typeFilter,
    );
  }, [events, selKey, typeFilter]);

  // 이번 달 전체 다가오는 이벤트들 (날짜별 발생 여부 수집)
  const upcomingMonthEvents = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const list: { event: CalendarEvent; occurrenceDateKey: DateKey }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvs = events.filter((ev) => {
        const matchesFilter = typeFilter === 'all' ? true : ev.type === typeFilter;
        return matchesFilter && isEventOccurringOnDate(ev, dateKey);
      });
      dayEvs.forEach((ev) => {
        list.push({ event: ev, occurrenceDateKey: dateKey });
      });
    }

    return list.sort((a, b) => a.occurrenceDateKey.localeCompare(b.occurrenceDateKey));
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
    calendarType?: CalendarDateType;
    lunarMonth?: number;
    lunarDay?: number;
    isLeapMonth?: boolean;
    recurrence?: RecurrenceType;
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
                calendarType: saved.calendarType,
                lunarMonth: saved.lunarMonth,
                lunarDay: saved.lunarDay,
                isLeapMonth: saved.isLeapMonth,
                recurrence: saved.recurrence,
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
          calendarType: saved.calendarType,
          lunarMonth: saved.lunarMonth,
          lunarDay: saved.lunarDay,
          isLeapMonth: saved.isLeapMonth,
          recurrence: saved.recurrence,
        };
        nextEvents = [...prevEvents, newEv];
      }
      return { ...prev, calendarEvents: nextEvents };
    }, editingEvent ? `가족 일정 [${saved.title}]을 수정했습니다. 📅` : `새로운 가족 일정 [${saved.title}]을 등록했습니다! 📅`);
  };

  const handleDeleteEvent = (id: string) => {
    const target = (data.calendarEvents ?? []).find((e) => e.id === id);
    const title = target?.title || '일정';
    update(
      (prev) => ({
        ...prev,
        calendarEvents: (prev.calendarEvents ?? []).filter((e) => e.id !== id),
      }),
      `가족 일정 [${title}]을 삭제했습니다.`,
    );
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
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
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
        </div>

        {/* 주(Week)별 행 및 가로 막대(Bar) 일정 표시 */}
        <div className="space-y-1.5">
          {weekRows.map((week, weekIdx) => {
            const visibleSegments = week.segments.slice(0, 3);
            const hiddenCount = week.segments.length - visibleSegments.length;

            return (
              <div
                key={weekIdx}
                className="rounded-xl border border-slate-100 bg-slate-50/40 p-1 transition hover:bg-slate-50/70"
              >
                {/* 1. 날짜 번호 행 */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {week.days.map((d, colIdx) => {
                    if (!d) return <div key={colIdx} className="h-6" />;
                    const key = toDateKey(d);
                    const isToday = key === todayKey;
                    const isSel = key === selKey;

                    return (
                      <button
                        key={colIdx}
                        type="button"
                        onClick={() => setSelectedDate(d)}
                        className={`flex h-6 items-center justify-center rounded-lg text-xs transition-all ${
                          isSel
                            ? 'bg-ink font-bold text-white shadow-xs'
                            : isToday
                            ? 'bg-accent/15 font-bold text-accent ring-1 ring-accent'
                            : 'text-ink hover:bg-white'
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* 2. 가로 Bar 일정 목록 (최대 3줄) */}
                <div className="space-y-1 min-h-[22px]">
                  {visibleSegments.map((seg) => {
                    const cfg = TYPE_CONFIG[seg.event.type] || TYPE_CONFIG.other;
                    const isSingleDay = seg.span === 1;

                    return (
                      <div
                        key={seg.event.id + '-' + seg.colStart}
                        className="grid grid-cols-7 gap-1"
                      >
                        <div
                          style={{
                            gridColumnStart: seg.colStart + 1,
                            gridColumnEnd: `span ${seg.span}`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(seg.event);
                            }}
                            title={`${seg.event.title} (${cfg.label})`}
                            className={`flex w-full items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold transition hover:opacity-90 active:scale-[0.99] text-left truncate shadow-2xs ${cfg.barBg} ${
                              isSingleDay
                                ? 'rounded-md'
                                : `${seg.isStartEdge ? 'rounded-l-md' : 'rounded-l-xs'} ${
                                    seg.isEndEdge ? 'rounded-r-md' : 'rounded-r-xs'
                                  }`
                            }`}
                          >
                            <span className="shrink-0 text-[10px] leading-none">{cfg.icon}</span>
                            <span className="truncate">{seg.event.title}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {hiddenCount > 0 && (
                    <div className="text-right px-1">
                      <span className="text-[10px] font-bold text-ink-muted">
                        +{hiddenCount}개 일정 더보기
                      </span>
                    </div>
                  )}

                  {week.segments.length === 0 && (
                    <div className="h-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-ink-soft border-t border-slate-100 pt-2.5">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-5 rounded-xs bg-rose-500" /> 생일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-5 rounded-xs bg-sky-500" /> 여행
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-5 rounded-xs bg-amber-500" /> 기념일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-5 rounded-xs bg-indigo-500" /> 기타
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
                        {ev.calendarType === 'lunar' && (
                          <span className="flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 ring-1 ring-indigo-200/60">
                            <Moon size={10} />
                            <span>음력 {ev.isLeapMonth ? '윤' : ''}{ev.lunarMonth}월 {ev.lunarDay}일</span>
                          </span>
                        )}
                        {ev.recurrence && ev.recurrence !== 'none' && (
                          <span className="flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold text-accent ring-1 ring-accent/30">
                            <Repeat size={10} />
                            <span>
                              {ev.recurrence === 'weekly'
                                ? '매주 반복'
                                : ev.recurrence === 'monthly'
                                  ? '매달 반복'
                                  : '매년 반복'}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-soft">
                        {ev.endDate && ev.endDate !== ev.startDate ? (
                          <span>
                            {ev.startDate} ~ {ev.endDate}
                          </span>
                        ) : (
                          <span>{selKey}</span>
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
            {upcomingMonthEvents.map(({ event: ev, occurrenceDateKey }) => {
              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.other;
              return (
                <div
                  key={`${ev.id}-${occurrenceDateKey}`}
                  onClick={() => handleOpenEdit(ev)}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-ink truncate">{ev.title}</span>
                        <span className={`text-[10px] font-bold ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {ev.calendarType === 'lunar' && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            음력 {ev.isLeapMonth ? '윤' : ''}{ev.lunarMonth}/{ev.lunarDay}
                          </span>
                        )}
                        {ev.recurrence && ev.recurrence !== 'none' && (
                          <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                            {ev.recurrence === 'yearly'
                              ? '매년'
                              : ev.recurrence === 'monthly'
                                ? '매달'
                                : '매주'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        {occurrenceDateKey}
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
