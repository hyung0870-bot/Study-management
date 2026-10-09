import { useEffect, useState } from 'react';
import type { Block } from '../../lib/schedule';
import { DAY_MIN, toSegments } from '../../lib/time';

const SIZE = 340;
const C = SIZE / 2;
const R_OUT = 150;
const R_IN = 62;

/** 분 → 각도(rad). 0시가 맨 위, 시계 방향 */
const ang = (min: number) => (min / DAY_MIN) * Math.PI * 2 - Math.PI / 2;
const pt = (r: number, min: number) => [C + r * Math.cos(ang(min)), C + r * Math.sin(ang(min))] as const;

function arcPath(s: number, e: number, r1: number, r2: number) {
  const large = e - s > DAY_MIN / 2 ? 1 : 0;
  const [x1, y1] = pt(r2, s);
  const [x2, y2] = pt(r2, e);
  const [x3, y3] = pt(r1, e);
  const [x4, y4] = pt(r1, s);
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

interface Props {
  blocks: Block[];
  showNow?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/** 24시간 원형 시간표 (커스텀 SVG) - 일정이 없는 시간은 비워 둠 */
export default function CircularTimetable({ blocks, showNow, selectedId, onSelect }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!showNow) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [showNow]);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // 공부 블록이 위에 그려지도록 정렬
  const order = { sleep: 0, school: 1, academy: 2, etc: 3, study: 4 } as const;
  const sorted = [...blocks].sort((a, b) => order[a.kind] - order[b.kind]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[360px] select-none" role="img" aria-label="24시간 원형 시간표">
      {/* 바탕(빈 시간) */}
      <circle cx={C} cy={C} r={R_OUT} fill="#ffffff" stroke="#e3e7ee" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_IN} fill="#fffefb" stroke="#e3e7ee" strokeWidth={1.5} />

      {/* 시간 구분선 */}
      {Array.from({ length: 24 }, (_, h) => {
        const [x1, y1] = pt(R_IN, h * 60);
        const [x2, y2] = pt(R_OUT, h * 60);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eef1f5" strokeWidth={h % 6 === 0 ? 1.4 : 0.8} />;
      })}

      {/* 일정 블록 */}
      {sorted.flatMap((b) =>
        toSegments(b).map(([s, e], i) => {
          const sel = selectedId === b.id;
          const dim = selectedId && !sel;
          return (
            <path
              key={`${b.id}-${i}`}
              d={arcPath(s, e, b.kind === 'study' ? R_IN + 4 : R_IN, sel ? R_OUT + 6 : R_OUT)}
              fill={b.color}
              fillOpacity={dim ? 0.3 : b.kind === 'study' ? 0.95 : 0.7}
              stroke="#fff"
              strokeWidth={1.5}
              className="cursor-pointer transition-all duration-200"
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect?.(sel ? null : b.id);
              }}
            />
          );
        }),
      )}

      {/* 블록 라벨 (충분히 긴 블록만) */}
      {sorted.flatMap((b) =>
        toSegments(b)
          .filter(([s, e]) => e - s >= 40)
          .map(([s, e], i) => {
            const mid = (s + e) / 2;
            const [x, y] = pt((R_IN + R_OUT) / 2 + 4, mid);
            const len = e - s;
            return (
              <text
                key={`l-${b.id}-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none font-hand font-bold"
                fontSize={len >= 90 ? 17 : 14}
                fill="#2f3340"
              >
                {b.label.length > 5 ? b.label.slice(0, 5) + '…' : b.label}
              </text>
            );
          }),
      )}

      {/* 시각 숫자 */}
      {Array.from({ length: 24 }, (_, h) => {
        const [x, y] = pt(R_OUT + 12, h * 60);
        const major = h % 3 === 0;
        return (
          <text
            key={`h-${h}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={major ? 12 : 9}
            fontWeight={major ? 700 : 400}
            fill={major ? '#3b3f4a' : '#a5abb7'}
          >
            {h}
          </text>
        );
      })}

      {/* 현재 시각 바늘 */}
      {showNow && (
        <g className="pointer-events-none">
          <line x1={C} y1={C} x2={pt(R_OUT + 2, nowMin)[0]} y2={pt(R_OUT + 2, nowMin)[1]} stroke="#f26d6d" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={C} cy={C} r={5} fill="#f26d6d" />
        </g>
      )}

      {/* 가운데 */}
      <circle cx={C} cy={C} r={R_IN - 6} fill="#fffefb" className="pointer-events-none" />
      <text x={C} y={C - 10} textAnchor="middle" className="font-hand font-bold" fontSize={22} fill="#3b3f4a">
        {showNow ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '24시간'}
      </text>
      <text x={C} y={C + 14} textAnchor="middle" fontSize={11} fill="#7a7f8c">
        {showNow ? '지금' : '하루 시간표'}
      </text>
    </svg>
  );
}
