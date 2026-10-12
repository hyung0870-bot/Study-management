import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Shield, User, KeyRound, Sparkles } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { Field } from '../ui/Inputs';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { FamilyMember, FamilyRole } from '../../types';


interface Props {
  members: FamilyMember[];
  onAddMember: (member: Omit<FamilyMember, 'id' | 'createdAt'>) => void;
  onUpdateMember: (id: string, updates: Partial<FamilyMember>) => void;
  onDeleteMember: (id: string) => void;
}

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍👩‍👧', '👨‍🦰', '👩‍🦰', '👦', '👧', '🎒', '⭐', '🌟', '🐻', '🐰'];

export default function FamilyMemberList({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<FamilyRole>('child');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState('👦');
  const [error, setError] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingMember(null);
    setName('');
    setRole('child');
    setPin('');
    setAvatar('👦');
    setError('');
    setSheetOpen(true);
  };

  const openEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setName(member.name);
    setRole(member.role);
    setPin(member.pin);
    setAvatar(member.avatar || (member.role === 'parent' ? '👨‍👩‍👧' : '👦'));
    setError('');
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('이름을 입력해 주세요');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN 코드는 숫자 4자리여야 해요');
      return;
    }

    if (editingMember) {
      onUpdateMember(editingMember.id, {
        name: trimmedName,
        role,
        pin,
        avatar,
      });
    } else {
      onAddMember({
        name: trimmedName,
        role,
        pin,
        avatar,
      });
    }
    setSheetOpen(false);
  };

  const memberToDelete = members.find((m) => m.id === deletingId);

  return (
    <div className="paper-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="font-hand text-xl font-bold text-ink flex items-center gap-1.5">
            <span>👨‍👩‍👧‍👦</span>
            <span>가족 구성원 관리</span>
          </h3>
          <p className="text-[11px] text-ink-soft">
            부모/아이 역할 및 각자의 4자리 PIN 코드를 설정합니다
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <UserPlus size={14} />
          <span>구성원 추가</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {members.map((m) => {
          const isParent = m.role === 'parent';
          return (
            <div
              key={m.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isParent
                  ? 'border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50/80'
                  : 'border-slate-100 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs text-2xl ring-1 ring-slate-100">
                  {m.avatar || (isParent ? '👨‍👩‍👧' : '🎒')}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-ink truncate">{m.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isParent
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isParent ? '부모 (전체 권한)' : '아이 (학습 권한)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-soft">
                    <span className="flex items-center gap-0.5">
                      <KeyRound size={11} className="text-slate-400" />
                      <span>PIN: •••• ({m.pin})</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="rounded-lg p-1.5 text-ink-soft hover:bg-white hover:text-ink transition"
                  title="수정"
                >
                  <Pencil size={15} />
                </button>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeletingId(m.id)}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    title="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-ink-soft space-y-1">
        <p className="flex items-center gap-1 font-bold text-ink">
          <Sparkles size={12} className="text-amber-500" /> 역할별 권한 안내
        </p>
        <p>• <b>부모</b>: 주간 계획 생성/수정, 과목 관리, 특별 미션 등록, 가족 구성원 등록, 가족 달력 등록/확인</p>
        <p>• <b>아이</b>: 오늘 할 일 체크, 원형 시간표 확인, 대화 우체통 작성, 가족 달력 일정 등록/확인</p>
      </div>

      {/* 구성원 추가/수정 Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingMember ? '가족 구성원 정보 수정' : '새 가족 구성원 등록'}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              className="btn-ghost flex-1 font-bold"
              onClick={() => setSheetOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="btn-primary flex-1 !bg-indigo-600 hover:!bg-indigo-700"
              onClick={handleSubmit}
            >
              {editingMember ? '저장하기' : '등록하기'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {/* 역할 선택 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">역할 구분</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('parent');
                  if (!avatar || avatar === '👦') setAvatar('👨‍👩‍👧');
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
                  role === 'parent'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
                }`}
              >
                <Shield size={16} />
                <span>부모 (관리 권한)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('child');
                  if (!avatar || avatar === '👨‍👩‍👧') setAvatar('👦');
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
                  role === 'child'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-100 bg-slate-50 text-ink-soft hover:bg-slate-100'
                }`}
              >
                <User size={16} />
                <span>아이 (학습 권한)</span>
              </button>
            </div>
          </div>

          {/* 아이콘 선택 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">캐릭터/아이콘</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setAvatar(ico)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                    avatar === ico
                      ? 'scale-110 bg-indigo-100 ring-2 ring-indigo-600'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <Field label="이름 (호칭)">
            <input
              type="text"
              className="input-note"
              placeholder="예: 엄마, 아빠, 민수, 서연"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          {/* PIN 코드 4자리 */}
          <Field label="PIN 코드 (숫자 4자리)" hint="각 구성원 고유 비밀번호">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input-note text-center font-hand text-2xl tracking-widest"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          {error && (
            <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          )}
        </div>
      </Sheet>

      {/* 삭제 확인 Dialog */}
      <ConfirmDialog
        open={!!deletingId}
        title="가족 구성원 삭제"
        message={`'${memberToDelete?.name}' 님을 가족 구성원에서 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          if (deletingId) onDeleteMember(deletingId);
          setDeletingId(null);
        }}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
