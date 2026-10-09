import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, BookMarked, GraduationCap, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SubjectSheet from '../components/subjects/SubjectSheet';
import WeekMinutesGrid from '../components/subjects/WeekMinutesGrid';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useStore } from '../store/StoreContext';
import { tint } from '../lib/colors';
import { uid, WEEKDAYS } from '../lib/date';
import { activitiesOf, subjectWeekMinutes, sumWeek, type WeekMinutes } from '../lib/schedule';
import { formatDuration } from '../lib/time';
import type { Subject } from '../types';

const EMPTY: WeekMinutes = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

/** [A] 학습 항목(과목) 관리 + 학원·활동 현황 */
export default function SubjectsPage() {
  const { data, update } = useStore();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const subMin = useMemo(() => subjectWeekMinutes(data.week), [data.week]);
  const activities = useMemo(() => activitiesOf(data.week), [data.week]);
  const studyTotal = Object.values(subMin).reduce((n, w) => n + sumWeek(w), 0);
  const actTotal = activities.reduce((n, a) => n + sumWeek(a.minutes), 0);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const save = ({ name, color }: { name: string; color: string }) =>
    update((prev) => ({
      ...prev,
      subjects: editing
        ? prev.subjects.map((s) => (s.id === editing.id ? { ...s, name, color } : s))
        : [...prev.subjects, { id: uid(), name, color }],
    }));

  const remove = (subject: Subject) =>
    update((prev) => {
      const week = { ...prev.week };
      for (const w of WEEKDAYS)
        week[w.key] = { ...week[w.key], studies: week[w.key].studies.filter((s) => s.subjectId !== subject.id) };
      // 지난 기록(records)은 스냅샷이므로 그대로 보존
      return { ...prev, week, subjects: prev.subjects.filter((s) => s.id !== subject.id) };
    });

  const deletingCount = deleting
    ? WEEKDAYS.reduce((n, w) => n + data.week[w.key].studies.filter((s) => s.subjectId === deleting.id).length, 0)
    : 0;

  return (
    <>
      <PageHeader
        title="과목 관리"
        subtitle={`주간 공부 ${formatDuration(studyTotal)} · 학원/활동 ${formatDuration(actTotal)}`}
        right={
          <button type="button" className="btn-primary !px-3.5 !py-2" onClick={openNew}>
            <Plus size={18} /> 추가
          </button>
        }
      />

      {/* ---- 공부 과목 ---- */}
      <h2 className="mb-2 font-hand text-2xl font-bold">📘 공부 과목</h2>
      {data.subjects.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="paper-card flex w-full flex-col items-center gap-2 border-dashed py-10 text-ink-soft"
        >
          <BookMarked size={32} />
          <span className="font-hand text-xl">첫 번째 과목을 추가해 볼까요?</span>
        </button>
      ) : (
        <ul className="space-y-3">
          {data.subjects.map((s, i) => (
            <li
              key={s.id}
              className="paper-card animate-pop overflow-hidden p-0"
              style={{ animationDelay: `${i * 30}ms`, borderLeft: `6px solid ${s.color}` }}
            >
              <div className="flex items-center gap-3 px-3 pt-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-hand text-2xl font-bold"
                  style={{ backgroundColor: tint(s.color, 0.16), color: s.color }}
                >
                  {s.name.slice(0, 1)}
                </span>
                <p className="min-w-0 flex-1 truncate font-hand text-[22px] font-bold">{s.name}</p>
                <button
                  type="button"
                  aria-label={`${s.name} 수정`}
                  className="rounded-full p-2 text-ink-soft hover:bg-slate-100 hover:text-ink"
                  onClick={() => {
                    setEditing(s);
                    setSheetOpen(true);
                  }}
                >
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  aria-label={`${s.name} 삭제`}
                  className="rounded-full p-2 text-ink-soft hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => setDeleting(s)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="px-3 pb-3 pt-2">
                <WeekMinutesGrid minutes={subMin[s.id] ?? EMPTY} color={s.color} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---- 학원 / 기타 활동 (주간 계획에서 자동 반영) ---- */}
      <div className="mt-7 mb-2 flex items-end justify-between">
        <h2 className="font-hand text-2xl font-bold">🎒 학원 · 활동</h2>
        <span className="text-[11px] text-ink-soft">주간 계획에서 자동으로 모아요</span>
      </div>
      {activities.length === 0 ? (
        <Link to="/planner" className="paper-card block py-6 text-center text-sm text-ink-soft">
          주간 계획에 학원이나 기타 일정(수영, 공부방 등)을 넣으면 여기에 나타나요 →
        </Link>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => (
            <li
              key={`${a.kind}:${a.name}`}
              className="paper-card animate-pop overflow-hidden p-0"
              style={{ borderLeft: `6px solid ${a.color}` }}
            >
              <div className="flex items-center gap-3 px-3 pt-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: tint(a.color, 0.2), color: a.color }}
                >
                  {a.kind === 'academy' ? <GraduationCap size={20} /> : <Sparkles size={20} />}
                </span>
                <p className="min-w-0 flex-1 truncate font-hand text-[22px] font-bold">{a.name}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-ink-soft">
                  {a.kind === 'academy' ? '학원' : '기타'}
                </span>
              </div>
              <div className="px-3 pb-3 pt-2">
                <WeekMinutesGrid minutes={a.minutes} color={a.color} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <SubjectSheet
        open={sheetOpen}
        initial={editing}
        existingNames={data.subjects.map((s) => s.name)}
        onSave={save}
        onClose={() => setSheetOpen(false)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="과목 삭제"
        message={
          deleting
            ? `'${deleting.name}' 과목을 삭제할까요?` +
              (deletingCount ? `\n주간 계획에 있는 ${deletingCount}개의 공부 일정도 함께 지워져요.` : '') +
              '\n(지난 학습 기록은 그대로 남아요)'
            : ''
        }
        confirmLabel="삭제"
        danger
        onConfirm={() => deleting && remove(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
