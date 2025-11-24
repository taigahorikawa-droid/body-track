// lib/data/localStorageStorage.ts
import { DataStorage } from './storage';
import { InitialSettings, DailyEntry } from '@/types';

export class LocalStorageStorage implements DataStorage {
  private getKey(userId: string, type: 'settings' | 'entries'): string {
    return `body-track-${userId}-${type}`;
  }

  async getSettings(userId: string): Promise<InitialSettings | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = window.localStorage.getItem(this.getKey(userId, 'settings'));
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('Failed to read settings from localStorage', err);
      return null;
    }
  }

  async saveSettings(userId: string, settings: InitialSettings): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem(this.getKey(userId, 'settings'), JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings to localStorage', err);
      throw new Error('設定の保存に失敗しました');
    }
  }

  async getEntries(userId: string): Promise<DailyEntry[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = window.localStorage.getItem(this.getKey(userId, 'entries'));
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Failed to read entries from localStorage', err);
      return [];
    }
  }

  async saveEntries(userId: string, entries: DailyEntry[]): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem(this.getKey(userId, 'entries'), JSON.stringify(entries));
    } catch (err) {
      console.error('Failed to save entries to localStorage', err);
      throw new Error('記録の保存に失敗しました');
    }
  }
}

