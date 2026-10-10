import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock, LockOpen, NotebookPen } from 'lucide-react';
import BottomNav from './BottomNav';
import { useParentAuth } from '../../store/ParentAuth';
import { useStore } from '../../store/StoreContext';

/**
 * 앱 전체 레이아웃
 * - 모바일(기본 390px): 화면 전체가 공책 한 장
 * - PC(md 이상): 책상 배경 위에 공책 한 권이 가운데 놓인 형태
 */
export default function AppShell() {
  const { unlocked } = useParentAuth();
  const { syncing } = useStore();
  const { pathname } = useLocation();
  const inParent = pathname.startsWith('/parent');

  return (
    <div className="min-h-full md:flex md:items-start md:justify-center md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-dvh w-full flex-col overflow-hidden bg-paper md:min-h-[calc(100dvh-5rem)] md:max-w-[720px] md:rounded-[28px] md:shadow-paper md:ring-1 md:ring-black/5">
        {/* 상단 바 */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/85 px-5 py-3 backdrop-blur-md">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <NotebookPen size={20} />
            </span>
            <span className="font-hand text-2xl font-bold leading-none tracking-tight">공부 노트</span>
          </Link>

          <div className="flex items-center gap-2">
            <div
              title={syncing ? '클라우드에 저장 중...' : '클라우드에 안전하게 저장됨'}
              className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-xs text-ink-muted"
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  syncing ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[11px] font-medium">{syncing ? '저장 중' : '저장됨'}</span>
            </div>
            <Link
              to="/parent"
              aria-label={unlocked ? '학부모 모드 (열림)' : '학부모 모드 (잠김)'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                inParent
                  ? 'bg-ink text-white'
                  : 'bg-slate-50 text-ink-soft hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {unlocked ? <LockOpen size={15} /> : <Lock size={15} />}
              <span>학부모</span>
            </Link>
          </div>
        </header>

        {/* 본문: 공책 줄무늬 종이 */}
        <main className="notebook-paper flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[640px] py-5 pl-10 pr-5 md:pl-14 md:pr-10">
            <Outlet />
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
