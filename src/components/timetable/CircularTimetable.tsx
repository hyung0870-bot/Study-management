import { useEffect, useMemo, useState } from 'react';
import type { Block } from '../../lib/schedule';
import { DAY_MIN, toSegments } from '../../lib/time';

const SIZE = 460;
const C = SIZE / 2;
const R_OUT = 142;
const R_IN = 60;
const CALLOUT_THRESHOLD = 55; // 55분 미만 블록은 원 바깥으로 지시선 연결

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

interface CalloutItem {
  id: string;
  block: Block;
  segKey: string;
  mid: number;
  angle: number;
  isRight: boolean;
  xSlice: number;
  ySlice: number;
  xNatural: number;
  naturalY: number;
  adjustedY: number;
}

/** 겹치는 콜아웃 라벨들의 Y 위치를 아래/위로 분산 */
function relaxCallouts(items: CalloutItem[], minY: number, maxY: number, minGap = 20) {
  if (items.length <= 1) return;
  items.sort((a, b) => a.naturalY - b.naturalY);

  // 1. 위에서 아래로 밀기
  for (let i = 1; i < items.length; i++) {
    if (items[i].adjustedY < items[i - 1].adjustedY + minGap) {
      items[i].adjustedY = items[i - 1].adjustedY + minGap;
    }
  }

  // 2. 아래쪽 한계 초과 시 위로 당기기
  if (items[items.length - 1].adjustedY > maxY) {
    items[items.length - 1].adjustedY = maxY;
    for (let i = items.length - 2; i >= 0; i--) {
      if (items[i].adjustedY > items[i + 1].adjustedY - minGap) {
        items[i].adjustedY = items[i + 1].adjustedY - minGap;
      }
    }
  }

  // 3. 원래 위치 중심으로 균형 맞추기
  const avgNat = items.reduce((s, it) => s + it.naturalY, 0) / items.length;
  const avgAdj = items.reduce((s, it) => s + it.adjustedY, 0) / items.length;
  const shift = avgNat - avgAdj;
  const newMin = items[0].adjustedY + shift;
  const newMax = items[items.length - 1].adjustedY + shift;
  if (newMin >= minY && newMax <= maxY) {
    for (const it of items) it.adjustedY += shift;
  }
}

interface Props {
  blocks: Block[];
  showNow?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/** 24시간 원형 시간표 (커스텀 SVG) - 칸이 좁은 일정은 바깥 지시선으로 표기 */
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
  const sorted = useMemo(() => [...blocks].sort((a, b) => order[a.kind] - order[b.kind]), [blocks]);

  // 칸이 좁아 내부에 글씨가 안 들어가는 블록들 (바깥쪽 지시선 라벨 처리)
  const callouts = useMemo(() => {
    const raw: CalloutItem[] = sorted.flatMap((b) =>
      toSegments(b)
        .filter(([s, e]) => e - s < CALLOUT_THRESHOLD && e - s > 0)
        .map(([s, e], i) => {
          const mid = (s + e) / 2;
          const angle = ang(mid);
          const isRight = mid <= 720;
          const [xSlice, ySlice] = pt(R_OUT + 1, mid);

          // 지시선 꺾임점의 자연스러운 좌표
          const rLeader = R_OUT + 24;
          const [xNatural, naturalY] = pt(rLeader, mid);

          return {
            id: b.id,
            block: b,
            segKey: `${b.id}-${i}`,
            mid,
            angle,
            isRight,
            xSlice,
            ySlice,
            xNatural,
            naturalY,
            adjustedY: naturalY,
          };
        }),
    );

    const right = raw.filter((c) => c.isRight);
    const left = raw.filter((c) => !c.isRight);

    relaxCallouts(right, 24, SIZE - 24, 20);
    relaxCallouts(left, 24, SIZE - 24, 20);

    return [...right, ...left];
  }, [sorted]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block w-full max-w-[390px] select-none"
      role="img"
      aria-label="24시간 원형 시간표"
    >
      {/* 바탕(빈 시간) */}
      <circle cx={C} cy={C} r={R_OUT} fill="#ffffff" stroke="#e3e7ee" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_IN} fill="#fffefb" stroke="#e3e7ee" strokeWidth={1.5} />

      {/* 시간 구분선 */}
      {Array.from({ length: 24 }, (_, h) => {
        const [x1, y1] = pt(R_IN, h * 60);
        const [x2, y2] = pt(R_OUT, h * 60);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eef1f5" strokeWidth={h % 6 === 0 ? 1.4 : 0.8} />;
      })}

      {/* 일정 블록 호(arc) */}
      {sorted.flatMap((b) =>
        toSegments(b).map(([s, e], i) => {
          const sel = selectedId === b.id;
          const dim = selectedId && !sel;
          return (
            <path
              key={`${b.id}-${i}`}
              d={arcPath(s, e, b.kind === 'study' ? R_IN + 4 : R_IN, sel ? R_OUT + 5 : R_OUT)}
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

      {/* 블록 라벨 (충분히 긴 블록만 원형 내부 표기) */}
      {sorted.flatMap((b) =>
        toSegments(b)
          .filter(([s, e]) => e - s >= CALLOUT_THRESHOLD)
          .map(([s, e], i) => {
            const mid = (s + e) / 2;
            const [x, y] = pt((R_IN + R_OUT) / 2 + 2, mid);
            const len = e - s;
            const sel = selectedId === b.id;
            const dim = selectedId && !sel;
            return (
              <text
                key={`l-${b.id}-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none font-hand font-bold"
                fontSize={len >= 90 ? 16 : 13}
                fill={sel ? b.color : '#2f3340'}
                opacity={dim ? 0.35 : 1}
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

      {/* 칸이 좁은 일정: 바깥쪽 지시선(leader line)과 텍스트 연결 */}
      {callouts.map((it) => {
        const isRight = it.isRight;
        const yElbow = it.adjustedY;
        const sel = selectedId === it.block.id;
        const dim = selectedId && !sel;
        const TICK_LEN = 12;

        let xElbow: number;
        let xEnd: number;
        let xText: number;

        if (isRight) {
          const minX = C + Math.sqrt(Math.max(0, (R_OUT + 22) ** 2 - (yElbow - C) ** 2));
          xElbow = Math.min(SIZE - 55, Math.max(minX, it.xNatural));
          xEnd = xElbow + TICK_LEN;
          xText = xEnd + 4;
        } else {
          const maxX = C - Math.sqrt(Math.max(0, (R_OUT + 22) ** 2 - (yElbow - C) ** 2));
          xElbow = Math.max(55, Math.min(maxX, it.xNatural));
          xEnd = xElbow - TICK_LEN;
          xText = xEnd - 4;
        }

        const pathD = `M ${it.xSlice} ${it.ySlice} L ${xElbow} ${yElbow} L ${xEnd} ${yElbow}`;

        return (
          <g
            key={`callout-${it.segKey}`}
            className="cursor-pointer transition-all duration-200"
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect?.(sel ? null : it.block.id);
            }}
          >
            {/* 슬라이스 테두리 지시선 시작점의 작은 점 */}
            <circle
              cx={it.xSlice}
              cy={it.ySlice}
              r={sel ? 2.5 : 2}
              fill={it.block.color}
              opacity={dim ? 0.35 : 1}
            />
            {/* 꺾인 지시선 */}
            <path
              d={pathD}
              fill="none"
              stroke={it.block.color}
              strokeWidth={sel ? 2.2 : 1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={dim ? 0.35 : 0.95}
            />
            {/* 지시선 바깥쪽 텍스트 라벨 (흰색 윤곽선으로 가독성 보장) */}
            <text
              x={xText}
              y={yElbow}
              textAnchor={isRight ? 'start' : 'end'}
              dominantBaseline="central"
              className="font-hand font-bold"
              fontSize={13}
              fill={sel ? it.block.color : '#2f3340'}
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
              strokeLinejoin="round"
              opacity={dim ? 0.35 : 1}
            >
              {it.block.label.length > 6 ? it.block.label.slice(0, 6) + '…' : it.block.label}
            </text>
          </g>
        );
      })}

      {/* 현재 시각 바늘 */}
      {showNow && (
        <g className="pointer-events-none">
          <line
            x1={C}
            y1={C}
            x2={pt(R_OUT + 2, nowMin)[0]}
            y2={pt(R_OUT + 2, nowMin)[1]}
            stroke="#f26d6d"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={C} cy={C} r={5} fill="#f26d6d" />
        </g>
      )}

      {/* 가운데 동그라미 & 시간 표기 */}
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
