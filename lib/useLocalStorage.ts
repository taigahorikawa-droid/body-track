// lib/useLocalStorage.ts
'use client';

import { useEffect, useState } from 'react';

export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 初回マウント時のみ localStorage から読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) {
        setValue(JSON.parse(stored));
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to read localStorage', err);
      }
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  // 値が変更されたときのみ localStorage に書き込む（初回レンダリング時はスキップ）
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to write localStorage', err);
      }
    }
  }, [key, value, isHydrated]);

  return [value, setValue] as const;
}
