import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, BookMarked, GraduationCap, Sparkles, Lock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SubjectSheet from '../components/subjects/SubjectSheet';
import WeekMinutesGrid from '../components/subjects/WeekMinutesGrid';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PinGateModal from '../components/parent/PinGateModal';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { tint } from '../lib/colors';
import { uid, WEEKDAYS } from '../lib/date';
import { activitiesOf, subjectWeekMinutes, sumWeek, type WeekMinutes } from '../lib/schedule';
import { formatDuration } from '../lib/time';
import type { Subject } from '../types';

const EMPTY: WeekMinutes = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

/** [A] 학습 항목(과목) 관리 + 학원·활동 현황 */
export default function SubjectsPage() {
  const { data, update } = useStore();
  const { unlocked } = useParentAuth();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const subMin = useMemo(() => subjectWeekMinutes(data.week), [data.week]);
  const activities = useMemo(() => activitiesOf(data.week), [data.week]);
  const studyTotal = Object.values(subMin).reduce((n, w) => n + sumWeek(w), 0);
  const actTotal = activities.reduce((n, a) => n + sumWeek(a.minutes), 0);

  const openNew = () => {
    if (!unlocked) return;
    setEditing(null);
    setSheetOpen(true);
  };

  const save = ({ name, category, color, isSpecial }: { name: string; category?: string; color: string; isSpecial?: boolean }) => {
    if (!unlocked) return;
    update((prev) => ({
      ...prev,
      subjects: editing
        ? prev.subjects.map((s) => (s.id === editing.id ? { ...s, name, category, color, isSpecial } : s))
        : [...prev.subjects, { id: uid(), name, category: category || '기타', color, isSpecial: !!isSpecial }],
    }));
  };

  const remove = (subject: Subject) => {
    if (!unlocked) return;
    update((prev) => {
      const week = { ...prev.week };
      for (const w of WEEKDAYS)
        week[w.key] = { ...week[w.key], studies: week[w.key].studies.filter((s) => s.subjectId !== subject.id) };
      // 지난 기록(records)은 스냅샷이므로 그대로 보존
      return { ...prev, week, subjects: prev.subjects.filter((s) => s.id !== subject.id) };
    });
  };

  const deletingCount = deleting
    ? WEEKDAYS.reduce((n, w) => n + data.week[w.key].studies.filter((s) => s.subjectId === deleting.id).length, 0)
    : 0;

  // 일반 미션과 특별 미션 분리
  const regularSubjects = useMemo(() => data.subjects.filter((s) => !s.isSpecial), [data.subjects]);
  const specialSubjects = useMemo(() => data.subjects.filter((s) => s.isSpecial), [data.subjects]);

  // 과목(대분류)별 통계 계산
  const categoryStats = useMemo(() => {
    const stats: Record<string, { totalMin: number; color: string; count: number }> = {};
    for (const s of data.subjects) {
      const cat = s.category || '기타';
      const m = subMin[s.id] ? sumWeek(subMin[s.id]) : 0;
      if (!stats[cat]) {
        stats[cat] = { totalMin: 0, color: s.color, count: 0 };
      }
      stats[cat].totalMin += m;
      stats[cat].count += 1;
    }
    return Object.entries(stats).sort((a, b) => b[1].totalMin - a[1].totalMin);
  }, [data.subjects, subMin]);

  return (
    <>
      <PageHeader
        title="과목 관리"
        subtitle={`주간 공부 ${formatDuration(studyTotal)} · 학원/활동 ${formatDuration(actTotal)}`}
        right={
          unlocked ? (
            <button type="button" className="btn-primary !px-3.5 !py-2" onClick={openNew}>
              <Plus size={18} /> 활동 추가
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPinOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-ink-soft hover:bg-slate-200"
            >
              <Lock size={13} /> 학부모 모드로 전환
            </button>
          )
        }
      />

      {/* 학생 모드 안내 배너 */}
      {!unlocked && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200/50 bg-amber-50/70 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Lock size={15} className="shrink-0 text-amber-600" />
            <span>학생 모드: 과목 및 활동 목록을 <b>확인</b>만 할 수 있어요.</span>
          </div>
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="ml-2 shrink-0 font-bold text-accent hover:underline"
          >
            수정하기
          </button>
        </div>
      )}

      {/* 과목(대분류)별 학습 시간 요약 카드 */}
      {categoryStats.length > 0 && (
        <div className="paper-card mb-5 p-3.5">
          <h3 className="mb-2.5 font-hand text-lg font-bold text-ink">📊 과목별 주간 학습 현황</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryStats.map(([cat, info]) => (
              <div key={cat} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                  <span className="truncate text-xs font-bold text-ink">{cat}</span>
                </div>
                <span className="text-xs font-extrabold text-accent">{formatDuration(info.totalMin)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- 일반 미션 (주간 계획 반영) ---- */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-hand text-2xl font-bold">📘 일반 미션 (주간 계획 연동)</h2>
        <span className="text-xs text-ink-soft">{regularSubjects.length}개</span>
      </div>

      {regularSubjects.length === 0 ? (
        <div className="paper-card mb-5 flex w-full flex-col items-center gap-2 border-dashed py-8 text-ink-soft">
          <BookMarked size={28} />
          <span className="font-hand text-lg">등록된 일반 미션이 없어요</span>
        </div>
      ) : (
        <ul className="mb-5 space-y-3">
          {regularSubjects.map((s, i) => (
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-hand text-[22px] font-bold">{s.name}</p>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                      {s.category || '기타'}
                    </span>
                  </div>
                </div>
                {unlocked && (
                  <>
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
                  </>
                )}
              </div>
              <div className="px-3 pb-3 pt-2">
                <WeekMinutesGrid minutes={subMin[s.id] ?? EMPTY} color={s.color} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---- 특별 미션 (특정 날짜용) ---- */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-hand text-2xl font-bold">⭐ 특별 미션 (오늘 할 일 전용)</h2>
        <span className="text-xs text-ink-soft">{specialSubjects.length}개</span>
      </div>

      {specialSubjects.length === 0 ? (
        <div className="paper-card mb-5 flex w-full flex-col items-center gap-2 border-dashed py-8 text-ink-soft">
          <Sparkles size={28} className="text-amber-500" />
          <span className="font-hand text-lg">오늘 할 일에서 특별 미션을 등록하면 여기에 보관돼요</span>
        </div>
      ) : (
        <ul className="mb-5 space-y-3">
          {specialSubjects.map((s, i) => (
            <li
              key={s.id}
              className="paper-card animate-pop overflow-hidden p-0"
              style={{ animationDelay: `${i * 30}ms`, borderLeft: `6px solid ${s.color}` }}
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500"
                >
                  <Sparkles size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-hand text-[22px] font-bold">{s.name}</p>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                      {s.category || '기타'}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      특별 미션
                    </span>
                  </div>
                </div>
                {unlocked && (
                  <>
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
                  </>
                )}
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

      {unlocked && (
        <>
          <SubjectSheet
            open={sheetOpen}
            initial={editing}
            existingNames={data.subjects.map((s) => s.name)}
            existingCategories={Array.from(new Set(data.subjects.map((s) => s.category).filter(Boolean) as string[]))}
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
      )}

      <PinGateModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}
