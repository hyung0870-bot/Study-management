import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MonthCalendar from '../components/calendar/MonthCalendar';
import DayDetailModal from '../components/parent/DayDetailModal';
import ChangePinSheet from '../components/parent/ChangePinSheet';
import PinGate from '../components/parent/PinGate';
import { useParentAuth } from '../store/ParentAuth';
import { useAuth } from '../store/AuthContext';
import { useStore } from '../store/StoreContext';
import { toDateKey } from '../lib/date';
import { progressOf, recordFor, statusOf } from '../lib/records';

/** [E] 학부모 모드 */
export default function ParentPage() {
  const { unlocked, lock } = useParentAuth();
  const { user, logout } = useAuth();
  const { data, update } = useStore();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

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

  const savePin = (newPin: string) => update((prev) => ({ ...prev, parentPin: newPin }));

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
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-ink-soft hover:bg-slate-200"
          >
            <Lock size={14} /> 잠그기
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
    </>
  );
}
