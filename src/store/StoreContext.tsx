import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { AppData, DaySchedule, WeekdayKey } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'study-notebook:v1';

const emptyDay = (): DaySchedule => ({
  school: null,
  academies: [],
  sleep: { start: '22:00', end: '07:00' },
  etc: [],
  studies: [],
});

export function createDefaultData(): AppData {
  const days: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const week = Object.fromEntries(days.map((d) => [d, emptyDay()])) as Record<WeekdayKey, DaySchedule>;
  return {
    version: 1,
    subjects: [
      { id: 'sub-math', name: '수학', color: '#7aa7e8' },
      { id: 'sub-kor', name: '국어', color: '#f2a07b' },
      { id: 'sub-eng', name: '영어', color: '#8fcf9e' },
      { id: 'sub-sci', name: '과학', color: '#c3a3e6' },
    ],
    week,
    records: {},
    parentPin: '0000',
  };
}

function sanitize(raw: unknown): AppData {
  const base = createDefaultData();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<AppData>;
  const data: AppData = {
    ...base,
    ...parsed,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : base.subjects,
    week: { ...base.week, ...(parsed.week ?? {}) },
    records: parsed.records ?? {},
    parentPin: parsed.parentPin ?? '0000',
  };
  for (const key of Object.keys(data.week) as WeekdayKey[]) {
    const d = { ...emptyDay(), ...data.week[key] };
    d.academies = d.academies ?? [];
    d.etc = d.etc ?? [];
    d.studies = (d.studies ?? []).map((s) => ({ ...s, start: s.start ?? '16:00', end: s.end ?? '16:30' }));
    data.week[key] = d;
  }
  return data;
}

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return createDefaultData();
  }
}

interface StoreValue {
  data: AppData;
  syncing: boolean;
  update: (updater: (prev: AppData) => AppData) => void;
  updateDay: (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const savingRef = useRef(false);

  // 1) 로그인 상태면 Firestore 와 양방향 실시간 동기화
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    setSyncing(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setSyncing(false);
        if (snap.exists()) {
          const remote = sanitize(snap.data());
          setData(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        } else {
          // 첫 로그인: 현재 로컬 데이터를 클라우드에 최초 업로드
          setDoc(ref, data, { merge: true }).catch(() => {});
        }
      },
      () => setSyncing(false),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // 2) 데이터가 바뀌면 LocalStorage + (로그인 시) Firestore 에 저장 (디바운스)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!user) return;
    savingRef.current = true;
    const t = setTimeout(() => {
      const ref = doc(db, 'users', user.uid);
      setDoc(ref, data).finally(() => {
        savingRef.current = false;
      });
    }, 250);
    return () => clearTimeout(t);
  }, [data, user]);

  const update = useCallback((updater: (prev: AppData) => AppData) => setData(updater), []);
  const updateDay = useCallback(
    (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) =>
      setData((prev) => ({ ...prev, week: { ...prev.week, [key]: updater(prev.week[key]) } })),
    [],
  );
  const reset = useCallback(() => setData(createDefaultData()), []);

  return <StoreContext.Provider value={{ data, syncing, update, updateDay, reset }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
