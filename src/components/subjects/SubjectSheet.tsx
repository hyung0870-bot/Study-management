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
  existingCategories?: string[];
  onSave: (v: { name: string; category?: string; color: string; isSpecial?: boolean }) => void;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = ['수학', '국어', '영어', '과학', '사회', '독서', '예체능', '기타'];

export default function SubjectSheet({ open, initial, existingNames, existingCategories = [], onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(SUBJECT_PALETTE[0]);
  const [isSpecial, setIsSpecial] = useState(false);

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories.filter(Boolean)]));

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCategory(initial?.category ?? '수학');
    setIsSpecial(initial?.isSpecial ?? false);
    setColor(initial?.color ?? SUBJECT_PALETTE[existingNames.length % SUBJECT_PALETTE.length]);
  }, [open, initial, existingNames.length]);

  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n === trimmed && n !== initial?.name);
  const valid = trimmed.length > 0 && !duplicate;

  const submit = () => {
    if (!valid) return;
    onSave({ name: trimmed, category: category.trim() || '기타', color, isSpecial });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? '활동/교재 수정' : '새 활동/교재 추가'}
      footer={
        <button type="button" className="btn-primary w-full" disabled={!valid} onClick={submit}>
          {initial ? '저장하기' : '추가하기'}
        </button>
      }
    >
      <div className="space-y-5 pt-1">
        {/* 미리보기 */}
        <div className="flex flex-col items-center justify-center gap-1.5 py-2">
          <span
            className="rounded-2xl px-5 py-2 font-hand text-3xl font-bold transition-colors"
            style={{ backgroundColor: tint(color, 0.18), color }}
          >
            {trimmed || '활동 이름'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium">{category || '과목 미지정'}</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${isSpecial ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {isSpecial ? '특별 미션' : '일반 미션'}
            </span>
          </div>
        </div>

        <Field label="활동 이름 (교재명)" hint={duplicate ? <span className="text-rose-500">이미 있는 활동 이름이에요</span> : undefined}>
          <input
            autoFocus
            className="input-note"
            placeholder="예: 쎈수학, 디딤돌, 리딩튜터"
            maxLength={18}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>

        <div>
          <span className="mb-2 block text-xs font-bold text-ink-soft">과목 (대분류)</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                  category === cat ? 'bg-ink text-white shadow-xs' : 'bg-slate-100 text-ink-soft hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            className="input-note text-xs"
            placeholder="직접 입력하거나 위 버튼을 선택하세요"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-bold text-ink-soft">미션 구분</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsSpecial(false)}
              className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                !isSpecial ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-ink-soft'
              }`}
            >
              일반 미션 (주간 계획)
            </button>
            <button
              type="button"
              onClick={() => setIsSpecial(true)}
              className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                isSpecial ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-ink-soft'
              }`}
            >
              특별 미션 (특정 날짜용)
            </button>
          </div>
        </div>


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
