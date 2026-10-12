import { useState, useEffect } from 'react';
import { Delete, ArrowLeft, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useParentAuth } from '../../store/ParentAuth';
import type { FamilyMember } from '../../types';
import { unlockAudio, requestSystemNotificationPermission } from '../../lib/sound';

interface Props {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function MemberSelectModal({ members, onSelectMember }: Props) {
  const { user, logout } = useAuth();
  const { lock } = useParentAuth();
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // 구성원이 없으면 기본 구성원 리스트 표시 대비
  const displayMembers =
    members.length > 0
      ? members
      : [
          {
            id: 'member-parent-default',
            name: '부모님',
            role: 'parent' as const,
            pin: '0000',
            avatar: '👨‍👩‍👧',
          },
          {
            id: 'member-child-default',
            name: '아이',
            role: 'child' as const,
            pin: '1234',
            avatar: '🎒',
          },
        ];

  const press = (k: string) => {
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    setError(false);
    setPin((p) => p + k);
  };

  useEffect(() => {
    if (!selectedMember || pin.length !== 4) return;

    if (pin === selectedMember.pin) {
      unlockAudio();
      requestSystemNotificationPermission().catch(() => {});
      onSelectMember(selectedMember);
    } else {
      setError(true);
      const t = setTimeout(() => setPin(''), 450);
      return () => clearTimeout(t);
    }
  }, [pin, selectedMember, onSelectMember]);

  // 키보드 숫자 입력 지원 (PC 환경)
  useEffect(() => {
    if (!selectedMember) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedMember]);

  const handleSelect = (member: FamilyMember) => {
    setSelectedMember(member);
    setPin('');
    setError(false);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-paper">
      <div className="paper-card animate-pop w-full max-w-[390px] p-6 shadow-paper">
        {!selectedMember ? (
          /* 1단계: 가족 구성원 선택 화면 */
          <div className="space-y-5 text-center">
            <div>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-3xl shadow-soft">
                👨‍👩‍👧‍👦
              </div>
              <h2 className="font-hand text-3xl font-bold text-ink">누가 사용하나요?</h2>
              <p className="mt-1 text-xs text-ink-soft">
                본인의 프로필을 누르고 4자리 PIN 번호를 입력해 주세요
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {displayMembers.map((m) => {
                const isParent = m.role === 'parent';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m)}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3.5 transition-all active:scale-95 ${
                      isParent
                        ? 'border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 text-ink'
                        : 'border-slate-100 bg-white hover:bg-slate-50 text-ink'
                    }`}
                  >
                    <span className="text-4xl mb-2">{m.avatar || (isParent ? '👨‍👩‍👧' : '🎒')}</span>
                    <span className="font-bold text-sm truncate max-w-full">{m.name}</span>
                    <span
                      className={`mt-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isParent ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isParent ? (
                        <>
                          <Shield size={10} />
                          <span>부모</span>
                        </>
                      ) : (
                        <>
                          <User size={10} />
                          <span>아이</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs text-ink-soft">
              <span className="truncate max-w-[200px]">계정: {user?.email}</span>
              <button
                type="button"
                onClick={() => {
                  lock();
                  logout();
                }}
                className="flex items-center gap-1 text-rose-500 hover:underline font-bold"
              >
                <LogOut size={13} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        ) : (
          /* 2단계: PIN 4자리 번호 입력 화면 */
          <div className="animate-pop flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-3xl">
                {selectedMember.avatar || (selectedMember.role === 'parent' ? '👨‍👩‍👧' : '🎒')}
              </span>
              <div className="text-left">
                <h3 className="font-hand text-2xl font-bold text-ink leading-tight">
                  {selectedMember.name}
                </h3>
                <span
                  className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 ${
                    selectedMember.role === 'parent'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedMember.role === 'parent' ? '부모 모드' : '아이 모드'}
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-soft">PIN 번호 4자리를 입력해 주세요</p>

            <div className={`my-5 flex gap-3 ${error ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    error
                      ? 'border-rose-400 bg-rose-400'
                      : i < pin.length
                        ? selectedMember.role === 'parent'
                          ? 'scale-110 border-indigo-600 bg-indigo-600'
                          : 'scale-110 border-accent bg-accent'
                        : 'border-slate-300 bg-white'
                  }`}
                />
              ))}
            </div>

            <p className={`-mt-3 mb-3 h-4 text-xs text-rose-500 ${error ? 'visible' : 'invisible'}`}>
              비밀번호가 맞지 않아요
            </p>

            <div className="grid w-full max-w-[260px] grid-cols-3 gap-2.5">
              {KEYS.map((k, i) =>
                k === '' ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={k === 'del' ? '지우기' : k}
                    className="paper-card flex h-14 items-center justify-center font-hand text-2xl font-bold transition active:scale-95 active:bg-slate-50"
                  >
                    {k === 'del' ? <Delete size={20} className="text-ink-soft" /> : k}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedMember(null);
                setPin('');
              }}
              className="mt-5 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-slate-100 transition active:scale-95"
            >
              <ArrowLeft size={13} />
              <span>다른 구성원 선택하기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
