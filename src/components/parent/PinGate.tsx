import { useEffect, useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useParentAuth } from '../../store/ParentAuth';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

interface PinGateProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

/** 4자리 PIN 입력 화면 */
export default function PinGate({ onSuccess, isModal = false }: PinGateProps = {}) {
  const { data } = useStore();
  const { unlock } = useParentAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const press = (k: string) => {
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    setError(false);
    setPin((p) => p + k);
  };

  useEffect(() => {
    if (pin.length !== 4) return;
    if (pin === data.parentPin) {
      unlock();
      onSuccess?.();
    } else {
      setError(true);
      const t = setTimeout(() => setPin(''), 450);
      return () => clearTimeout(t);
    }
  }, [pin, data.parentPin, unlock, onSuccess]);

  // 키보드 입력 지원 (PC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`animate-pop flex flex-col items-center ${isModal ? 'pt-2 pb-4' : 'pt-6'}`}>
      {!isModal && (
        <>
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white shadow-soft">
            <Lock size={28} />
          </span>
          <h1 className="font-hand text-3xl font-bold">학부모 모드</h1>
        </>
      )}
      <p className="mt-1 text-sm text-ink-soft">비밀번호 4자리를 입력해 주세요</p>

      <div className={`my-7 flex gap-4 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all ${
              error
                ? 'border-rose-400 bg-rose-400'
                : i < pin.length
                  ? 'scale-110 border-ink bg-ink'
                  : 'border-slate-300 bg-white'
            }`}
          />
        ))}
      </div>
      <p className={`-mt-4 mb-4 h-5 text-xs text-rose-500 ${error ? 'visible' : 'invisible'}`}>
        비밀번호가 맞지 않아요
      </p>

      <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === 'del' ? '지우기' : k}
              className="paper-card flex h-16 items-center justify-center font-hand text-3xl font-bold transition active:scale-95 active:bg-slate-50"
            >
              {k === 'del' ? <Delete size={22} className="text-ink-soft" /> : k}
            </button>
          ),
        )}
      </div>
      <p className="mt-6 text-xs text-ink-soft">초기 비밀번호: 0000</p>
    </div>
  );
}
