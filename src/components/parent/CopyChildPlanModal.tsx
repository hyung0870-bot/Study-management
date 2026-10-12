import { useEffect, useState } from 'react';
import { AlertTriangle, Delete, KeyRound } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { useStore } from '../../store/StoreContext';
import type { FamilyMember } from '../../types';

interface Props {
  open: boolean;
  sourceChild: FamilyMember | null;
  targetChild: FamilyMember | null;
  onConfirm: () => void;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function CopyChildPlanModal({
  open,
  sourceChild,
  targetChild,
  onConfirm,
  onClose,
}: Props) {
  const { data } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
    }
  }, [open]);

  const press = (k: string) => {
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    setError(false);
    setPin((p) => p + k);
  };

  useEffect(() => {
    if (pin.length !== 4) return;

    // 부모 PIN 검증 (부모 구성원 중 하나의 PIN이거나 data.parentPin)
    const parentMembers = (data.familyMembers ?? []).filter((m) => m.role === 'parent');
    const isValid = parentMembers.some((m) => m.pin === pin) || pin === data.parentPin;

    if (isValid) {
      onConfirm();
      onClose();
    } else {
      setError(true);
      const t = setTimeout(() => setPin(''), 450);
      return () => clearTimeout(t);
    }
  }, [pin, data.parentPin, data.familyMembers, onConfirm, onClose]);

  // 키보드 입력 지원
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !sourceChild || !targetChild) return null;

  return (
    <Sheet open={open} onClose={onClose} title="다른 아이 계획 불러오기">
      <div className="space-y-4 pt-1">
        {/* 경고 알림 박스 */}
        <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>주의: 기존 과목 및 주간 시간표가 대체됩니다</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>{sourceChild.name}</strong>의 과목과 요일별 시간표 계획을{' '}
            <strong>{targetChild.name}</strong>에게 그대로 복사해 옵니다.
          </p>
          <div className="rounded-xl bg-white/80 p-2.5 text-[11px] text-amber-950 font-medium border border-amber-200/50">
            ⚠️ 현재 <strong>{targetChild.name}</strong>에게 등록된 과목과 주간 계획은 지워지고 새로 변경됩니다.
            <br />
            (단, 기존에 체크했던 날짜별 완료 기록 및 대화 메시지는 유지됩니다.)
          </div>
        </div>

        {/* PIN 인증 영역 */}
        <div className="text-center pt-1 space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink-soft">
            <KeyRound size={14} className="text-indigo-600" />
            <span>실행하려면 부모님 PIN 번호 4자리를 입력해 주세요</span>
          </div>

          {/* PIN 인디케이터 */}
          <div className={`flex items-center justify-center gap-3 py-1 ${error ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < pin.length;
              return (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
                    error
                      ? 'border-rose-500 bg-rose-500'
                      : filled
                      ? 'border-indigo-600 bg-indigo-600 scale-110 shadow-xs'
                      : 'border-slate-300 bg-white'
                  }`}
                />
              );
            })}
          </div>
          {error && <p className="text-xs font-bold text-rose-500">PIN 번호가 일치하지 않습니다</p>}

          {/* 숫자 키패드 */}
          <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-2 pt-2">
            {KEYS.map((k, idx) => {
              if (k === '') return <div key={idx} />;
              if (k === 'del') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => press('del')}
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-ink-soft hover:bg-slate-200 active:scale-95 transition"
                  >
                    <Delete size={18} />
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => press(k)}
                  className="flex h-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-ink shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition border border-slate-200/60"
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost w-full font-bold text-xs"
          >
            취소하고 돌아가기
          </button>
        </div>
      </div>
    </Sheet>
  );
}
