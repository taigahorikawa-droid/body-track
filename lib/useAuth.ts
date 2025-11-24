// lib/useAuth.ts
'use client';

import { useEffect, useState } from 'react';

// 環境変数でSupabaseを使用するかどうかを切り替え
const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

type AuthUser = { id: string; email: string };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let mounted = true;

    async function initAuth() {
      try {
        // デバッグ用ログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth init - useSupabase:', useSupabase);
        }

        if (useSupabase) {
          // Supabaseを使用する場合
          const { getCurrentUser, onAuthStateChange } = await import('./supabase/auth');
          
          // 初回ロード
          const currentUser = await getCurrentUser();
          if (mounted) {
            // SupabaseのUser型をAuthUser型に変換
            setUser(currentUser ? {
              id: currentUser.id,
              email: currentUser.email || '',
            } : null);
            setIsLoading(false);
          }

          // 認証状態の変更を監視
          const result = onAuthStateChange((user) => {
            if (mounted) {
              // SupabaseのUser型をAuthUser型に変換
              setUser(user ? {
                id: user.id,
                email: user.email || '',
              } : null);
              setIsLoading(false);
            }
          });
          subscription = result.subscription;
        } else {
          // localStorageを使用する場合
          if (process.env.NODE_ENV === 'development') {
            console.log('Using localStorage auth');
          }

          const { getCurrentUser, onAuthStateChange } = await import('./auth/localStorageAuth');
          
          // 初回ロード
          const currentUser = await getCurrentUser();
          if (process.env.NODE_ENV === 'development') {
            console.log('Current user from localStorage:', currentUser);
          }

          if (mounted) {
            setUser(currentUser);
            setIsLoading(false);
          }

          // 認証状態の変更を監視
          const result = onAuthStateChange((user) => {
            if (mounted) {
              setUser(user);
              setIsLoading(false);
            }
          });
          subscription = result.subscription;
        }
      } catch (err) {
        console.error('Auth initialization error', err);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    // タイムアウトを設定（5秒後に強制的にローディングを解除）
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout');
        setIsLoading(false);
      }
    }, 5000);

    initAuth().finally(() => {
      clearTimeout(timeout);
    });

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      if (useSupabase) {
        const { signOut: supabaseSignOut } = await import('./supabase/auth');
        await supabaseSignOut();
      } else {
        const { signOut: localStorageSignOut } = await import('./auth/localStorageAuth');
        await localStorageSignOut();
      }
      setUser(null);
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  return {
    user,
    isLoading,
    signOut,
    isAuthenticated: !!user,
  };
}

