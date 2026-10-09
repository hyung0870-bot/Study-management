import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppData, DaySchedule, WeekdayKey } from '../types';

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

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw) as AppData;
    // 누락 필드 보정 (향후 버전 확장 대비)
    const base = createDefaultData();
    const data: AppData = { ...base, ...parsed, week: { ...base.week, ...parsed.week } };
    for (const key of Object.keys(data.week) as WeekdayKey[]) {
      const d = { ...emptyDay(), ...data.week[key] };
      d.studies = (d.studies ?? []).map((s) => ({ ...s, start: s.start ?? '16:00', end: s.end ?? '16:30' }));
      data.week[key] = d;
    }
    return data;
  } catch {
    return createDefaultData();
  }
}

interface StoreValue {
  data: AppData;
  update: (updater: (prev: AppData) => AppData) => void;
  updateDay: (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = useCallback((updater: (prev: AppData) => AppData) => setData(updater), []);
  const updateDay = useCallback(
    (key: WeekdayKey, updater: (prev: DaySchedule) => DaySchedule) =>
      setData((prev) => ({ ...prev, week: { ...prev.week, [key]: updater(prev.week[key]) } })),
    [],
  );
  const reset = useCallback(() => setData(createDefaultData()), []);

  return <StoreContext.Provider value={{ data, update, updateDay, reset }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
