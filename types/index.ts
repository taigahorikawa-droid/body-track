// types/index.ts

export type InitialSettings = {
  currentWeight: number;
  currentBodyFat: number;
  goalWeight: number;
  goalBodyFat: number;
  targetDate: string;           // 目標達成日 YYYY-MM-DD
  gender: 'male' | 'female';    // 性別
  age: number;                  // 年齢
  height: number;               // 身長 (cm)
  gymSessionHours: number;      // 1回のジム時間（時間）
  gymSessionsPerWeek: number;   // 週あたりのジム回数
  maintenanceKcal: number;      // 維持カロリー（目安）
  gymDayTargetKcal: number;     // ジムありの日の目標カロリー
  restDayTargetKcal: number;    // ジムなしの日の目標カロリー
};

export type DailyEntry = {
  id: string;
  date: string;       // YYYY-MM-DD
  calories: number;
  gymHours: number;   // 0 / 0.5 / 1 / 1.5 / 2
  weight?: number;
  bodyFat?: number;
};

