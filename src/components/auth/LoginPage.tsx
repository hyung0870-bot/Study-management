import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { NotebookPen, KeyRound, Mail, Sparkles } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { Field } from '../ui/Inputs';

export default function LoginPage() {
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
      } else if (code === 'auth/operation-not-allowed') {
        setError('Firebase 콘솔에서 Email/Password 인증을 켜 주세요');
      } else {
        setError('로그인 중 문제가 생겼어요. 다시 시도해 주세요');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-5">
      <div className="paper-card animate-pop w-full max-w-[380px] p-6 shadow-paper">
        {/* 로고 */}
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <NotebookPen size={30} />
          </span>
          <h1 className="font-hand text-3xl font-bold">공부 노트</h1>
          <p className="mt-1 text-xs text-ink-soft">
            한 번 로그인하면 다음부터는 바로 열려요
          </p>
        </div>

        {/* 탭: 로그인 / 회원가입 */}
        <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
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

        <form onSubmit={submit} className="space-y-4">
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

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '확인하는 중...' : mode === 'login' ? '로그인하기' : '가입하고 시작하기'}
          </button>
        </form>

        <div className="mt-5 border-t border-dashed border-slate-200 pt-4 text-center">
          <p className="flex items-center justify-center gap-1 text-[11px] text-ink-soft">
            <Sparkles size={12} className="text-accent" />
            아이 폰과 부모님 폰에서 같은 아이디로 로그인해요
          </p>
        </div>
      </div>
    </div>
  );
}
