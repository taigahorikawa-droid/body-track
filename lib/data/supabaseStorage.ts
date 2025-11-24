// lib/data/supabaseStorage.ts
import { DataStorage } from './storage';
import { InitialSettings, DailyEntry } from '@/types';
import { supabase } from '../supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

// Supabaseが初期化されていない場合はエラーを投げる
function ensureSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabaseが初期化されていません。環境変数を確認してください。');
  }
  return supabase;
}

export class SupabaseStorage implements DataStorage {
  async getSettings(userId: string): Promise<InitialSettings | null> {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return null;
      }
      throw new Error(`設定の取得に失敗しました: ${error.message}`);
    }

    if (!data) return null;

    // スネークケースからキャメルケースに変換
    return {
      currentWeight: data.current_weight,
      currentBodyFat: data.current_body_fat,
      goalWeight: data.goal_weight,
      goalBodyFat: data.goal_body_fat,
      targetDate: data.target_date,
      gender: data.gender as 'male' | 'female',
      age: data.age,
      height: data.height,
      gymSessionHours: data.gym_session_hours,
      gymSessionsPerWeek: data.gym_sessions_per_week,
      maintenanceKcal: data.maintenance_kcal,
      gymDayTargetKcal: data.gym_day_target_kcal,
      restDayTargetKcal: data.rest_day_target_kcal,
    };
  }

  async saveSettings(userId: string, settings: InitialSettings): Promise<void> {
    const client = ensureSupabase();
    // キャメルケースからスネークケースに変換
    const { error } = await client
      .from('settings')
      .upsert({
        user_id: userId,
        current_weight: settings.currentWeight,
        current_body_fat: settings.currentBodyFat,
        goal_weight: settings.goalWeight,
        goal_body_fat: settings.goalBodyFat,
        target_date: settings.targetDate,
        gender: settings.gender,
        age: settings.age,
        height: settings.height,
        gym_session_hours: settings.gymSessionHours,
        gym_sessions_per_week: settings.gymSessionsPerWeek,
        maintenance_kcal: settings.maintenanceKcal,
        gym_day_target_kcal: settings.gymDayTargetKcal,
        rest_day_target_kcal: settings.restDayTargetKcal,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`設定の保存に失敗しました: ${error.message}`);
    }
  }

  async getEntries(userId: string): Promise<DailyEntry[]> {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`記録の取得に失敗しました: ${error.message}`);
    }

    if (!data) return [];

    // スネークケースからキャメルケースに変換
    return data.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      calories: entry.calories,
      gymHours: entry.gym_hours,
      weight: entry.weight ?? undefined,
      bodyFat: entry.body_fat ?? undefined,
    }));
  }

  async saveEntries(userId: string, entries: DailyEntry[]): Promise<void> {
    const client = ensureSupabase();
    // 既存のエントリーを削除してから新しいエントリーを追加
    const { error: deleteError } = await client
      .from('entries')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`記録の削除に失敗しました: ${deleteError.message}`);
    }

    if (entries.length === 0) {
      return;
    }

    // UUID形式かどうかをチェックする関数
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // キャメルケースからスネークケースに変換
    const entriesWithUserId = entries.map(entry => {
      const entryData: any = {
        user_id: userId,
        date: entry.date,
        calories: entry.calories,
        gym_hours: entry.gymHours,
        weight: entry.weight ?? null,
        body_fat: entry.bodyFat ?? null,
        updated_at: new Date().toISOString(),
      };

      // UUID形式のIDのみを含める（そうでない場合はSupabaseが自動生成）
      if (entry.id && isValidUUID(entry.id)) {
        entryData.id = entry.id;
      }

      return entryData;
    });

    const { error: insertError } = await client
      .from('entries')
      .insert(entriesWithUserId);

    if (insertError) {
      throw new Error(`記録の保存に失敗しました: ${insertError.message}`);
    }
  }
}

