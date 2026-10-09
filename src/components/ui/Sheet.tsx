import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * 모바일: 아래에서 올라오는 바텀시트 / PC: 가운데 모달
 * body 로 portal 처리 (부모의 transform 애니메이션 영향 방지)
 */
export default function Sheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px] animate-[fade_.2s_ease-out]" onClick={onClose} />
      <div className="sheet-panel relative flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-white shadow-paper md:rounded-[28px]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="font-hand text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-ink-soft hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
