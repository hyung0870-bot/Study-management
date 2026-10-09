import { AlertTriangle } from 'lucide-react';
import type { Block } from '../../lib/schedule';
import { rangesOverlap } from '../../lib/time';
import type { TimeRange } from '../../types';

/** 입력 중인 시간과 겹치는 다른 일정 경고 */
export default function ConflictHint({ range, others }: { range: TimeRange; others: Block[] }) {
  const hits = others.filter((b) => rangesOverlap(range, b));
  if (!hits.length) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
      <AlertTriangle size={15} className="mt-px shrink-0" />
      <span>
        <b>{hits.map((h) => h.label).join(', ')}</b> 시간과 겹쳐요. 그래도 저장할 수 있어요.
      </span>
    </div>
  );
}
