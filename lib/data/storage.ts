// lib/data/storage.ts
import { InitialSettings, DailyEntry } from '@/types';

export interface DataStorage {
  getSettings(userId: string): Promise<InitialSettings | null>;
  saveSettings(userId: string, settings: InitialSettings): Promise<void>;
  getEntries(userId: string): Promise<DailyEntry[]>;
  saveEntries(userId: string, entries: DailyEntry[]): Promise<void>;
}

