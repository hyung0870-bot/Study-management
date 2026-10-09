import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { Field } from '../ui/Inputs';
import { SUBJECT_PALETTE, tint } from '../../lib/colors';
import type { Subject } from '../../types';

interface Props {
  open: boolean;
  initial?: Subject | null;
  existingNames: string[];
  onSave: (v: { name: string; color: string }) => void;
  onClose: () => void;
}

export default function SubjectSheet({ open, initial, existingNames, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    // 새 과목은 아직 안 쓰인 색을 기본으로
    setColor(initial?.color ?? SUBJECT_PALETTE[existingNames.length % SUBJECT_PALETTE.length]);
  }, [open, initial, existingNames.length]);

  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n === trimmed && n !== initial?.name);
  const valid = trimmed.length > 0 && !duplicate;

  const submit = () => {
    if (!valid) return;
    onSave({ name: trimmed, color });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? '과목 수정' : '새 과목 추가'}
      footer={
        <button type="button" className="btn-primary w-full" disabled={!valid} onClick={submit}>
          {initial ? '저장하기' : '추가하기'}
        </button>
      }
    >
      <div className="space-y-5 pt-1">
        {/* 미리보기 */}
        <div className="flex justify-center py-2">
          <span
            className="rounded-2xl px-5 py-2 font-hand text-3xl font-bold transition-colors"
            style={{ backgroundColor: tint(color, 0.18), color }}
          >
            {trimmed || '과목 이름'}
          </span>
        </div>

        <Field label="과목 이름" hint={duplicate ? <span className="text-rose-500">이미 있는 과목이에요</span> : undefined}>
          <input
            autoFocus
            className="input-note"
            placeholder="예: 수학, 피아노, 독서"
            maxLength={12}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>

        <div>
          <span className="mb-2 block text-xs font-bold text-ink-soft">색상 태그</span>
          <div className="grid grid-cols-6 gap-3">
            {SUBJECT_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`색상 ${c}`}
                onClick={() => setColor(c)}
                className={`flex aspect-square items-center justify-center rounded-full transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
              >
                {color === c && <Check size={18} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
