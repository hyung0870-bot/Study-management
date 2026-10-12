import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock, LockOpen, NotebookPen, Sparkles, RefreshCw } from 'lucide-react';
import BottomNav from './BottomNav';
import AiConsultingModal from '../parent/AiConsultingModal';
import { useParentAuth } from '../../store/ParentAuth';
import { useStore } from '../../store/StoreContext';

/**
 * 앱 전체 레이아웃
 * - 모바일(기본 390px): 화면 전체가 공책 한 장
 * - PC(md 이상): 책상 배경 위에 공책 한 권이 가운데 놓인 형태
 */
export default function AppShell() {
  const { unlocked, activeMember, clearActiveMember } = useParentAuth();
  const { syncing, data } = useStore();
  const { pathname } = useLocation();
  const inParent = pathname.startsWith('/parent');
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // 현재 활성 사용자 또는 기본 역할 표시
  const currentMember = activeMember || (unlocked
    ? (data.familyMembers ?? []).find((m) => m.role === 'parent')
    : (data.familyMembers ?? []).find((m) => m.role === 'child'));

  return (
    <div className="min-h-full md:flex md:items-start md:justify-center md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-dvh w-full flex-col overflow-hidden bg-paper md:min-h-[calc(100dvh-5rem)] md:max-w-[720px] md:rounded-[28px] md:shadow-paper md:ring-1 md:ring-black/5">
        {/* 상단 바 */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/85 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <NotebookPen size={20} />
              </span>
              <span className="font-hand text-2xl font-bold leading-none tracking-tight">공부 노트</span>
            </Link>

            {currentMember && (
              <button
                type="button"
                onClick={clearActiveMember}
                title="다른 가족 구성원으로 전환하기"
                className="flex items-center gap-1 rounded-full bg-slate-100/90 hover:bg-slate-200 px-2.5 py-1 text-xs text-ink transition active:scale-95 ml-1 border border-slate-200/60"
              >
                <span>{currentMember.avatar || (currentMember.role === 'parent' ? '👨‍👩‍👧' : '🎒')}</span>
                <span className="font-bold text-[11px]">{currentMember.name}</span>
                <RefreshCw size={10} className="text-ink-soft ml-0.5" />
              </button>
            )}
          </div>


          <div className="flex items-center gap-1.5">
            {/* AI 학습 코칭 버튼 (학생/학부모 공용) */}
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-1 text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-95 transition-all"
              title="AI 학습 컨설팅 및 질문"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">AI 코칭</span>
            </button>

            <div
              title={syncing ? '클라우드에 저장 중...' : '클라우드에 안전하게 저장됨'}
              className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs text-ink-muted"
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  syncing ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[10px] font-medium hidden sm:inline">{syncing ? '저장 중' : '저장됨'}</span>
            </div>
            <Link
              to="/parent"
              aria-label={unlocked ? '학부모 모드 (열림)' : '학부모 모드 (잠김)'}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                inParent
                  ? 'bg-ink text-white'
                  : 'bg-slate-50 text-ink-soft hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {unlocked ? <LockOpen size={14} /> : <Lock size={14} />}
              <span className="font-bold">학부모</span>
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

        <AiConsultingModal
          open={aiModalOpen}
          defaultRole={unlocked ? 'parent' : 'student'}
          onClose={() => setAiModalOpen(false)}
        />
      </div>
    </div>
  );
}
