import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronDown, PartyPopper, NotebookPen, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MonthCalendar from '../components/calendar/MonthCalendar';
import SpecialMissionModal from '../components/parent/SpecialMissionModal';
import PinGateModal from '../components/parent/PinGateModal';
import DayMessageCard from '../components/today/DayMessageCard';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { formatKoreanDate, toDateKey, uid } from '../lib/date';
import { progressOf, recordFor, statusOf } from '../lib/records';
import { SUBJECT_PALETTE, tint } from '../lib/colors';
import { durationMin, formatDuration, formatTime } from '../lib/time';
import { isEventOccurringOnDate } from '../lib/lunar';
import type { DailyRecordItem } from '../types';


/** [C] 매일의 학업 체크리스트 (메인) */
export default function TodayPage() {
  const { data, update, selectedChildId } = useStore();
  const { activeMember, unlocked } = useParentAuth();
  const isChildMode = activeMember?.role === 'child';
  const currentChild = (data.familyMembers ?? []).find(
    (m) => m.id === (selectedChildId || (data.familyMembers ?? []).find((c) => c.role === 'child')?.id),
  );
  const [selected, setSelected] = useState(() => new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [editingSpecialItem, setEditingSpecialItem] = useState<DailyRecordItem | null>(null);

  // 특별 미션 클릭 시 수정 모달 열기
  const handleItemClick = (it: DailyRecordItem) => {
    if (it.isSpecial) {
      if (!unlocked) {
        setPinOpen(true);
        return;
      }
      setEditingSpecialItem(it);
      setSpecialModalOpen(true);
    }
  };

  const handleOpenNewSpecialMission = () => {
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    setEditingSpecialItem(null);
    setSpecialModalOpen(true);
  };

  const today = new Date();
  const todayKey = toDateKey(today);
  const selKey = toDateKey(selected);
  const status = statusOf(selKey);
  const record = recordFor(data, selected);
  const { done, total, pct } = progressOf(record);


  const toggle = (planId: string) => {
    if (status !== 'today' || !isChildMode) return;
    const currentRec = recordFor(data, today);
    const targetItem = currentRec?.items.find((i) => i.planId === planId);
    const isFinishing = targetItem ? !targetItem.done : true;
    const subName = targetItem?.subjectName || '학습';
    const summary = isFinishing ? `[${subName}] 완료했습니다! 🎉` : `[${subName}] 체크를 취소했습니다.`;

    update((prev) => {
      const rec = recordFor(prev, today)!;
      const items = rec.items.map((i) =>
        i.planId === planId ? { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : undefined } : i,
      );
      return {
        ...prev,
        records: {
          ...prev.records,
          [todayKey]: {
            ...rec,
            date: todayKey,
            items,
          },
        },
      };
    }, summary);
  };

  const handleSaveChildMessage = (msg: string) => {
    update((prev) => {
      const current = prev.records[selKey] ?? recordFor(prev, selected) ?? { date: selKey, items: [] };
      return {
        ...prev,
        records: {
          ...prev.records,
          [selKey]: {
            ...current,
            childMessage: msg,
          },
        },
      };
    }, '아이의 일기/기록을 남겼습니다. 📝');
  };

  const handleSaveParentMessage = (msg: string) => {
    update((prev) => {
      const current = prev.records[selKey] ?? recordFor(prev, selected) ?? { date: selKey, items: [] };
      return {
        ...prev,
        records: {
          ...prev.records,
          [selKey]: {
            ...current,
            parentMessage: msg,
          },
        },
      };
    }, '부모님의 응원 한마디가 도착했습니다! 💌');
  };

  const saveSpecialMission = ({
    planId,
    activityName,
    category,
    start,
    end,
    amount,
  }: {
    planId?: string;
    activityName: string;
    category: string;
    start: string;
    end: string;
    amount?: string;
  }) => {
    update((prev) => {
      // 1. 해당 활동이 과목 관리에 있는지 확인, 없으면 과목 관리에 추가(특별 미션 플래그)
      let subject = prev.subjects.find((s) => s.name.trim() === activityName.trim());
      const nextSubjects = [...prev.subjects];
      if (!subject) {
        const color = SUBJECT_PALETTE[prev.subjects.length % SUBJECT_PALETTE.length];
        subject = {
          id: uid(),
          name: activityName,
          category,
          color,
          isSpecial: true,
        };
        nextSubjects.push(subject);
      }

      // 2. 현재 선택된 날짜의 레코드에서 수정 또는 추가
      const targetDateKey = selKey;
      const currentRec = prev.records[targetDateKey] ?? recordFor(prev, selected) ?? { date: targetDateKey, items: [] };

      let nextItems = [...currentRec.items];
      if (planId) {
        // 기존 수정
        nextItems = nextItems.map((item) =>
          item.planId === planId
            ? {
                ...item,
                subjectId: subject!.id,
                subjectName: subject!.name,
                category: subject!.category || category,
                color: subject!.color,
                amount: amount || '특별 미션',
                start,
                end,
                minutes: durationMin(start, end),
              }
            : item,
        );
      } else {
        // 신규 추가
        const newItem = {
          planId: uid(),
          subjectId: subject.id,
          subjectName: subject.name,
          category: subject.category || category,
          color: subject.color,
          amount: amount || '특별 미션',
          start,
          end,
          minutes: durationMin(start, end),
          done: false,
          isSpecial: true,
        };
        nextItems.push(newItem);
      }

      return {
        ...prev,
        subjects: nextSubjects,
        records: {
          ...prev.records,
          [targetDateKey]: {
            ...currentRec,
            date: targetDateKey,
            items: nextItems,
          },
        },
      };
    });
  };

  const deleteSpecialMission = (planId: string) => {
    update((prev) => {
      const targetDateKey = selKey;
      const currentRec = prev.records[targetDateKey] ?? recordFor(prev, selected);
      if (!currentRec) return prev;

      return {
        ...prev,
        records: {
          ...prev.records,
          [targetDateKey]: {
            ...currentRec,
            items: currentRec.items.filter((it) => it.planId !== planId),
          },
        },
      };
    });
  };

  const title = status === 'today' ? '오늘 할 일' : status === 'past' ? '지난 기록' : '미리 보기';
  const message =
    total === 0 ? '' : pct === 100 ? '모두 끝냈어요! 정말 멋져요 🎉' : pct >= 50 ? '절반 넘었어요, 조금만 더! 💪' : '하나씩 차근차근 해 봐요 ✏️';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={formatKoreanDate(selected)}
        right={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenNewSpecialMission}
              className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all"
            >
              <Sparkles size={14} /> 특별 미션
            </button>
            <button
              type="button"
              onClick={() => setCalOpen((o) => !o)}
              className={`btn-ghost !px-3 !py-2 !text-xs ${calOpen ? '!bg-ink !text-white' : ''}`}
            >
              <CalendarDays size={16} /> 달력
              <ChevronDown size={14} className={`transition-transform ${calOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        }
      />

      {calOpen && (
        <div className="animate-pop mb-4">
          <MonthCalendar
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
            }}
          />
          {selKey !== todayKey && (
            <button type="button" onClick={() => setSelected(new Date())} className="mt-2 w-full text-center text-xs font-bold text-accent">
              오늘로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* 가족 달력 오늘/선택일정 배너 */}
      {(() => {
        const dayEvents = (data.calendarEvents ?? []).filter((ev) =>
          isEventOccurringOnDate(ev, selKey),
        );
        if (dayEvents.length === 0) return null;


        return (
          <div className="paper-card mb-4 p-3 bg-gradient-to-r from-amber-50/80 to-rose-50/80 border border-amber-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <span>🎉</span>
                <span>가족 달력 특별 일정 ({dayEvents.length}건)</span>
              </span>
              <Link to="/family-calendar" className="text-[11px] font-bold text-accent hover:underline">
                가족 달력 보기 →
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dayEvents.map((ev) => {
                const icon =
                  ev.type === 'birthday' ? '🎂' : ev.type === 'trip' ? '✈️' : ev.type === 'anniversary' ? '🎉' : '📌';
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-1.5 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-bold shadow-2xs text-ink"
                  >
                    <span>{icon}</span>
                    <span>{ev.title}</span>
                    {ev.createdByName && (
                      <span className="text-[10px] text-ink-soft">({ev.createdByName})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 진행률 */}
      <div className="paper-card mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-hand text-xl font-bold">{status === 'future' ? '예정된 공부' : '달성도'}</span>
          <span className="font-hand text-3xl font-bold text-accent">
            {status === 'future' ? `${total}개` : `${pct}%`}
          </span>
        </div>
        {status !== 'future' && (
          <>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {total ? `${total}개 중 ${done}개 완료 · ${message}` : ''}
            </p>
          </>
        )}
      </div>

      {/* 오늘의 대화 우체통 (아이 <-> 부모 메시지) */}
      <DayMessageCard
        dateLabel={formatKoreanDate(selected)}
        isToday={status === 'today'}
        unlocked={unlocked}
        childName={currentChild?.name}
        childMessage={record?.childMessage}
        parentMessage={record?.parentMessage}
        onSaveChildMessage={handleSaveChildMessage}
        onSaveParentMessage={handleSaveParentMessage}
        onRequestParentAuth={() => setPinOpen(true)}
      />

      {/* 체크리스트 */}
      {!record || total === 0 ? (
        <div className="paper-card flex flex-col items-center gap-2 py-10 text-center text-ink-soft">
          <NotebookPen size={30} />
          <p className="font-hand text-xl">
            {status === 'past' ? '이 날은 기록이 없어요' : '공부 계획이 없어요'}
          </p>
          {status !== 'past' && (
            <Link to="/planner" className="text-xs font-bold text-accent">
              주간 계획 세우러 가기 →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {record.items.map((it, i) => {
            const checkable = status === 'today' && isChildMode;
            const isSpecialEditable = it.isSpecial;
            return (
              <li key={it.planId} className="animate-pop" style={{ animationDelay: `${i * 30}ms` }}>
                <div
                  className={`paper-card flex w-full items-center gap-3 overflow-hidden p-0 text-left transition-all ${
                    it.done ? 'opacity-70' : ''
                  }`}
                >
                  <span className="w-1.5 self-stretch" style={{ backgroundColor: it.color }} />
                  
                  {/* 항목 내용 영역: 특별 미션인 경우 클릭 시 수정 팝업 오픈 */}
                  <div
                    onClick={() => isSpecialEditable && handleItemClick(it)}
                    className={`min-w-0 flex-1 py-3 select-none ${
                      isSpecialEditable ? 'cursor-pointer hover:opacity-85 active:scale-[0.995]' : ''
                    }`}
                    title={isSpecialEditable ? '클릭하여 특별 미션 수정' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 font-hand text-xl font-bold leading-7 ${it.done ? 'strike-hand' : ''}`}
                        style={{ backgroundColor: tint(it.color, 0.14), color: it.done ? undefined : it.color }}
                      >
                        {it.subjectName}
                      </span>
                      {it.category && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-ink-soft">
                          {it.category}
                        </span>
                      )}
                      {it.isSpecial && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 hover:underline">
                          ⭐ 특별 미션 (수정가능)
                        </span>
                      )}
                      <span className={`truncate text-sm ${it.done ? 'strike-hand' : ''}`}>{it.amount}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatTime(it.start)} ~ {formatTime(it.end)} · {formatDuration(it.minutes)}
                    </p>
                  </div>

                  {/* 체크박스 버튼: 아이 모드에서만 쓰기 활성화, 부모 모드는 읽기 전용 */}
                  <button
                    type="button"
                    disabled={!checkable}
                    onClick={() => checkable && toggle(it.planId)}
                    aria-label={it.done ? `${it.subjectName} 완료` : `${it.subjectName} 미완료`}
                    title={!isChildMode ? '체크박스는 아이 모드에서만 체크할 수 있어요' : (it.done ? '완료 취소' : '완료 체크')}
                    className={`mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      it.done
                        ? 'border-emerald-400 bg-emerald-400 text-white'
                        : 'border-slate-300 bg-white'
                    } ${checkable ? 'cursor-pointer hover:border-slate-400 active:scale-95' : 'cursor-default opacity-80'}`}
                  >
                    {it.done && <Check size={20} strokeWidth={3} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {status === 'today' && total > 0 && pct === 100 && (
        <div className="animate-pop mt-4 flex items-center justify-center gap-2 font-hand text-2xl font-bold text-emerald-500">
          <PartyPopper /> 오늘 공부 끝!
        </div>
      )}
      {status === 'today' && !isChildMode && total > 0 && (
        <p className="mt-4 text-center text-xs text-ink-soft bg-amber-50/60 rounded-xl py-2 px-3 border border-amber-200/50">
          ℹ️ 체크박스 쓰기(완료 체크)는 <strong>아이 모드</strong>에서만 가능합니다. (부모 모드는 확인 전용)
        </p>
      )}
      {status !== 'today' && total > 0 && (
        <p className="mt-4 text-center text-xs text-ink-soft">
          {status === 'past' ? '지난 기록은 볼 수만 있어요' : '체크는 그날이 되면 할 수 있어요'}
        </p>
      )}

      {/* 특별 미션 등록 및 수정 모달 */}
      <SpecialMissionModal
        key={editingSpecialItem?.planId ?? 'new'}
        open={specialModalOpen}
        initialItem={editingSpecialItem}
        existingSubjects={data.subjects}
        onSave={saveSpecialMission}
        onDelete={deleteSpecialMission}
        onClose={() => {
          setSpecialModalOpen(false);
          setEditingSpecialItem(null);
        }}
      />

      {/* 학부모 PIN 모달 */}
      <PinGateModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}
