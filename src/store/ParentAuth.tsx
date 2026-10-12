import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { FamilyMember } from '../types';

/** 학부모 모드 잠금 상태 (탭/세션 단위로 유지, 새로고침해도 세션 내 유지) */
const KEY = 'study-notebook:parent-unlocked';
const ACTIVE_MEMBER_KEY = 'study-notebook:active-member';

interface ParentAuthValue {
  unlocked: boolean;
  activeMember: FamilyMember | null;
  unlock: (member?: FamilyMember) => void;
  lock: () => void;
  setActiveMember: (member: FamilyMember | null) => void;
  clearActiveMember: () => void;
}

const Ctx = createContext<ParentAuthValue | null>(null);

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(KEY) === '1');
  const [activeMember, setActiveMemberState] = useState<FamilyMember | null>(() => {
    try {
      const saved = sessionStorage.getItem(ACTIVE_MEMBER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setActiveMember = useCallback((member: FamilyMember | null) => {
    if (member) {
      sessionStorage.setItem(ACTIVE_MEMBER_KEY, JSON.stringify(member));
    } else {
      sessionStorage.removeItem(ACTIVE_MEMBER_KEY);
    }
    setActiveMemberState(member);
  }, []);

  const clearActiveMember = useCallback(() => {
    sessionStorage.removeItem(ACTIVE_MEMBER_KEY);
    sessionStorage.removeItem(KEY);
    setActiveMemberState(null);
    setUnlocked(false);
  }, []);

  const unlock = useCallback((member?: FamilyMember) => {
    sessionStorage.setItem(KEY, '1');
    setUnlocked(true);
    if (member) {
      sessionStorage.setItem(ACTIVE_MEMBER_KEY, JSON.stringify(member));
      setActiveMemberState(member);
    }
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setUnlocked(false);
  }, []);

  return (
    <Ctx.Provider value={{ unlocked, activeMember, unlock, lock, setActiveMember, clearActiveMember }}>
      {children}
    </Ctx.Provider>
  );
}


export function useParentAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useParentAuth must be used within ParentAuthProvider');
  return ctx;
}

