import type { ReactNode } from 'react';

/** 단계별 구현 전 임시 안내 카드 */
export default function Placeholder({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="paper-card animate-pop p-5">
      <div className="mb-3 flex items-center gap-2 text-accent">
        {icon}
        <span className="font-hand text-xl font-bold">{title}</span>
      </div>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-accent">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 inline-block rounded-full bg-slate-50 px-3 py-1 text-xs text-ink-soft">🚧 다음 단계에서 구현 예정</p>
    </div>
  );
}
