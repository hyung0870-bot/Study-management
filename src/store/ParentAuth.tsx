import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/** 학부모 모드 잠금 상태 (탭/세션 단위로 유지, 새로고침해도 세션 내 유지) */
const KEY = 'study-notebook:parent-unlocked';

interface ParentAuthValue {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const Ctx = createContext<ParentAuthValue | null>(null);

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(KEY) === '1');

  const unlock = useCallback(() => {
    sessionStorage.setItem(KEY, '1');
    setUnlocked(true);
  }, []);
  const lock = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setUnlocked(false);
  }, []);

  return <Ctx.Provider value={{ unlocked, unlock, lock }}>{children}</Ctx.Provider>;
}

export function useParentAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useParentAuth must be used within ParentAuthProvider');
  return ctx;
}
