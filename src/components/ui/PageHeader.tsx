import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}

/** 공책에 손글씨로 적은 듯한 페이지 제목 */
export default function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-hand text-[32px] font-bold leading-8">
          <span className="marker">{title}</span>
        </h1>
        {subtitle && <p className="mt-1 text-sm leading-8 text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
