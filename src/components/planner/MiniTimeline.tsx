import type { Block } from '../../lib/schedule';
import { DAY_MIN, toSegments } from '../../lib/time';

/** 0~24시 가로 막대 - 일정 블록을 색으로, 빈 시간은 비워둠 */
export default function MiniTimeline({ blocks, showTicks = true }: { blocks: Block[]; showTicks?: boolean }) {
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
        {blocks.flatMap((b) =>
          toSegments(b).map(([s, e], i) => (
            <span
              key={`${b.id}-${i}`}
              title={`${b.label} ${b.start}~${b.end}`}
              className="absolute inset-y-0"
              style={{
                left: `${(s / DAY_MIN) * 100}%`,
                width: `${((e - s) / DAY_MIN) * 100}%`,
                backgroundColor: b.color,
                opacity: b.kind === 'study' ? 1 : 0.75,
              }}
            />
          )),
        )}
        {/* 6시간 눈금 */}
        {[6, 12, 18].map((h) => (
          <span key={h} className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
      </div>
      {showTicks && (
        <div className="mt-0.5 flex justify-between text-[9px] text-ink-soft/70">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      )}
    </div>
  );
}
