import type { AppData } from '../types';

/**
 * Gemini 모델 체인 (상위 모델 -> 하위 모델 순차 시도)
 * Gemini 3.8 / 3.5 / 2.5 우선순위 지원
 */
export const GEMINI_MODEL_CHAIN = [
  'gemini-3.8-pro',
  'gemini-3.5-pro',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

export interface ConsultingRequest {
  apiKey: string;
  role: 'parent' | 'student';
  prompt: string;
  appData: AppData;
  targetMonth?: { year: number; month: number }; // 0-indexed month
}

export interface ConsultingResponse {
  usedModel: string;
  text: string;
  attempts: { model: string; error?: string }[];
}

/**
 * 학습 상황 요약 텍스트 생성 (AI 프롬프트의 컨텍스트로 전달)
 */
function buildStudySummary(appData: AppData, targetYear?: number, targetMonth?: number): string {
  const now = new Date();
  const y = targetYear ?? now.getFullYear();
  const m = targetMonth ?? now.getMonth();

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = `${y}년 ${m + 1}월`;

  let totalPlannedMissions = 0;
  let totalDoneMissions = 0;
  const categoryDoneStats: Record<string, { doneMin: number; totalMin: number }> = {};
  const specialMissionsList: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = appData.records[dStr];
    if (rec && rec.items.length > 0) {
      for (const it of rec.items) {
        totalPlannedMissions++;
        const cat = it.category || '기타';
        if (!categoryDoneStats[cat]) {
          categoryDoneStats[cat] = { doneMin: 0, totalMin: 0 };
        }
        categoryDoneStats[cat].totalMin += it.minutes;

        if (it.done) {
          totalDoneMissions++;
          categoryDoneStats[cat].doneMin += it.minutes;
        }

        if (it.isSpecial) {
          specialMissionsList.push(
            `[${dStr}] ${it.subjectName} (${cat}, ${it.minutes}분) - ${it.done ? '완료' : '미완료'}`,
          );
        }
      }
    }
    if (rec?.childMessage || rec?.parentMessage) {
      const parts = [];
      if (rec.childMessage) parts.push(`아이: "${rec.childMessage}"`);
      if (rec.parentMessage) parts.push(`부모: "${rec.parentMessage}"`);
      specialMissionsList.push(`[${dStr} 대화] ${parts.join(' | ')}`);
    }
  }

  const registeredSubjects = appData.subjects
    .map((s) => `- ${s.name} (과목: ${s.category || '미지정'}, 색상: ${s.color}, 구분: ${s.isSpecial ? '특별' : '일반'})`)
    .join('\n');

  const catSummary = Object.entries(categoryDoneStats)
    .map(
      ([cat, info]) =>
        `- ${cat}: 총 목표 ${info.totalMin}분 중 ${info.doneMin}분 달성 (달성률 ${info.totalMin ? Math.round((info.doneMin / info.totalMin) * 100) : 0}%)`,
    )
    .join('\n');

  return `
[분석 대상 기간: ${monthLabel}]
1. 등록된 활동/과목 목록:
${registeredSubjects || '등록된 활동 없음'}

2. 이 달의 학습 달성 통계:
- 총 계획된 미션 수: ${totalPlannedMissions}개
- 완료된 미션 수: ${totalDoneMissions}개
- 전체 미션 완료율: ${totalPlannedMissions ? Math.round((totalDoneMissions / totalPlannedMissions) * 100) : 0}%

3. 과목별 학습 시간 및 달성 현황:
${catSummary || '해당 월의 기록 없음'}

4. 특별 미션 및 가족 대화 기록:
${specialMissionsList.length ? specialMissionsList.join('\n') : '기록 없음'}
`.trim();
}

/**
 * Google Gemini API 순차 호출 (Fallback 체인)
 */
export async function requestGeminiConsulting(req: ConsultingRequest): Promise<ConsultingResponse> {
  const { apiKey, role, prompt, appData, targetMonth } = req;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API Key가 등록되지 않았습니다. API 키를 먼저 입력해주세요.');
  }

  const studyContext = buildStudySummary(appData, targetMonth?.year, targetMonth?.month);

  const systemInstruction =
    role === 'parent'
      ? `당신은 대한민국 초등학생 학습 및 자기주도학습 전문 컨설턴트입니다.
학부모님에게 학생의 이번 달 학습 데이터(과목별 학습 시간, 완료율, 특별 미션 수행 내역)를 다정하고 전문적으로 분석해 드립니다.
칭찬할 부분, 과목 간 시간 배분의 밸런스(예: 수학에 치우쳤거나 독서/영어 부족 등), 미완료 부분의 보완 제안 및 동기부여 방안을 알기 쉽게 3~4가지 핵심 포인트로 구조화하여 설명해주세요.`
      : `당신은 초등학생을 지도하는 친절하고 따뜻한 학습 멘토 선생님입니다.
초등학생 눈높이에 맞추어 친절하고 다정한 존댓말로 학생의 학습 상황을 칭찬해주고 용기를 북돋워주세요.
부족한 점이 있더라도 격려하며 앞으로 한 걸음씩 어떻게 해보면 좋을지 친근하게 조언해주세요.`;

  const finalUserContent = `
${studyContext}

[사용자 요청 질문]:
${prompt}
`.trim();

  const attempts: { model: string; error?: string }[] = [];

  for (const model of GEMINI_MODEL_CHAIN) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${finalUserContent}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${res.status}`;
        attempts.push({ model, error: errorMsg });
        console.warn(`[Gemini Fallback] Model ${model} failed: ${errorMsg}. Trying next model...`);
        continue; // 하위 모델로 Fallback 시도
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        attempts.push({ model, error: 'Empty response candidate' });
        continue;
      }

      return {
        usedModel: model,
        text,
        attempts,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      attempts.push({ model, error: errMsg });
      console.warn(`[Gemini Fallback] Error with ${model}: ${errMsg}`);
    }
  }

  const detail = attempts.map((a) => `${a.model} (${a.error})`).join(', ');
  throw new Error(`모든 Gemini 모델 호출에 실패했습니다. API 키 및 할당량을 확인해주세요. [시도 내역: ${detail}]`);
}
