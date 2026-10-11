import { useState } from 'react';
import { Heart, MessageCircle, Send, Lock } from 'lucide-react';

interface Props {
  dateLabel: string;
  isToday: boolean;
  unlocked: boolean;
  childMessage?: string;
  parentMessage?: string;
  onSaveChildMessage: (msg: string) => void;
  onSaveParentMessage: (msg: string) => void;
  onRequestParentAuth: () => void;
}

export default function DayMessageCard({
  dateLabel,
  isToday,
  unlocked,
  childMessage = '',
  parentMessage = '',
  onSaveChildMessage,
  onSaveParentMessage,
  onRequestParentAuth,
}: Props) {
  const [editingChild, setEditingChild] = useState(false);
  const [childInput, setChildInput] = useState(childMessage);

  const [editingParent, setEditingParent] = useState(false);
  const [parentInput, setParentInput] = useState(parentMessage);

  const handleSaveChild = () => {
    onSaveChildMessage(childInput.trim());
    setEditingChild(false);
  };

  const handleSaveParent = () => {
    onSaveParentMessage(parentInput.trim());
    setEditingParent(false);
  };

  return (
    <div className="paper-card mb-4 space-y-3.5 p-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="flex items-center gap-1.5 font-hand text-xl font-bold text-ink">
          <MessageCircle size={18} className="text-accent" />
          <span>오늘의 대화 우체통</span>
        </span>
        <span className="text-[11px] text-ink-muted">{dateLabel}</span>
      </div>

      {/* 1. 아이가 부모에게 남기는 한마디 */}
      <div className="rounded-2xl bg-amber-50/70 p-3 ring-1 ring-amber-200/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <span>🧒</span> 아이의 한마디 (부모님께)
          </span>
          {isToday && !editingChild && (
            <button
              type="button"
              onClick={() => {
                setChildInput(childMessage);
                setEditingChild(true);
              }}
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              {childMessage ? '수정' : '작성하기'}
            </button>
          )}
        </div>

        {editingChild ? (
          <div className="space-y-2 mt-2">
            <textarea
              className="input-note w-full resize-none h-16 text-xs bg-white"
              placeholder="엄마 아빠, 오늘 공부 열심히 했어요! 맛있는 간식 부탁해요~"
              value={childInput}
              maxLength={150}
              onChange={(e) => setChildInput(e.target.value)}
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditingChild(false)}
                className="btn-ghost !px-2.5 !py-1 text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveChild}
                className="btn-primary !px-3 !py-1 text-xs flex items-center gap-1"
              >
                <Send size={12} /> 저장
              </button>
            </div>
          </div>
        ) : (
          <p className="font-hand text-base text-ink min-h-[1.5rem] leading-relaxed">
            {childMessage ? (
              `"${childMessage}"`
            ) : (
              <span className="font-sans text-xs text-ink-soft">
                {isToday ? '부모님께 하고 싶은 말을 남겨보세요 ✏️' : '남겨진 한마디가 없어요.'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* 2. 부모가 아이에게 남기는 한마디 / 칭찬 응원 */}
      <div className="rounded-2xl bg-blue-50/70 p-3 ring-1 ring-blue-200/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Heart size={14} className="text-rose-500 fill-rose-500" /> 부모님의 응원 한마디
          </span>
          {isToday && (
            unlocked ? (
              !editingParent && (
                <button
                  type="button"
                  onClick={() => {
                    setParentInput(parentMessage);
                    setEditingParent(true);
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  {parentMessage ? '수정' : '응원 남기기'}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={onRequestParentAuth}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
              >
                <Lock size={11} /> 학부모 작성
              </button>
            )
          )}
        </div>

        {editingParent ? (
          <div className="space-y-2 mt-2">
            <textarea
              className="input-note w-full resize-none h-16 text-xs bg-white"
              placeholder="오늘도 끝까지 집중해서 해내는 모습이 정말 자랑스러워! 사랑해 ❤️"
              value={parentInput}
              maxLength={150}
              onChange={(e) => setParentInput(e.target.value)}
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditingParent(false)}
                className="btn-ghost !px-2.5 !py-1 text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveParent}
                className="btn-primary !px-3 !py-1 text-xs flex items-center gap-1"
              >
                <Send size={12} /> 저장
              </button>
            </div>
          </div>
        ) : (
          <p className="font-hand text-base text-ink min-h-[1.5rem] leading-relaxed">
            {parentMessage ? (
              `"${parentMessage}"`
            ) : (
              <span className="font-sans text-xs text-ink-soft">
                {isToday ? '아이를 위한 따뜻한 칭찬과 응원의 말을 남겨주세요 💕' : '남겨진 응원 메시지가 없어요.'}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
