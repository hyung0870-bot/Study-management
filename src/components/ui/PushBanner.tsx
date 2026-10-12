import { Bell, X } from 'lucide-react';

export interface PushBannerInfo {
  id: string;
  updaterName: string;
  summary: string;
  time: string;
}

interface Props {
  banner: PushBannerInfo | null;
  onDismiss: () => void;
}

export default function PushBanner({ banner, onDismiss }: Props) {
  if (!banner) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[480px] animate-pop">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 text-white px-4 py-3 shadow-xl backdrop-blur-md ring-1 ring-white/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-soft animate-bounce">
            <Bell size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-amber-300 truncate">
                {banner.updaterName} 님의 업데이트
              </span>
              <span className="text-[10px] text-slate-400">방금 전</span>
            </div>
            <p className="text-xs text-slate-100 font-medium truncate mt-0.5">
              {banner.summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
