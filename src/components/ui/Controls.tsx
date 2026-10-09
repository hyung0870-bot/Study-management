import type { ReactNode } from 'react';

/** 켜기/끄기 스위치 */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

/** 상세 설정 화면의 섹션 카드 */
export function Section({
  icon,
  color,
  title,
  right,
  children,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="paper-card animate-pop p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}2e`, color }}>
          {icon}
        </span>
        <h2 className="font-hand text-[22px] font-bold">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/15"
    >
      {children}
    </button>
  );
}
