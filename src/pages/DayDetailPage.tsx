import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Copy,
  GraduationCap,
  Moon,
  Plus,
  School,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import MiniTimeline from '../components/planner/MiniTimeline';
import StudySheet, { type StudyDraft } from '../components/planner/StudySheet';
import RangeSheet, { type RangeDraft } from '../components/planner/RangeSheet';
import CopyDaySheet from '../components/planner/CopyDaySheet';
import { AddButton, Section, Switch } from '../components/ui/Controls';
import { TimeRangeInput } from '../components/ui/Inputs';
import { useStore } from '../store/StoreContext';
import { uid, WEEKDAYS, weekdayKeyOf } from '../lib/date';
import { buildBlocks, byStart, findConflicts, totalStudyMin } from '../lib/schedule';
import { FIXED_COLORS, tint } from '../lib/colors';
import { durationMin, formatDuration, formatTime, fromMin, toMin } from '../lib/time';
import type { DaySchedule, NamedTimeRange, StudyPlanItem, WeekdayKey } from '../types';

type SheetState =
  | { type: 'study'; item: StudyPlanItem | null }
  | { type: 'academy'; item: NamedTimeRange | null }
  | { type: 'etc'; item: NamedTimeRange | null }
  | null;

const cloneDay = (d: DaySchedule): DaySchedule => ({
  school: d.school && { ...d.school },
  sleep: d.sleep && { ...d.sleep },
  academies: d.academies.map((a) => ({ ...a, id: uid() })),
  etc: d.etc.map((e) => ({ ...e, id: uid() })),
  studies: d.studies.map((s) => ({ ...s, id: uid() })),
});

/** [B] 요일 상세 설정 */
export default function DayDetailPage() {
  const { day: dayParam } = useParams();
  const { data, update, updateDay } = useStore();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [toast, setToast] = useState('');

  const weekday = WEEKDAYS.find((w) => w.key === dayParam);
  const key = weekday?.key as WeekdayKey;
  const day = weekday ? data.week[key] : null;

  const blocks = useMemo(() => (day ? buildBlocks(day, data.subjects) : []), [day, data.subjects]);
  const conflicts = useMemo(() => findConflicts(blocks), [blocks]);

  if (!weekday || !day) return <Navigate to="/planner" replace />;

  const set = (fn: (d: DaySchedule) => DaySchedule) => updateDay(key, fn);

  /** 새 항목 기본 시간: 낮 일정 중 가장 늦게 끝나는 시각 이후 */
  const nextSlot = (len: number) => {
    const ends = [day.school, ...day.academies, ...day.studies, ...day.etc]
      .filter((r): r is NonNullable<typeof r> => !!r && toMin(r.end) > toMin(r.start))
      .map((r) => toMin(r.end));
    const base = ends.length ? Math.max(...ends) : 16 * 60;
    const start = Math.min(base, 23 * 60);
    return { start: fromMin(start), end: fromMin(start + len) };
  };

  const editingId = sheet?.item?.id;
  const otherBlocks = blocks.filter((b) => b.id !== editingId);

  const saveStudy = (v: StudyDraft) =>
    set((d) => ({
      ...d,
      studies:
        sheet?.type === 'study' && sheet.item
          ? d.studies.map((s) => (s.id === sheet.item!.id ? { ...s, ...v } : s))
          : [...d.studies, { id: uid(), ...v }],
    }));

  const saveRange = (field: 'academies' | 'etc') => (v: RangeDraft) =>
    set((d) => ({
      ...d,
      [field]:
        sheet?.item
          ? d[field].map((x) => (x.id === sheet.item!.id ? { ...x, ...v } : x))
          : [...d[field], { id: uid(), ...v }],
    }));

  const removeItem = (field: 'studies' | 'academies' | 'etc', id: string) =>
    set((d) => ({ ...d, [field]: (d[field] as { id: string }[]).filter((x) => x.id !== id) }));

  const copyTo = (targets: WeekdayKey[]) => {
    update((prev) => {
      const week = { ...prev.week };
      targets.forEach((t) => (week[t] = cloneDay(prev.week[key])));
      return { ...prev, week };
    });
    const names = targets.map((t) => WEEKDAYS.find((w) => w.key === t)!.short).join(', ');
    setToast(`${names}요일에 복사했어요 ✨`);
    setTimeout(() => setToast(''), 2200);
  };

  const studies = [...day.studies].sort(byStart);
  const academies = [...day.academies].sort(byStart);
  const etc = [...day.etc].sort(byStart);
  const todayKey = weekdayKeyOf(new Date());

  return (
    <>
      {/* 상단: 뒤로가기 + 요일 + 복사 */}
      <div className="mb-3 flex items-center gap-2">
        <Link to="/planner" aria-label="주간 계획으로" className="-ml-2 rounded-full p-2 text-ink-soft hover:bg-slate-100">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-hand text-[32px] font-bold leading-8">
          <span className="marker">{weekday.label}</span>
        </h1>
        {key === todayKey && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">오늘</span>}
        <button type="button" onClick={() => setCopyOpen(true)} className="btn-ghost ml-auto !px-3 !py-1.5 !text-xs">
          <Copy size={14} /> 복사
        </button>
      </div>

      {/* 요일 전환 */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {WEEKDAYS.map((w) => (
          <Link
            key={w.key}
            to={`/planner/${w.key}`}
            replace
            className={`flex h-9 min-w-9 flex-1 items-center justify-center rounded-xl font-hand text-lg font-bold transition-colors ${
              w.key === key ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:text-ink'
            }`}
          >
            {w.short}
          </Link>
        ))}
      </div>

      {/* 하루 미리보기 */}
      <div className="paper-card mb-4 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
          <span>하루 미리보기</span>
          <span>
            공부 <b className="text-accent">{formatDuration(totalStudyMin(day))}</b>
          </span>
        </div>
        <MiniTimeline blocks={blocks} />
        {conflicts.size > 0 && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={13} /> 시간이 겹치는 일정이 있어요
          </p>
        )}
        <Link to="/timetable" className="mt-2 flex items-center justify-end gap-0.5 text-xs text-accent">
          원형 시간표로 보기 <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        {/* 1. 공부 계획 */}
        <Section
          icon={<BookOpen size={18} />}
          color="#5b8def"
          title="공부 계획"
          right={
            <AddButton onClick={() => setSheet({ type: 'study', item: null })}>
              <Plus size={14} /> 추가
            </AddButton>
          }
        >
          {studies.length === 0 ? (
            <p className="text-sm text-ink-soft/80">과목과 시작·끝 시간을 정해 보세요. 원형 시간표에 바로 나타나요!</p>
          ) : (
            <ul className="space-y-2">
              {studies.map((s) => {
                const sub = data.subjects.find((x) => x.id === s.subjectId);
                const color = sub?.color ?? '#a0a7b4';
                return (
                  <ItemRow
                    key={s.id}
                    color={color}
                    title={sub?.name ?? '(삭제된 과목)'}
                    titleColor={color}
                    subtitle={s.amount || '분량 미입력'}
                    start={s.start}
                    end={s.end}
                    conflict={conflicts.has(s.id)}
                    onClick={() => setSheet({ type: 'study', item: s })}
                  />
                );
              })}
            </ul>
          )}
        </Section>

        {/* 2. 학교 */}
        <Section
          icon={<School size={18} />}
          color={FIXED_COLORS.school}
          title="학교"
          right={
            <Switch
              label="학교 가는 날"
              checked={!!day.school}
              onChange={(on) => set((d) => ({ ...d, school: on ? { start: '08:30', end: '14:30' } : null }))}
            />
          }
        >
          {day.school ? (
            <>
              <TimeRangeInput
                start={day.school.start}
                end={day.school.end}
                startLabel="등교"
                endLabel="하교"
                onChange={(start, end) => set((d) => ({ ...d, school: { start, end } }))}
              />
              {conflicts.has('school') && <ConflictText />}
            </>
          ) : (
            <p className="text-sm text-ink-soft/80">학교 안 가는 날이에요</p>
          )}
        </Section>

        {/* 3. 학원 */}
        <Section
          icon={<GraduationCap size={18} />}
          color={FIXED_COLORS.academy}
          title="학원"
          right={
            <AddButton onClick={() => setSheet({ type: 'academy', item: null })}>
              <Plus size={14} /> 추가
            </AddButton>
          }
        >
          {academies.length === 0 ? (
            <p className="text-sm text-ink-soft/80">학원 일정이 없어요</p>
          ) : (
            <ul className="space-y-2">
              {academies.map((a) => (
                <ItemRow
                  key={a.id}
                  color={FIXED_COLORS.academy}
                  title={a.name}
                  start={a.start}
                  end={a.end}
                  conflict={conflicts.has(a.id)}
                  onClick={() => setSheet({ type: 'academy', item: a })}
                />
              ))}
            </ul>
          )}
        </Section>

        {/* 4. 수면 */}
        <Section
          icon={<Moon size={18} />}
          color={FIXED_COLORS.sleep}
          title="잠자는 시간"
          right={
            <Switch
              label="잠자는 시간 설정"
              checked={!!day.sleep}
              onChange={(on) => set((d) => ({ ...d, sleep: on ? { start: '22:00', end: '07:00' } : null }))}
            />
          }
        >
          {day.sleep ? (
            <>
              <TimeRangeInput
                start={day.sleep.start}
                end={day.sleep.end}
                startLabel="취침"
                endLabel="기상"
                onChange={(start, end) => set((d) => ({ ...d, sleep: { start, end } }))}
              />
              {conflicts.has('sleep') && <ConflictText />}
            </>
          ) : (
            <p className="text-sm text-ink-soft/80">잠자는 시간을 설정하지 않았어요</p>
          )}
        </Section>

        {/* 5. 기타 */}
        <Section
          icon={<Sparkles size={18} />}
          color={FIXED_COLORS.etc}
          title="기타 일정"
          right={
            <AddButton onClick={() => setSheet({ type: 'etc', item: null })}>
              <Plus size={14} /> 추가
            </AddButton>
          }
        >
          {etc.length === 0 ? (
            <p className="text-sm text-ink-soft/80">저녁 식사, 운동, 놀이 시간 등을 넣을 수 있어요</p>
          ) : (
            <ul className="space-y-2">
              {etc.map((e) => (
                <ItemRow
                  key={e.id}
                  color={FIXED_COLORS.etc}
                  title={e.name}
                  start={e.start}
                  end={e.end}
                  conflict={conflicts.has(e.id)}
                  onClick={() => setSheet({ type: 'etc', item: e })}
                />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <p className="mt-5 text-center text-xs leading-8 text-ink-soft">입력한 내용은 자동으로 저장돼요 💾</p>

      {/* 시트들 */}
      <StudySheet
        open={sheet?.type === 'study'}
        initial={sheet?.type === 'study' ? sheet.item : null}
        defaults={nextSlot(30)}
        subjects={data.subjects}
        otherBlocks={otherBlocks}
        onSave={saveStudy}
        onDelete={sheet?.type === 'study' && sheet.item ? () => removeItem('studies', sheet.item!.id) : undefined}
        onClose={() => setSheet(null)}
      />
      <RangeSheet
        open={sheet?.type === 'academy'}
        kindLabel="학원"
        placeholder="예: 영어학원, 태권도"
        initial={sheet?.type === 'academy' ? sheet.item : null}
        defaults={nextSlot(60)}
        otherBlocks={otherBlocks}
        onSave={saveRange('academies')}
        onDelete={sheet?.type === 'academy' && sheet.item ? () => removeItem('academies', sheet.item!.id) : undefined}
        onClose={() => setSheet(null)}
      />
      <RangeSheet
        open={sheet?.type === 'etc'}
        kindLabel="기타 일정"
        placeholder="예: 저녁 식사, 줄넘기"
        initial={sheet?.type === 'etc' ? sheet.item : null}
        defaults={nextSlot(60)}
        otherBlocks={otherBlocks}
        onSave={saveRange('etc')}
        onDelete={sheet?.type === 'etc' && sheet.item ? () => removeItem('etc', sheet.item!.id) : undefined}
        onClose={() => setSheet(null)}
      />
      <CopyDaySheet open={copyOpen} source={key} onCopy={copyTo} onClose={() => setCopyOpen(false)} />

      {toast && (
        <div className="animate-pop fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-paper">
          {toast}
        </div>
      )}
    </>
  );
}

function ConflictText() {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
      <AlertTriangle size={13} /> 다른 일정과 시간이 겹쳐요
    </p>
  );
}

function ItemRow({
  color,
  title,
  titleColor,
  subtitle,
  start,
  end,
  conflict,
  onClick,
}: {
  color: string;
  title: string;
  titleColor?: string;
  subtitle?: string;
  start: string;
  end: string;
  conflict?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:brightness-[0.98]"
        style={{ backgroundColor: tint(color, 0.1) }}
      >
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-hand text-xl font-bold leading-6" style={titleColor ? { color: titleColor } : undefined}>
            {title}
          </p>
          {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-ink">
            {formatTime(start)} ~ {formatTime(end)}
          </p>
          <p className="text-[11px] text-ink-soft">
            {conflict ? <span className="text-amber-600">⚠ 시간 겹침</span> : formatDuration(durationMin(start, end))}
          </p>
        </div>
      </button>
    </li>
  );
}
