import { useNavigate } from 'react-router-dom';
import { CalendarCheck, LogOut } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Placeholder from '../components/ui/Placeholder';
import PinGate from '../components/parent/PinGate';
import { useParentAuth } from '../store/ParentAuth';

/** [E] 학부모 모드 (PIN 잠금) */
export default function ParentPage() {
  const { unlocked, lock } = useParentAuth();
  const navigate = useNavigate();

  if (!unlocked) return <PinGate />;

  return (
    <>
      <PageHeader
        title="학부모 모드"
        subtitle="이번 달 학습 현황"
        right={
          <button
            type="button"
            onClick={() => {
              lock();
              navigate('/');
            }}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-ink-soft hover:bg-slate-200"
          >
            <LogOut size={14} /> 잠그고 나가기
          </button>
        }
      />
      <Placeholder
        icon={<CalendarCheck size={20} />}
        title="학습 현황 캘린더"
        items={[
          '이번 달 달력 + 날짜별 달성률',
          '100% 미완료 날짜는 붉은 배경 + 빨간 점으로 강조',
          '날짜 클릭 시 과목별 완료/미완료 상세 팝업',
          '비밀번호 변경',
        ]}
      />
    </>
  );
}
