/* =========================================================
 * 공부 노트 - 데이터 모델
 * 모든 데이터는 LocalStorage 에 AppData 형태로 저장됩니다.
 * ========================================================= */

/** 'HH:MM' 24시간 형식 문자열 */
export type HHMM = string;

/** 날짜 키 'YYYY-MM-DD' */
export type DateKey = string;

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** [A] 학습 항목(과목) */
export interface Subject {
  id: string;
  name: string;
  color: string; // hex
}

/** [B] 요일별 학습 계획 1건 - 시작/끝 시간이 원형 시간표에 그대로 반영됨 */
export interface StudyPlanItem {
  id: string;
  subjectId: string;
  amount: string; // 학습 분량 (예: "3페이지", "1단원")
  start: HHMM;
  end: HHMM; // 목표 학습 시간 = end - start
}

export interface TimeRange {
  start: HHMM;
  end: HHMM;
}

export interface NamedTimeRange extends TimeRange {
  id: string;
  name: string;
}

/** [B] 요일별 고정 일정 + 학습 계획 */
export interface DaySchedule {
  school: TimeRange | null; // 등교 ~ 하교
  academies: NamedTimeRange[]; // 학원 (여러 개)
  sleep: TimeRange | null; // 취침 ~ 기상 (자정을 넘길 수 있음)
  etc: NamedTimeRange[]; // 기타 일정
  studies: StudyPlanItem[]; // 학습 계획
}

/** [C/E] 특정 날짜의 체크리스트 기록 (스냅샷 - 계획이 바뀌어도 과거 기록 보존) */
export interface DailyRecordItem {
  planId: string;
  subjectId: string;
  subjectName: string;
  color: string;
  amount: string;
  start: HHMM;
  end: HHMM;
  minutes: number;
  done: boolean;
  doneAt?: string; // ISO
}

export interface DailyRecord {
  date: DateKey;
  items: DailyRecordItem[];
}

export interface AppData {
  version: 1;
  subjects: Subject[];
  week: Record<WeekdayKey, DaySchedule>;
  records: Record<DateKey, DailyRecord>;
  parentPin: string;
}
