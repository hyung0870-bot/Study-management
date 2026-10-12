import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Pencil, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import CircularTimetable from '../components/timetable/CircularTimetable';
import ScheduleDetailModal, { type PlanEditAction } from '../components/timetable/ScheduleDetailModal';
import PinGateModal from '../components/parent/PinGateModal';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { getDateOfWeekday, WEEKDAYS, formatKoreanDate, toDateKey, uid, weekdayKeyOf } from '../lib/date';
import { buildBlocks, byStart, KIND_LABEL, type Block, type BlockKind } from '../lib/schedule';
import { recordFor } from '../lib/records';
import { FIXED_COLORS, SUBJECT_PALETTE, tint } from '../lib/colors';
import { DAY_MIN, durationMin, formatDuration, formatTime, toSegments } from '../lib/time';
import type { WeekdayKey } from '../types';

/** [D] 24시간 원형 시간표 */
export default function TimetablePage() {
  const { data, update, updateDay } = useStore();
  const { unlocked } = useParentAuth();
  const todayKey = weekdayKeyOf(new Date());
  const [dayKey, setDayKey] = useState<WeekdayKey>(todayKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 상세 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTargetBlock, setModalTargetBlock] = useState<Block | null>(null);
  const [emptySlot, setEmptySlot] = useState<{ start: string; end: string } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  // 현재 선택된 요일의 실제 날짜 및 등록된 특별 미션 계산
  const targetDate = useMemo(() => getDateOfWeekday(dayKey), [dayKey]);
  const currentRecord = useMemo(() => recordFor(data, targetDate), [data, targetDate]);
  const specialItems = useMemo(
    () => currentRecord?.items.filter((it) => it.isSpecial) ?? [],
    [currentRecord],
  );

  const blocks = useMemo(
    () => buildBlocks(data.week[dayKey], data.subjects, specialItems),
    [data, dayKey, specialItems],
  );
  const list = [...blocks].sort(byStart);

  // 종류별 합계 (겹친 시간은 각각 계산)
  const sums = useMemo(() => {
    const m: Partial<Record<BlockKind, number>> = {};
    blocks.forEach((b) => (m[b.kind] = (m[b.kind] ?? 0) + durationMin(b.start, b.end)));
    return m;
  }, [blocks]);

  // 실제로 비어 있는 시간 (겹침 제외)
  const freeMin = useMemo(() => {
    const used = new Uint8Array(DAY_MIN);
    blocks.forEach((b) => toSegments(b).forEach(([s, e]) => used.fill(1, s, e)));
    return used.reduce((n, v) => n + (v ? 0 : 1), 0);
  }, [blocks]);

  const legend: { kind: BlockKind; color: string }[] = [
    { kind: 'study', color: '#5b8def' },
    { kind: 'school', color: FIXED_COLORS.school },
    { kind: 'academy', color: FIXED_COLORS.academy },
    { kind: 'etc', color: FIXED_COLORS.etc },
    { kind: 'sleep', color: FIXED_COLORS.sleep },
  ];

  const isToday = dayKey === todayKey;

  // 블록 선택 시 상세 모달 오픈 (학부모 모드 시 편집 가능)
  const handleSelectBlock = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const b = blocks.find((x) => x.id === id);
    if (b) {
      if (!unlocked) {
        setPinOpen(true);
        return;
      }
      setModalTargetBlock(b);
      setEmptySlot(null);
      setModalOpen(true);
    }
  };

  // 빈칸 클릭 시 새 일정 추가 모달 오픈
  const handleEmptyClick = (time: { start: string; end: string }) => {
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    setModalTargetBlock(null);
    setEmptySlot(time);
    setModalOpen(true);
  };

  // 모달 작업 처리 (수정, 추가, 삭제)
  const handleAction = (action: PlanEditAction) => {
    if (!unlocked) return;

    if (action.type === 'save_study') {
      updateDay(dayKey, (prev) => {
        const nextStudies = action.id
          ? prev.studies.map((s) => (s.id === action.id ? { ...s, ...action } : s))
          : [...prev.studies, { id: uid(), ...action }];
        return { ...prev, studies: nextStudies };
      });
    } else if (action.type === 'save_range') {
      const field = action.kind === 'academy' ? 'academies' : 'etc';
      updateDay(dayKey, (prev) => {
        const items = prev[field];
        const nextItems = action.id
          ? items.map((x) => (x.id === action.id ? { ...x, name: action.name, start: action.start, end: action.end } : x))
          : [...items, { id: uid(), name: action.name, start: action.start, end: action.end }];
        return { ...prev, [field]: nextItems };
      });
    } else if (action.type === 'save_special') {
      // 특별 미션: 현재 선택된 요일(날짜)의 records에 등록 + 과목 관리에 특별 미션으로 추가
      update((prev) => {
        let subject = prev.subjects.find((s) => s.name.trim() === action.activityName.trim());
        const nextSubjects = [...prev.subjects];
        if (!subject) {
          subject = {
            id: uid(),
            name: action.activityName,
            category: action.category,
            color: SUBJECT_PALETTE[prev.subjects.length % SUBJECT_PALETTE.length],
            isSpecial: true,
          };
          nextSubjects.push(subject);
        }

        const targetDateKey = toDateKey(targetDate);
        const currentRec = prev.records[targetDateKey] ?? recordFor(prev, targetDate) ?? { date: targetDateKey, items: [] };

        let nextItems = [...currentRec.items];
        if (action.id) {
          // 기존 특별 미션 수정
          nextItems = nextItems.map((item) =>
            item.planId === action.id
              ? {
                  ...item,
                  subjectId: subject!.id,
                  subjectName: subject!.name,
                  category: subject!.category || action.category,
                  color: subject!.color,
                  amount: action.amount || '특별 미션',
                  start: action.start,
                  end: action.end,
                  minutes: durationMin(action.start, action.end),
                }
              : item,
          );
        } else {
          // 신규 추가
          const newItem = {
            planId: uid(),
            subjectId: subject.id,
            subjectName: subject.name,
            category: subject.category || action.category,
            color: subject.color,
            amount: action.amount || '특별 미션',
            start: action.start,
            end: action.end,
            minutes: durationMin(action.start, action.end),
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
    } else if (action.type === 'delete') {
      if (action.isSpecial) {
        // 특별 미션 삭제
        update((prev) => {
          const targetDateKey = toDateKey(targetDate);
          const currentRec = prev.records[targetDateKey] ?? recordFor(prev, targetDate);
          if (!currentRec) return prev;
          return {
            ...prev,
            records: {
              ...prev.records,
              [targetDateKey]: {
                ...currentRec,
                items: currentRec.items.filter((it) => it.planId !== action.id),
              },
            },
          };
        });
      } else {
        updateDay(dayKey, (prev) => {
          if (action.kind === 'study') {
            return { ...prev, studies: prev.studies.filter((s) => s.id !== action.id) };
          } else if (action.kind === 'academy') {
            return { ...prev, academies: prev.academies.filter((a) => a.id !== action.id) };
          } else if (action.kind === 'etc') {
            return { ...prev, etc: prev.etc.filter((e) => e.id !== action.id) };
          }
          return prev;
        });
      }
    }
  };

  return (
    <>
      <PageHeader
        title="하루 시간표"
        subtitle={isToday ? formatKoreanDate(new Date()) : WEEKDAYS.find((w) => w.key === dayKey)!.label}
        right={
          <div className="flex items-center gap-1.5">
            {unlocked && (
              <button
                type="button"
                onClick={() => handleEmptyClick({ start: '16:00', end: '16:30' })}
                className="btn-primary !px-3 !py-1.5 !text-xs flex items-center gap-1"
              >
                <Plus size={14} /> 일정 추가
              </button>
            )}
            <Link to={`/planner/${dayKey}`} className="btn-ghost !px-3 !py-2 !text-xs">
              {unlocked ? (
                <>
                  <Pencil size={14} /> 계획 관리
                </>
              ) : (
                <>
                  <CalendarRange size={14} /> 계획 확인
                </>
              )}
            </Link>
          </div>
        }
      />

      {/* 요일 선택 */}
      <div className="mb-4 flex gap-1.5">
        {WEEKDAYS.map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => {
              setDayKey(w.key);
              setSelectedId(null);
            }}
            className={`relative flex h-9 flex-1 items-center justify-center rounded-xl font-hand text-lg font-bold transition-colors ${
              w.key === dayKey ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:text-ink'
            }`}
          >
            {w.short}
            {w.key === todayKey && <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div className="paper-card mb-4 p-3">
        <CircularTimetable
          blocks={blocks}
          showNow={isToday}
          selectedId={selectedId}
          onSelect={handleSelectBlock}
          onEmptyClick={handleEmptyClick}
        />

        <p className="mt-1 text-center text-[11px] text-ink-soft">
          💡 항목이나 빈 곳을 누르면 세부 일정을 수정하거나 추가할 수 있어요
        </p>

        {/* 범례 + 합계 */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
          {legend.map(({ kind, color }) => (
            <span key={kind} className="flex items-center gap-1 text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {KIND_LABEL[kind]} <b className="text-ink">{formatDuration(sums[kind] ?? 0)}</b>
            </span>
          ))}
          <span className="flex items-center gap-1 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" />
            빈 시간 <b className="text-ink">{formatDuration(freeMin)}</b>
          </span>
        </div>
      </div>

      {/* 시간 순서 목록 */}
      {list.length === 0 ? (
        <button
          type="button"
          onClick={() => handleEmptyClick({ start: '16:00', end: '16:30' })}
          className="paper-card block w-full py-8 text-center text-sm text-ink-soft"
        >
          {unlocked
            ? '아직 일정이 없어요. 눌러서 일정을 추가해 보세요 →'
            : '아직 일정이 없어요. 주간 계획을 확인해 보세요 →'}
        </button>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const sel = selectedId === b.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => handleSelectBlock(b.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                    sel ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: tint(b.color, sel ? 0.22 : 0.12), ['--tw-ring-color' as string]: b.color }}
                >
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-hand text-xl font-bold leading-6 flex items-center">
                      <span className="truncate">{b.label}</span>
                      {b.isSpecial ? (
                        <span className="ml-1.5 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-sans font-bold text-amber-700">
                          특별 미션
                        </span>
                      ) : (
                        <span className="ml-1.5 align-middle text-[10px] font-normal text-ink-soft">{KIND_LABEL[b.kind]}</span>
                      )}
                    </p>
                    {b.detail && <p className="truncate text-xs text-ink-soft">{b.detail}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold">
                      {formatTime(b.start)} ~ {formatTime(b.end)}
                    </p>
                    <p className="text-[11px] text-ink-soft">{formatDuration(durationMin(b.start, b.end))}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* 일정 상세 편집/추가 모달 */}
      <ScheduleDetailModal
        key={modalTargetBlock?.id ?? emptySlot?.start ?? 'new'}
        open={modalOpen}
        selectedBlock={modalTargetBlock}
        emptyTimeSlot={emptySlot}
        subjects={data.subjects}
        isToday={isToday}
        onAction={handleAction}
        onClose={() => setModalOpen(false)}
      />

      {/* PIN 인증 모달 */}
      <PinGateModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}

