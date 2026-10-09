/** 과목 색상 팔레트 (파스텔 톤 - 공책 필기 색연필 느낌) */
export const SUBJECT_PALETTE = [
  '#7aa7e8', // 하늘
  '#5cc4d6', // 민트블루
  '#8fcf9e', // 연두
  '#b5d96b', // 라임
  '#f2a07b', // 살구
  '#f28b8b', // 코랄
  '#e89ac7', // 핑크
  '#c3a3e6', // 라벤더
  '#9b8de8', // 보라
  '#d4a373', // 갈색
  '#6fb7a8', // 청록
  '#a0a7b4', // 회색
];

/** 고정 일정 색상 */
export const FIXED_COLORS = {
  school: '#f6c453',
  academy: '#f4a3b8',
  sleep: '#8e9ac0',
  etc: '#a9bfa3',
} as const;

/** hex + 투명도 → rgba */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
