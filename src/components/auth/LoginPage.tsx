import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { NotebookPen, KeyRound, Mail, Sparkles } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { Field } from '../ui/Inputs';

export default function LoginPage() {
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const em = email.trim();
    if (!em || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자리 이상이어야 해요');
      return;
    }

    setLoading(true);
    try {
      sessionStorage.setItem('study-notebook:entry-role', role);
      if (role === 'student') {
        sessionStorage.removeItem('study-notebook:parent-unlocked');
      }

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, em, password);
      } else {
        await signInWithEmailAndPassword(auth, em, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('이메일이나 비밀번호가 맞지 않아요');
      } else if (code === 'auth/email-already-in-use') {
        setError('이미 가입된 이메일이에요. 로그인해 주세요');
      } else if (code === 'auth/invalid-email') {
        setError('올바른 이메일 형식이 아니에요');
      } else if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setError('Firebase 콘솔에서 Authentication 시작 및 이메일/비밀번호 로그인을 활성화해 주세요');
      } else {
        setError(`로그인 중 문제가 생겼어요 (${code || '오류'}). 다시 시도해 주세요`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-5">
      <div className="paper-card animate-pop w-full max-w-[390px] p-6 shadow-paper">
        {/* 로고 */}
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <NotebookPen size={30} />
          </span>
          <h1 className="font-hand text-3xl font-bold">공부 노트</h1>
          <p className="mt-1 text-xs text-ink-soft">
            한 번 로그인하면 다음부터는 바로 열려요
          </p>
        </div>

        {/* 1. 모드 선택: 학생 모드 / 학부모 모드 */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-bold text-ink-soft">접속 모드 선택</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2.5 text-center transition-all ${
                role === 'student'
                  ? 'border-accent bg-accent/10 shadow-sm text-ink'
                  : 'border-slate-100 bg-slate-50/70 text-ink-soft hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl mb-0.5">🎒</span>
              <span className="text-xs font-bold">학생 모드</span>
              <span className="text-[10px] text-ink-soft">오늘 공부 & 시간표</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2.5 text-center transition-all ${
                role === 'parent'
                  ? 'border-indigo-500 bg-indigo-50/80 shadow-sm text-ink'
                  : 'border-slate-100 bg-slate-50/70 text-ink-soft hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl mb-0.5">👨‍👩‍👧</span>
              <span className="text-xs font-bold">학부모 모드</span>
              <span className="text-[10px] text-ink-soft">학습 현황 & 계획 관리</span>
            </button>
          </div>
        </div>

        {/* 2. 탭: 로그인 / 회원가입 */}
        <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            처음이에요 (회원가입)
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <Field label="이메일 (ID)">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-ink-soft/60" />
              <input
                type="email"
                autoComplete="email"
                className="input-note !pl-9"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Field>

          <Field label="비밀번호" hint="6자리 이상">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-ink-soft/60" />
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="input-note !pl-9"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </Field>

          {error && (
            <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full transition-all ${
              role === 'parent' ? '!bg-indigo-600 hover:!bg-indigo-700' : ''
            }`}
          >
            {loading
              ? '확인하는 중...'
              : mode === 'login'
                ? role === 'student'
                  ? '🎒 학생 모드로 로그인하기'
                  : '👨‍👩‍👧 학부모 모드로 로그인하기'
                : role === 'student'
                  ? '🎒 학생 모드로 시작하기'
                  : '👨‍👩‍👧 학부모 모드로 시작하기'}
          </button>

          {role === 'parent' && (
            <p className="text-center text-[11px] text-indigo-600 font-medium">
              🔒 학부모 모드로 접속 시 확인용 PIN 입력 화면으로 연결돼요
            </p>
          )}
        </form>

        <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-center">
          <p className="flex items-center justify-center gap-1 text-[11px] text-ink-soft">
            <Sparkles size={12} className="text-accent" />
            아이와 부모님이 같은 계정으로 로그인해 모드를 선택할 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
