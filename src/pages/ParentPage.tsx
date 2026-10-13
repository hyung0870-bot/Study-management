import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, LogOut, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import FamilyMemberList from '../components/parent/FamilyMemberList';
import MonthCalendar from '../components/calendar/MonthCalendar';
import DayDetailModal from '../components/parent/DayDetailModal';
import ChangePinSheet from '../components/parent/ChangePinSheet';
import AiConsultingModal from '../components/parent/AiConsultingModal';
import PinGate from '../components/parent/PinGate';
import { useParentAuth } from '../store/ParentAuth';
import { useAuth } from '../store/AuthContext';
import { useStore } from '../store/StoreContext';
import { toDateKey, uid } from '../lib/date';
import { progressOf, recordFor, statusOf } from '../lib/records';
import type { FamilyMember } from '../types';

/** [E] 학부모 모드 */
export default function ParentPage() {
  const { unlocked, lock } = useParentAuth();
  const { user, logout } = useAuth();
  const { data, update } = useStore();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // 가족 구성원 추가/수정/삭제 핸들러
  const handleAddMember = (
    newMem: Omit<FamilyMember, 'id' | 'createdAt'>,
    copyFromChildId?: string,
  ) => {
    const memberId = 'member-' + uid();
    const member: FamilyMember = {
      ...newMem,
      id: memberId,
      createdAt: new Date().toISOString(),
    };
    update((prev) => {
      let initialStudyData = {
        subjects: prev.subjects,
        week: prev.week,
        records: {},
      };

      if (copyFromChildId && prev.childrenData?.[copyFromChildId]) {
        const source = prev.childrenData[copyFromChildId];
        initialStudyData = {
          subjects: JSON.parse(JSON.stringify(source.subjects)),
          week: JSON.parse(JSON.stringify(source.week)),
          records: {},
        };
      }

      const nextChildrenData = {
        ...(prev.childrenData ?? {}),
        [memberId]: initialStudyData,
      };

      return {
        ...prev,
        familyMembers: [...(prev.familyMembers ?? []), member],
        childrenData: nextChildrenData,
      };
    });
  };


  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => {
    update((prev) => {
      const nextMembers = (prev.familyMembers ?? []).map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      );
      // 만약 부모 비밀번호가 변경되었고 해당 구성원이 부모라면 parentPin도 동기화
      const updatedMem = nextMembers.find((m) => m.id === id);
      const nextParentPin = updatedMem?.role === 'parent' && updates.pin ? updates.pin : prev.parentPin;
      return {
        ...prev,
        parentPin: nextParentPin,
        familyMembers: nextMembers,
      };
    });
  };

  const handleDeleteMember = (id: string) => {
    update((prev) => ({
      ...prev,
      familyMembers: (prev.familyMembers ?? []).filter((m) => m.id !== id),
    }));
  };


  // 이번 달의 통계 (완료일 / 미완료일)
  const stats = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let completeDays = 0;
    let incompleteDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const key = toDateKey(date);
      const st = statusOf(key);
      if (st === 'future') continue;
      const rec = recordFor(data, date);
      const { total, pct } = progressOf(rec);
      if (total > 0) {
        if (pct === 100) completeDays++;
        else if (st === 'past') incompleteDays++;
      }
    }
    return { completeDays, incompleteDays };
  }, [data]);

  if (!unlocked) return <PinGate />;

  const onSelectDate = (d: Date) => {
    setSelectedDate(d);
    setModalOpen(true);
  };

  const selectedRecord = recordFor(data, selectedDate);

  const savePin = (newPin: string) => {
    update((prev) => ({ ...prev, parentPin: newPin }));
    alert('학부모 비밀번호가 성공적으로 변경되었습니다.');
  };

  return (
    <>
      <PageHeader
        title="학부모 모드"
        subtitle={`계정: ${user?.email ?? '로컬'}`}
        right={
          <button
            type="button"
            onClick={() => {
              lock();
              navigate('/');
            }}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-slate-200 hover:text-ink transition active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>학생 모드로 전환</span>
          </button>
        }
      />

      {/* 이번 달 요약 카드 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="paper-card flex items-center gap-3 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p className="text-xs text-ink-soft">100% 완료한 날</p>
            <p className="font-hand text-2xl font-bold text-emerald-600">{stats.completeDays}일</p>
          </div>
        </div>
        <div className="paper-card flex items-center gap-3 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <AlertCircle size={22} />
          </span>
          <div>
            <p className="text-xs text-ink-soft">미완료한 날</p>
            <p className="font-hand text-2xl font-bold text-rose-600">{stats.incompleteDays}일</p>
          </div>
        </div>
      </div>

      {/* 캘린더: 미완료 날짜 붉은색 하이라이트 */}
      <div className="mb-4">
        <MonthCalendar selected={selectedDate} onSelect={onSelectDate} highlightIncomplete />
        <p className="mt-2 text-center text-xs text-ink-soft">
          날짜를 누르면 그날의 과목별 완료/미완료 목록을 볼 수 있어요 👆
        </p>
      </div>

      {/* AI 학습 컨설팅 배너 */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-paper">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold w-fit">
              <Sparkles size={12} /> Gemini AI 분석
            </span>
            <h3 className="font-hand text-xl font-bold">초등 맞춤 학습 AI 컨설팅</h3>
            <p className="text-xs text-white/80">
              이번 달 공부 밸런스 점검과 부족한 영역 보완 팁을 확인해 보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-blue-600 shadow-xs hover:bg-white/90 active:scale-95 transition-all whitespace-nowrap"
          >
            컨설팅 받기
          </button>
        </div>
      </div>

      {/* 1. 가족 구성원 관리 */}
      <div className="mb-4">
        <FamilyMemberList
          members={data.familyMembers ?? []}
          onAddMember={handleAddMember}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
        />
      </div>

      {/* 바로가기 메뉴 */}
      <div className="mb-4 paper-card space-y-1.5 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => navigate('/points')}
            className="flex flex-col items-start rounded-xl bg-amber-50/70 border border-amber-200/60 p-2.5 text-left transition-colors hover:bg-amber-100/70"
          >
            <span className="text-xl mb-1">⭐</span>
            <p className="text-xs font-bold text-amber-950">상점/벌점 관리</p>
            <p className="text-[10px] text-amber-800">항목 및 보상 편집</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/family-calendar')}
            className="flex flex-col items-start rounded-xl bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100"
          >
            <span className="text-xl mb-1">📅</span>
            <p className="text-xs font-bold text-ink">가족 달력</p>
            <p className="text-[10px] text-ink-soft">생일/여행/기념일</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/planner')}
            className="flex flex-col items-start rounded-xl bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100"
          >
            <span className="text-xl mb-1">📋</span>
            <p className="text-xs font-bold text-ink">주간 계획</p>
            <p className="text-[10px] text-ink-soft">학습 계획 수정</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/subjects')}
            className="flex flex-col items-start rounded-xl bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100"
          >
            <span className="text-xl mb-1">🎨</span>
            <p className="text-xs font-bold text-ink">과목 관리</p>
            <p className="text-[10px] text-ink-soft">과목/교재 관리</p>
          </button>
        </div>
      </div>

      {/* 설정 / 계정 관리 */}
      <div className="paper-card space-y-2 p-3">
        <button
          type="button"
          onClick={() => setPinOpen(true)}
          className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <KeyRound size={16} className="text-ink-soft" />
            <span>학부모 비밀번호 변경</span>
          </span>
          <span className="text-xs text-ink-soft">4자리 PIN</span>
        </button>

        <button
          type="button"
          onClick={() => {
            lock();
            logout();
          }}
          className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm text-rose-500 hover:bg-rose-50"
        >
          <span className="flex items-center gap-2">
            <LogOut size={16} />
            <span>로그아웃 (다른 계정으로 로그인)</span>
          </span>
        </button>
      </div>

      <DayDetailModal
        open={modalOpen}
        date={selectedDate}
        record={selectedRecord}
        onClose={() => setModalOpen(false)}
      />

      <ChangePinSheet
        open={pinOpen}
        currentPin={data.parentPin}
        onSave={savePin}
        onClose={() => setPinOpen(false)}
      />

      <AiConsultingModal
        open={aiModalOpen}
        defaultRole="parent"
        onClose={() => setAiModalOpen(false)}
      />
    </>
  );
}
