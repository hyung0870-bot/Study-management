import { useState } from 'react';
import Sheet from '../ui/Sheet';
import { Field } from '../ui/Inputs';

interface Props {
  open: boolean;
  currentPin: string;
  onSave: (newPin: string) => void;
  onClose: () => void;
}

export default function ChangePinSheet({ open, currentPin, onSave, onClose }: Props) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [nextConfirm, setNextConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    if (cur !== currentPin) {
      setError('현재 비밀번호가 맞지 않아요');
      return;
    }
    if (!/^\d{4}$/.test(next)) {
      setError('새 비밀번호는 숫자 4자리여야 해요');
      return;
    }
    if (next !== nextConfirm) {
      setError('새 비밀번호가 서로 일치하지 않아요');
      return;
    }
    onSave(next);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="학부모 비밀번호 변경"
      footer={
        <button type="button" className="btn-primary w-full" onClick={submit}>
          변경하기
        </button>
      }
    >
      <div className="space-y-4 pt-1">
        <Field label="현재 비밀번호">
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            className="input-note text-center font-hand text-2xl tracking-widest"
            placeholder="••••"
            value={cur}
            onChange={(e) => setCur(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="새 비밀번호 (4자리)">
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            className="input-note text-center font-hand text-2xl tracking-widest"
            placeholder="••••"
            value={next}
            onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="새 비밀번호 확인">
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            className="input-note text-center font-hand text-2xl tracking-widest"
            placeholder="••••"
            value={nextConfirm}
            onChange={(e) => setNextConfirm(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        {error && <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-500">{error}</p>}
      </div>
    </Sheet>
  );
}
