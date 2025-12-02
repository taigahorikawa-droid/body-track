// lib/useDataStorage.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataStorage } from './data/storage';
import { LocalStorageStorage } from './data/localStorageStorage';
import { InitialSettings, DailyEntry } from '@/types';

// 環境変数でSupabaseを使用するかどうかを切り替え
// ※確実にSupabase側へ保存されることを確認するため、いったん強制的にtrueにしています。
//   問題なく動作することが確認できたら、元の1行に戻して .env.local のフラグで切り替える形でもOKです。
const useSupabase = true;

// ストレージインスタンスを取得する関数
async function getStorage(): Promise<DataStorage> {
  if (useSupabase) {
    // Supabaseを使用する場合のみ動的インポート
    const { SupabaseStorage } = await import('./data/supabaseStorage');
    return new SupabaseStorage();
  } else {
    // localStorageを使用
    return new LocalStorageStorage();
  }
}

// ストレージインスタンス（初期化は初回使用時）
let storageInstance: DataStorage | null = null;

export function useDataStorage(userId: string | null) {
  const [settings, setSettings] = useState<InitialSettings | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setSettings(null);
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ストレージインスタンスを取得（初回のみ初期化）
      if (!storageInstance) {
        storageInstance = await getStorage();
      }

      const [loadedSettings, loadedEntries] = await Promise.all([
        storageInstance.getSettings(userId),
        storageInstance.getEntries(userId),
      ]);
      setSettings(loadedSettings);
      setEntries(loadedEntries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'データの読み込みに失敗しました';
      setError(message);
      console.error('Failed to load data', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = useCallback(async (newSettings: InitialSettings) => {
    if (!userId) {
      throw new Error('番号の入力が必要です');
    }

    try {
      // ストレージインスタンスを取得（初回のみ初期化）
      if (!storageInstance) {
        storageInstance = await getStorage();
      }

      await storageInstance.saveSettings(userId, newSettings);
      setSettings(newSettings);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '設定の保存に失敗しました';
      setError(message);
      throw err;
    }
  }, [userId]);

  const updateEntries = useCallback(async (newEntries: DailyEntry[]) => {
    if (!userId) {
      throw new Error('番号の入力が必要です');
    }

    try {
      // ストレージインスタンスを取得（初回のみ初期化）
      if (!storageInstance) {
        storageInstance = await getStorage();
      }

      await storageInstance.saveEntries(userId, newEntries);
      setEntries(newEntries);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '記録の保存に失敗しました';
      setError(message);
      throw err;
    }
  }, [userId]);

  return {
    settings,
    entries,
    isLoading,
    error,
    updateSettings,
    updateEntries,
    reload: loadData,
  };
}

