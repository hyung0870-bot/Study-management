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
  initialLoaded: boolean;
  update: (updater: (prev: AppData) => AppData) => void;
  updateDay: (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Firestore 초기 로드가 완료되었는지 여부
  const initialFetchDoneRef = useRef(false);
  // 디바운스 타이머
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) Firestore -> Local 동기화 (최초 로드 및 타 기기 실시간 변경 수신 - 읽기 전용)
  useEffect(() => {
    if (!user) {
      setInitialLoaded(true);
      return;
    }

    setSyncing(true);
    initialFetchDoneRef.current = false;
    const ref = doc(db, 'users', user.uid);

    // 네트워크 지연/오프라인 대비 타임아웃 (3초)
    const fallbackTimer = setTimeout(() => {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        setInitialLoaded(true);
        setSyncing(false);
      }
    }, 3000);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(fallbackTimer);
        setSyncing(false);
        initialFetchDoneRef.current = true;
        setInitialLoaded(true);

        if (snap.exists()) {
          // 클라우드 데이터가 존재하면 로컬에 덮어씌움 (클라우드가 최우선 기준)
          const remote = sanitize(snap.data());
          setData(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        } else {
          // 신규 가입자(문서 미존재): 기본 데이터로 최초 1회 생성
          const initial = loadLocal();
          setDoc(ref, initial, { merge: true }).catch(console.error);
        }
      },
      (error) => {
        console.error('Firestore snapshot error:', error);
        clearTimeout(fallbackTimer);
        initialFetchDoneRef.current = true;
        setInitialLoaded(true);
        setSyncing(false);
      },
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, [user?.uid]);

  // 2) 클라우드 저장 함수 (오직 사용자가 변경/저장을 눌렀을 때만 호출)
  const persistToCloud = useCallback(
    (nextData: AppData) => {
      // 로컬 스토리지 즉시 캐시
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));

      if (!user) return;
      // 초기 클라우드 데이터 로딩 전에는 쓰기 작업 절대 금지 (덮어쓰기 원천 차단)
      if (!initialFetchDoneRef.current) return;

      setSyncing(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const ref = doc(db, 'users', user.uid);
          await setDoc(ref, nextData);
        } catch (err) {
          console.error('클라우드 저장 실패:', err);
        } finally {
          setSyncing(false);
        }
      }, 350);
    },
    [user],
  );

  // 3) 사용자 변경 트리거 (update, updateDay, reset)
  const update = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        persistToCloud(next);
        return next;
      });
    },
    [persistToCloud],
  );

  const updateDay = useCallback(
    (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => {
      setData((prev) => {
        const next = {
          ...prev,
          week: {
            ...prev.week,
            [key]: updater(prev.week[key]),
          },
        };
        persistToCloud(next);
        return next;
      });
    },
    [persistToCloud],
  );

  const reset = useCallback(() => {
    const defaultData = createDefaultData();
    setData(defaultData);
    persistToCloud(defaultData);
  }, [persistToCloud]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!initialLoaded && user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper font-hand text-xl text-ink-soft">
        <span className="animate-spin text-3xl">⏳</span>
        <span>클라우드에서 일정을 안전하게 불러오는 중...</span>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ data, syncing, initialLoaded, update, updateDay, reset }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
