/* =========================================================
 * 공부 노트 - 데이터 모델
 * 모든 데이터는 LocalStorage 에 AppData 형태로 저장됩니다.
 * ========================================================= */

/** 'HH:MM' 24시간 형식 문자열 */
export type HHMM = string;

/** 날짜 키 'YYYY-MM-DD' */
export type DateKey = string;

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** [A] 학습 항목(활동 - 예: 쎈수학, 디딤돌, 리딩튜터) */
export interface Subject {
  id: string;
  name: string; // 활동 이름 (구 과목이름)
  category?: string; // 과목 (예: 수학, 국어, 영어, 과학 등)
  color: string; // hex
  isSpecial?: boolean; // 특별 미션 여부 (과목관리에서 특별 미션으로 categorize)
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
  subjectName: string; // 활동 이름
  category?: string; // 과목 (수학, 영어 등)
  color: string;
  amount: string;
  start: HHMM;
  end: HHMM;
  minutes: number;
  done: boolean;
  doneAt?: string; // ISO
  isSpecial?: boolean; // 특별 미션 여부
}

export interface DailyRecord {
  date: DateKey;
  items: DailyRecordItem[];
  childMessage?: string; // 아이가 부모에게 남기는 한마디
  parentMessage?: string; // 부모가 아이에게 남기는 한마디 / 응원 메시지
}

export type FamilyRole = 'parent' | 'child';

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  pin: string; // 4자리 숫자 PIN
  avatar?: string;
  createdAt?: string;
}

/** 아이별 독립된 학습 데이터 (과목, 주간계획, 매일기록) */
export interface ChildStudyData {
  subjects: Subject[];
  week: Record<WeekdayKey, DaySchedule>;
  records: Record<DateKey, DailyRecord>;
}

export type CalendarEventType = 'birthday' | 'trip' | 'anniversary' | 'other';

export type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'yearly';
export type CalendarDateType = 'solar' | 'lunar';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: DateKey; // 'YYYY-MM-DD'
  endDate?: DateKey; // 'YYYY-MM-DD' (여행 등 기간 일정)
  memo?: string;
  createdById?: string; // 등록한 가족 구성원 ID 또는 이름
  createdByName?: string;
  createdAt: string; // ISO

  /** 양력(solar) or 음력(lunar) */
  calendarType?: CalendarDateType;
  /** 음력인 경우 저장되는 음력 월/일 (예: lunarMonth: 8, lunarDay: 15, isLeapMonth?: false) */
  lunarMonth?: number;
  lunarDay?: number;
  isLeapMonth?: boolean;

  /** 반복 유형: 'none' | 'weekly' | 'monthly' | 'yearly' */
  recurrence?: RecurrenceType;
}


export interface UpdateMetadata {
  updatedAt: string; // ISO
  updaterId?: string;
  updaterName: string;
  summary: string;
}

/** [F] 상점 / 벌점 규칙 항목 */
export interface PointRule {
  id: string;
  title: string;
  type: 'bonus' | 'penalty'; // 'bonus': 상점 (+), 'penalty': 벌점 (-)
  points: number; // 점수 크기 (양수 값, 예: 5)
  category?: string; // 분류 (예: 생활습관, 독서, 예절 등)
}

/** [G] 보상/상품 구매 항목 */
export interface RewardItem {
  id: string;
  title: string;
  price: number; // 필요 상점 (점수)
  description?: string;
}

/** [H] 상점/벌점 부여 및 사용(구매) 기록 */
export interface PointLog {
  id: string;
  date: DateKey; // 'YYYY-MM-DD'
  timestamp: string; // ISO string
  type: 'bonus' | 'penalty' | 'reward_purchase';
  title: string; // 항목명
  points: number; // 실제 가감 점수: bonus(+N), penalty(-N), reward_purchase(-N)
  giverName?: string; // 부여한 사람 (예: 부모님)
  childId?: string; // 대상 아이 ID
  /** 부모와 합의하여 취소된 내역인지 여부 */
  cancelled?: boolean;
  cancelledAt?: string; // 취소된 ISO 시각
  cancelledReason?: string; // 취소 사유
}

/** [I] 아이의 상점 요청 항목 */
export interface PointRequest {
  id: string;
  date: DateKey;
  timestamp: string;
  ruleId: string;
  ruleTitle: string;
  points: number;
  childId: string;
  childName: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string;
}

export interface AppData {
  version: 1;
  subjects: Subject[];
  week: Record<WeekdayKey, DaySchedule>;
  records: Record<DateKey, DailyRecord>;
  parentPin: string;
  geminiApiKey?: string;
  familyMembers?: FamilyMember[];
  calendarEvents?: CalendarEvent[];
  /** 아이(FamilyMember.id)별 독립된 학습 데이터 저장소 */
  childrenData?: Record<string, ChildStudyData>;
  /** 상점 / 벌점 규칙 항목 목록 */
  pointRules?: PointRule[];
  /** 구매 가능한 보상 목록 */
  rewardItems?: RewardItem[];
  /** 상점/벌점 부여 및 구매 내역 로그 (아이별 or 공통) */
  pointLogs?: PointLog[];
  /** 아이의 상점 요청 목록 */
  pointRequests?: PointRequest[];
  /** 타 기기 실시간 업데이트 감지용 메타데이터 */
  lastUpdatedBy?: UpdateMetadata;
}




