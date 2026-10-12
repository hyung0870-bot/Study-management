import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { AppData, DaySchedule, WeekdayKey } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useParentAuth } from './ParentAuth';
import {
  playNotificationSound,
  triggerNotificationVibration,
  showSystemNotification,
} from '../lib/sound';
import PushBanner, { type PushBannerInfo } from '../components/ui/PushBanner';


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

  // 아이별 childrenData 초기화 및 독립된 records 보장
  const children = (data.familyMembers ?? []).filter((m) => m.role === 'child');
  if (children.length > 0) {
    const nextChildrenData = { ...(data.childrenData ?? {}) };
    // 첫 번째 아이의 데이터가 없으면 루트의 기존 데이터로 마이그레이션
    const firstChild = children[0];
    if (firstChild && !nextChildrenData[firstChild.id]) {
      nextChildrenData[firstChild.id] = {
        subjects: data.subjects,
        week: data.week,
        records: data.records,
      };
    }
    // 그 외 아이들은 독립된 빈 records {} 보장
    for (const child of children) {
      if (!nextChildrenData[child.id]) {
        nextChildrenData[child.id] = {
          subjects: data.subjects,
          week: data.week,
          records: {},
        };
      }
    }
    data.childrenData = nextChildrenData;
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
  selectChild: (childId: string) => void;
  update: (updater: (prev: AppData) => AppData, summary?: string) => void;
  updateDay: (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule, summary?: string) => void;
  copyFromChild: (sourceChildId: string) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeMember } = useParentAuth();
  const [data, setData] = useState<AppData>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 현재 변경 작업자 정보 조회
  const getUpdaterInfo = useCallback(() => {
    let member = activeMember;
    if (!member) {
      try {
        const raw = sessionStorage.getItem('study-notebook:active-member');
        if (raw) member = JSON.parse(raw);
      } catch {}
    }
    return {
      updaterId: member?.id,
      updaterName: member?.name || '가족 구성원',
    };
  }, [activeMember]);

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

  // 푸시 배너 상태
  const [pushBanner, setPushBanner] = useState<PushBannerInfo | null>(null);

  // Firestore 초기 로드가 완료되었는지 여부
  const initialFetchDoneRef = useRef(false);
  // 컴포넌트 마운트 시점 기록 (과거 업데이트에 대한 오작동 알림 원천 차단)
  const mountTimeRef = useRef<number>(Date.now());
  // 디바운스 타이머
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 본 기기에서 저장한 마지막 타임스탬프 (자신이 저장한 업데이트에는 알림 울리지 않도록 방지)
  const lastLocalSaveTimeRef = useRef<string>('');
  // 이미 알림을 처리한 업데이트 타임스탬프 (동일 업데이트 중복 알림 방지)
  const lastProcessedUpdateTimeRef = useRef<string>('');

  // 1) Firestore -> Local 동기화 (최초 로드 및 타 기기 실시간 변경 수신)
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

        if (snap.exists()) {
          const remote = sanitize(snap.data());
          const isInitial = !initialFetchDoneRef.current;
          const isWarmingUp = Date.now() - mountTimeRef.current < 5000;

          if (isInitial || isWarmingUp) {
            // 최초 로드 및 초기 5초 안정화 기간에는 기존 업데이트를 등록만 하고 알림은 절대 울리지 않음
            initialFetchDoneRef.current = true;
            if (remote.lastUpdatedBy) {
              lastProcessedUpdateTimeRef.current = remote.lastUpdatedBy.updatedAt;
            }
          } else if (remote.lastUpdatedBy) {
            // 안정화 완료 이후 타 기기/타 사용자로부터 들어온 새로운 원격 업데이트 감지
            const remoteTime = remote.lastUpdatedBy.updatedAt;
            const remoteTimeMs = new Date(remoteTime).getTime();

            const isAlreadyProcessed = remoteTime === lastProcessedUpdateTimeRef.current;
            const isFromSelf = remoteTime === lastLocalSaveTimeRef.current;
            const isPastUpdate = !isNaN(remoteTimeMs) && remoteTimeMs <= mountTimeRef.current;

            if (!isAlreadyProcessed && !isFromSelf && !isPastUpdate) {
              lastProcessedUpdateTimeRef.current = remoteTime;

              // 🔔 1. 사운드 재생 (딩-동)
              playNotificationSound();
              // 📳 2. 기기 진동
              triggerNotificationVibration();
              // 📢 3. 시스템 브라우저 푸시 알림
              showSystemNotification(`${remote.lastUpdatedBy.updaterName} 님의 업데이트`, {
                body: remote.lastUpdatedBy.summary,
              });
              // 🚀 4. 인앱 상단 플로팅 푸시 배너
              setPushBanner({
                id: 'banner-' + Date.now(),
                updaterName: remote.lastUpdatedBy.updaterName,
                summary: remote.lastUpdatedBy.summary,
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }

          setInitialLoaded(true);

          // 현재 세션에서 특정 아이를 선택하여 보고 있다면, 해당 아이의 데이터를 루트에 맞춰 렌더링
          let currentChildId: string | null = null;
          try {
            const rawActive = sessionStorage.getItem('study-notebook:active-member');
            if (rawActive) {
              const active = JSON.parse(rawActive);
              if (active?.role === 'child') {
                currentChildId = active.id;
              }
            }
          } catch {}

          if (!currentChildId) {
            currentChildId =
              sessionStorage.getItem('study-notebook:selected-child-id') ||
              selectedChildIdState ||
              (remote.familyMembers ?? []).find((m) => m.role === 'child')?.id ||
              null;
          }

          if (currentChildId && remote.childrenData?.[currentChildId]) {
            const childData = remote.childrenData[currentChildId];
            remote.subjects = childData.subjects;
            remote.week = childData.week;
            remote.records = childData.records ?? {};
          }

          setData(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        } else {
          initialFetchDoneRef.current = true;
          setInitialLoaded(true);
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

  // 배너 5초 후 자동 사라짐
  useEffect(() => {
    if (!pushBanner) return;
    const t = setTimeout(() => setPushBanner(null), 5000);
    return () => clearTimeout(t);
  }, [pushBanner]);

  // activeMember가 아이인 경우, 해당 아이의 study data로 루트를 즉시 동기화
  useEffect(() => {
    if (activeMember?.role === 'child') {
      const childId = activeMember.id;
      sessionStorage.setItem('study-notebook:selected-child-id', childId);
      setSelectedChildIdState(childId);

      setData((prev) => {
        const childData = prev.childrenData?.[childId];
        if (!childData) return prev;
        return {
          ...prev,
          subjects: childData.subjects,
          week: childData.week,
          records: childData.records ?? {},
        };
      });
    }
  }, [activeMember?.id, activeMember?.role]);

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
    (updater: (prev: AppData) => AppData, summary?: string) => {
      setData((prev) => {
        const next = updater(prev);
        const { updaterId, updaterName } = getUpdaterInfo();
        const nowIso = new Date().toISOString();
        lastLocalSaveTimeRef.current = nowIso;
        lastProcessedUpdateTimeRef.current = nowIso;

        next.lastUpdatedBy = {
          updatedAt: nowIso,
          updaterId,
          updaterName,
          summary: summary || '정보를 업데이트했습니다.',
        };

        // 만약 특정 아이가 선택된 상태라면, 해당 아이의 childrenData[activeChildId]에도 동기화
        let activeChildId = activeMember?.role === 'child' ? activeMember.id : null;
        if (!activeChildId) {
          activeChildId =
            selectedChildIdState ||
            sessionStorage.getItem('study-notebook:selected-child-id') ||
            (next.familyMembers ?? []).find((m) => m.role === 'child')?.id ||
            null;
        }

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
    [persistToCloud, selectedChildIdState, getUpdaterInfo, activeMember],
  );

  const updateDay = useCallback(
    (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule, summary?: string) => {
      setData((prev) => {
        const nextWeek = {
          ...prev.week,
          [key]: updater(prev.week[key]),
        };
        const { updaterId, updaterName } = getUpdaterInfo();
        const nowIso = new Date().toISOString();
        lastLocalSaveTimeRef.current = nowIso;
        lastProcessedUpdateTimeRef.current = nowIso;

        const next: AppData = {
          ...prev,
          week: nextWeek,
          lastUpdatedBy: {
            updatedAt: nowIso,
            updaterId,
            updaterName,
            summary: summary || '시간표 일정을 업데이트했습니다.',
          },
        };

        let activeChildId = activeMember?.role === 'child' ? activeMember.id : null;
        if (!activeChildId) {
          activeChildId =
            selectedChildIdState ||
            sessionStorage.getItem('study-notebook:selected-child-id') ||
            (next.familyMembers ?? []).find((m) => m.role === 'child')?.id ||
            null;
        }

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
    [persistToCloud, selectedChildIdState, getUpdaterInfo, activeMember],
  );

  // 대상 아이 선택 및 전환 (이전 아이 상태 자동 보존 + 새 아이 데이터 로드)
  const selectChild = useCallback(
    (targetChildId: string) => {
      const prevChildId =
        selectedChildIdState ||
        sessionStorage.getItem('study-notebook:selected-child-id') ||
        null;

      sessionStorage.setItem('study-notebook:selected-child-id', targetChildId);
      setSelectedChildIdState(targetChildId);

      setData((prev) => {
        const nextChildrenData = { ...(prev.childrenData ?? {}) };

        // 1. 현재 보고 있던 루트의 데이터를 이전 아이의 childrenData에 저장
        if (prevChildId && prevChildId !== targetChildId) {
          nextChildrenData[prevChildId] = {
            subjects: prev.subjects,
            week: prev.week,
            records: prev.records,
          };
        }

        // 2. 대상 아이의 childrenData를 루트로 승격 (없으면 빈 records)
        const targetData = nextChildrenData[targetChildId] || {
          subjects: prev.subjects,
          week: prev.week,
          records: {},
        };
        nextChildrenData[targetChildId] = targetData;

        const next: AppData = {
          ...prev,
          subjects: targetData.subjects,
          week: targetData.week,
          records: targetData.records ?? {},
          childrenData: nextChildrenData,
        };

        // UI 아이 전환은 화면 렌더링 전환이므로 클라우드를 덮어쓰지 않고 로컬에만 동기화
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [selectedChildIdState],
  );

  // 다른 아이의 과목/주간일정 정보를 현재 선택된 아이에게 복사/불러오기
  const copyFromChild = useCallback(
    (sourceChildId: string) => {
      setData((prev) => {
        const sourceData = prev.childrenData?.[sourceChildId];
        if (!sourceData) return prev;

        const activeChildId =
          selectedChildIdState ||
          sessionStorage.getItem('study-notebook:selected-child-id') ||
          (prev.familyMembers ?? []).find((m) => m.role === 'child')?.id;

        const sourceChild = (prev.familyMembers ?? []).find((m) => m.id === sourceChildId);
        const sourceName = sourceChild?.name || '아이';

        const { updaterId, updaterName } = getUpdaterInfo();
        const nowIso = new Date().toISOString();
        lastLocalSaveTimeRef.current = nowIso;
        lastProcessedUpdateTimeRef.current = nowIso;

        const next: AppData = {
          ...prev,
          subjects: JSON.parse(JSON.stringify(sourceData.subjects)),
          week: JSON.parse(JSON.stringify(sourceData.week)),
          lastUpdatedBy: {
            updatedAt: nowIso,
            updaterId,
            updaterName,
            summary: `${sourceName}의 과목/일정을 불러왔습니다.`,
          },
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
    [persistToCloud, selectedChildIdState, getUpdaterInfo],
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
        selectChild,
        update,
        updateDay,
        copyFromChild,
        reset,
      }}
    >
      <PushBanner banner={pushBanner} onDismiss={() => setPushBanner(null)} />
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
