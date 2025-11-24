// lib/auth/localStorageAuth.ts
'use client';

export interface AuthUser {
  id: string;
  email: string;
}

const AUTH_KEY = 'body-track-auth';

export async function signUp(email: string, password: string): Promise<{ user: AuthUser }> {
  if (typeof window === 'undefined') {
    throw new Error('ブラウザ環境でのみ利用可能です');
  }

  // 簡易的な実装：既存ユーザーをチェック
  const existing = localStorage.getItem(AUTH_KEY);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (parsed.email === email) {
      throw new Error('このメールアドレスは既に登録されています');
    }
  }

  // 新しいユーザーを作成
  const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const user: AuthUser = {
    id: userId,
    email,
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, password }));
  return { user };
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser }> {
  if (typeof window === 'undefined') {
    throw new Error('ブラウザ環境でのみ利用可能です');
  }

  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  const parsed = JSON.parse(stored);
  if (parsed.email !== email || parsed.password !== password) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  return { user: parsed.user };
}

export async function signOut(): Promise<void> {
  // localStorageモードではセッション管理のみ
  // データは削除しない
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return parsed.user || null;
  } catch (err) {
    console.error('Failed to get current user from localStorage', err);
    return null;
  }
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (typeof window === 'undefined') {
    // サーバーサイドでは何もしない
    return {
      subscription: {
        unsubscribe: () => {},
      },
    };
  }

  // localStorageモードでは簡易実装
  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      callback(user);
    } catch (err) {
      console.error('Auth state check error', err);
      callback(null);
    }
  };

  // 初回チェック
  checkAuth();

  // ストレージ変更を監視（簡易実装）
  const interval = setInterval(checkAuth, 1000);

  return {
    subscription: {
      unsubscribe: () => {
        if (interval) {
          clearInterval(interval);
        }
      },
    },
  };
}

