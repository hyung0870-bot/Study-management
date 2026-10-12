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
  const defaultSubjects = [
    { id: 'sub-math', name: '수학 기본', category: '수학', color: '#7aa7e8' },
    { id: 'sub-kor', name: '국어 독해', category: '국어', color: '#f2a07b' },
    { id: 'sub-eng', name: '영어 단어', category: '영어', color: '#8fcf9e' },
    { id: 'sub-sci', name: '과학 탐구', category: '과학', color: '#c3a3e6' },
  ];
  return {
    version: 1,
    subjects: defaultSubjects,
    week,
    records: {},
    parentPin: '0000',
    familyMembers: [
      { id: 'member-parent-1', name: '부모님', role: 'parent', pin: '0000', avatar: '👨‍👩‍👦', createdAt: new Date().toISOString() },
      { id: 'member-child-1', name: '아이', role: 'child', pin: '1234', avatar: '🎒', createdAt: new Date().toISOString() },
    ],
    calendarEvents: [],
    childrenData: {
      'member-child-1': {
        subjects: defaultSubjects,
        week,
        records: {},
      },
    },
  };
}

function sanitize(raw: unknown): AppData {
  const base = createDefaultData();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<AppData>;
  const data: AppData = {
    ...base,
    ...parsed,
    subjects: Array.isArray(parsed.subjects)
      ? parsed.subjects.map((s) => ({
          ...s,
          category: s.category || s.name,
        }))
      : base.subjects,
    week: { ...base.week, ...(parsed.week ?? {}) },
    records: parsed.records ?? {},
    parentPin: parsed.parentPin ?? '0000',
    geminiApiKey: parsed.geminiApiKey,
    familyMembers: Array.isArray(parsed.familyMembers) && parsed.familyMembers.length > 0
      ? parsed.familyMembers
      : [
          { id: 'member-parent-1', name: '부모님', role: 'parent', pin: parsed.parentPin ?? '0000', avatar: '👨‍👩‍👦', createdAt: new Date().toISOString() },
          { id: 'member-child-1', name: '아이', role: 'child', pin: '1234', avatar: '🎒', createdAt: new Date().toISOString() },
        ],
    calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
    childrenData: parsed.childrenData ?? {},
  };

  for (const key of Object.keys(data.week) as WeekdayKey[]) {
    const d = { ...emptyDay(), ...data.week[key] };
    d.academies = d.academies ?? [];
    d.etc = d.etc ?? [];
    d.studies = (d.studies ?? []).map((s) => ({ ...s, start: s.start ?? '16:00', end: s.end ?? '16:30' }));
    data.week[key] = d;
  }

  // 첫 번째 아이의 childrenData가 비어있다면, 기존 루트의 학습 데이터를 첫 번째 아이 데이터로 마이그레이션
  const firstChild = (data.familyMembers ?? []).find((m) => m.role === 'child');
  if (firstChild && !data.childrenData?.[firstChild.id]) {
    data.childrenData = {
      ...(data.childrenData ?? {}),
      [firstChild.id]: {
        subjects: data.subjects,
        week: data.week,
        records: data.records,
      },
    };
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
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  update: (updater: (prev: AppData) => AppData) => void;
  updateDay: (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => void;
  copyFromChild: (sourceChildId: string) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 부모 모드 등에서 선택된 현재 관리 대상 아이 ID
  const [selectedChildIdState, setSelectedChildIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('study-notebook:selected-child-id');
  });

  const setSelectedChildId = useCallback((id: string | null) => {
    if (id) {
      sessionStorage.setItem('study-notebook:selected-child-id', id);
    } else {
      sessionStorage.removeItem('study-notebook:selected-child-id');
    }
    setSelectedChildIdState(id);
  }, []);

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
          const remote = sanitize(snap.data());
          setData(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        } else {
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

  // 2) 클라우드 저장 함수
  const persistToCloud = useCallback(
    (nextData: AppData) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));

      if (!user) return;
      if (!initialFetchDoneRef.current) return;

      setSyncing(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const ref = doc(db, 'users', user.uid);
          const cleanData = JSON.parse(JSON.stringify(nextData));
          await setDoc(ref, cleanData);
        } catch (err) {
          console.error('클라우드 저장 실패:', err);
        } finally {
          setSyncing(false);
        }
      }, 350);
    },
    [user],
  );

  // 3) 사용자 변경 트리거 (update, updateDay, copyFromChild, reset)
  const update = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        // 만약 특정 아이가 선택된 상태라면, 해당 아이의 childrenData[selectedChildId]에도 동기화
        const activeChildId =
          selectedChildIdState ||
          (next.familyMembers ?? []).find((m) => m.role === 'child')?.id;

        if (activeChildId) {
          const nextChildrenData = {
            ...(next.childrenData ?? {}),
            [activeChildId]: {
              subjects: next.subjects,
              week: next.week,
              records: next.records,
            },
          };
          next.childrenData = nextChildrenData;
        }

        persistToCloud(next);
        return next;
      });
    },
    [persistToCloud, selectedChildIdState],
  );

  const updateDay = useCallback(
    (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => {
      setData((prev) => {
        const nextWeek = {
          ...prev.week,
          [key]: updater(prev.week[key]),
        };
        const next: AppData = {
          ...prev,
          week: nextWeek,
        };

        const activeChildId =
          selectedChildIdState ||
          (next.familyMembers ?? []).find((m) => m.role === 'child')?.id;

        if (activeChildId) {
          const nextChildrenData = {
            ...(next.childrenData ?? {}),
            [activeChildId]: {
              subjects: next.subjects,
              week: nextWeek,
              records: next.records,
            },
          };
          next.childrenData = nextChildrenData;
        }

        persistToCloud(next);
        return next;
      });
    },
    [persistToCloud, selectedChildIdState],
  );

  // 다른 아이의 과목/주간일정 정보를 현재 선택된 아이에게 복사/불러오기
  const copyFromChild = useCallback(
    (sourceChildId: string) => {
      setData((prev) => {
        const sourceData = prev.childrenData?.[sourceChildId];
        if (!sourceData) return prev;

        const activeChildId =
          selectedChildIdState ||
          (prev.familyMembers ?? []).find((m) => m.role === 'child')?.id;

        const next: AppData = {
          ...prev,
          subjects: JSON.parse(JSON.stringify(sourceData.subjects)),
          week: JSON.parse(JSON.stringify(sourceData.week)),
        };

        if (activeChildId) {
          const existingRecords = prev.childrenData?.[activeChildId]?.records ?? prev.records;
          next.childrenData = {
            ...(next.childrenData ?? {}),
            [activeChildId]: {
              subjects: next.subjects,
              week: next.week,
              records: existingRecords,
            },
          };
        }

        persistToCloud(next);
        return next;
      });
    },
    [persistToCloud, selectedChildIdState],
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
    <StoreContext.Provider
      value={{
        data,
        syncing,
        initialLoaded,
        selectedChildId: selectedChildIdState,
        setSelectedChildId,
        update,
        updateDay,
        copyFromChild,
        reset,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
