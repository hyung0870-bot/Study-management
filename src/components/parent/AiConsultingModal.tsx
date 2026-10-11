import { useState } from 'react';
import { Bot, Key, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { useStore } from '../../store/StoreContext';
import { requestGeminiConsulting, GEMINI_MODEL_CHAIN } from '../../lib/gemini';
import type { AppData } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRole?: 'parent' | 'student';
}

const DEFAULT_PARENT_PROMPT =
  '너는 초등학생 학습 컨설팅 전문가야. 해당 달의 학습 상황을 분석해서, 학습이 잘 이루어지고 있는지 밸런스는 적절한지, 부족한 부분은 무엇인지 보완해줘.';

const DEFAULT_STUDENT_PROMPT =
  '선생님, 제가 지금 공부를 잘 하고 있어요?';

export default function AiConsultingModal({ open, onClose, defaultRole = 'parent' }: Props) {
  const { data, update } = useStore();
  const [role, setRole] = useState<'parent' | 'student'>(defaultRole);
  const [apiKeyInput, setApiKeyInput] = useState(() => data.geminiApiKey || '');
  const [isEditingKey, setIsEditingKey] = useState(() => !data.geminiApiKey);

  const [prompt, setPrompt] = useState(() =>
    defaultRole === 'parent' ? DEFAULT_PARENT_PROMPT : DEFAULT_STUDENT_PROMPT,
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: 'parent' | 'student') => {
    setRole(newRole);
    if (newRole === 'parent') {
      setPrompt(DEFAULT_PARENT_PROMPT);
    } else {
      setPrompt(DEFAULT_STUDENT_PROMPT);
    }
  };

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    update((prev: AppData) => ({ ...prev, geminiApiKey: trimmed }));
    setIsEditingKey(false);
  };

  const handleConsulting = async () => {
    const activeKey = data.geminiApiKey || apiKeyInput.trim();
    if (!activeKey) {
      setError('Gemini API 키를 먼저 입력해주세요.');
      setIsEditingKey(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setUsedModel(null);

    try {
      const response = await requestGeminiConsulting({
        apiKey: activeKey,
        role,
        prompt: prompt.trim(),
        appData: data,
      });

      setResult(response.text);
      setUsedModel(response.usedModel);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="🤖 AI 학습 컨설팅"
      footer={
        <div className="flex gap-2 w-full">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={loading}>
            닫기
          </button>
          <button
            type="button"
            className="btn-primary flex-2 flex items-center justify-center gap-1.5"
            onClick={handleConsulting}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>AI가 학습을 분석하는 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>컨설팅 받기</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* 1. API 키 설정 */}
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <Key size={14} className="text-accent" /> Gemini API 키
            </span>
            {data.geminiApiKey && !isEditingKey ? (
              <button
                type="button"
                onClick={() => setIsEditingKey(true)}
                className="text-xs font-bold text-accent hover:underline"
              >
                키 변경
              </button>
            ) : null}
          </div>

          {isEditingKey || !data.geminiApiKey ? (
            <div className="flex gap-1.5 mt-1">
              <input
                type="password"
                className="input-note flex-1 text-xs"
                placeholder="AI Studio에서 발급받은 API 키 입력"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                onClick={saveApiKey}
                disabled={!apiKeyInput.trim()}
                className="btn-primary !px-3 !py-1 text-xs whitespace-nowrap"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>API 키가 등록되어 있습니다 (보안 암호화 저장)</span>
            </div>
          )}

          <p className="mt-1 text-[11px] text-ink-muted">
            * 지원 모델: {GEMINI_MODEL_CHAIN.slice(0, 4).join(' → ')} 순차 자동 시도
          </p>
        </div>

        {/* 2. 학부모 / 학생 탭 선택 */}
        <div>
          <span className="mb-1.5 block text-xs font-bold text-ink-soft">컨설팅 대상 선택</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange('parent')}
              className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                role === 'parent'
                  ? 'border-accent bg-accent/10 text-accent shadow-xs'
                  : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
              }`}
            >
              👩‍🏫 학부모 전문가 모드
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                role === 'student'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                  : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50'
              }`}
            >
              🧒 학생 질문 모드
            </button>
          </div>
        </div>

        {/* 3. 프롬프트 입력창 */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft">
              {role === 'parent' ? '학부모 요청 사항 (프롬프트)' : '학생 질문 내용'}
            </span>
            <button
              type="button"
              onClick={() => setPrompt(role === 'parent' ? DEFAULT_PARENT_PROMPT : DEFAULT_STUDENT_PROMPT)}
              className="text-[11px] text-accent hover:underline"
            >
              기본값으로 되돌리기
            </button>
          </div>
          <textarea
            className="input-note w-full resize-none h-24 text-xs leading-relaxed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI에게 원하는 분석 요청이나 질문을 자유롭게 입력하세요"
          />
        </div>

        {/* 4. 에러 메시지 */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <div className="min-w-0 flex-1">{error}</div>
          </div>
        )}

        {/* 5. 컨설팅 결과 표시 */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-hand text-lg font-bold text-ink">
                <Bot size={18} className="text-accent" /> 컨설팅 답변
              </span>
              {usedModel && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                  사용된 모델: {usedModel}
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-paper p-4 font-sans text-xs leading-relaxed text-ink shadow-xs ring-1 ring-slate-200/80">
              {result}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
