// components/AuthForm.tsx
'use client';

import { FormEvent, useState } from 'react';

// 環境変数でSupabaseを使用するかどうかを切り替え
const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

type AuthMode = 'signin' | 'signup';

type Props = {
  onSuccess: () => void;
};

export const AuthForm = ({ onSuccess }: Props) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (useSupabase) {
        // Supabaseを使用する場合
        const { signUp, signIn } = await import('@/lib/supabase/auth');
        
        if (mode === 'signup') {
          await signUp(email, password);
          onSuccess();
        } else {
          await signIn(email, password);
          onSuccess();
        }
      } else {
        // localStorageを使用する場合
        const { signUp, signIn } = await import('@/lib/auth/localStorageAuth');
        
        if (mode === 'signup') {
          await signUp(email, password);
          onSuccess();
        } else {
          await signIn(email, password);
          onSuccess();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h2 className="text-xl font-normal text-gray-900 mb-6">
            {mode === 'signin' ? 'ログイン' : '新規登録'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="••••••••"
                minLength={6}
              />
              {mode === 'signup' && (
                <p className="text-[10px] text-gray-400 mt-1">
                  パスワードは6文字以上で入力してください
                </p>
              )}
            </div>

            {error && (
              <div className="card p-4 border-l-4 border-l-red-500">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? '処理中...' : mode === 'signin' ? 'ログイン' : '新規登録'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {mode === 'signin' ? '新規登録はこちら' : 'ログインはこちら'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

