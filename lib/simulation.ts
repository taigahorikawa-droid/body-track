// lib/simulation.ts
import { DailyEntry, InitialSettings } from '@/types';

export type ChartPoint = {
  date: string;
  simulatedScore: number;
  actualScore?: number | null;
  plannedScore: number; // 計画上のスコア
};

export type ProgressComparison = {
  actualProgress: number; // 実際の進捗率
  plannedProgress: number; // 計画上の進捗率
  isOnSchedule: boolean; // 計画通りかどうか
  daysBehind?: number; // ビハインドしている場合の日数
};

// ---- 日付ユーティリティ ----
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  // UTC で解釈してタイムゾーン問題を回避
  return new Date(value + 'T00:00:00Z');
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const clamp = (value: number, min: number) => (value < min ? min : value);

// ---- 初期設定 → カロリープラン計算 ----

export type PlanInput = {
  currentWeight: number;
  goalWeight: number;
  targetDate: string;
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  gymSessionHours: number;
  gymSessionsPerWeek: number;
};

/**
 * ミフリン・セイントジョア式で基礎代謝（BMR）を計算
 */
function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female'): number {
  // ミフリン・セイントジョア式
  // 男性: BMR = 10 × 体重(kg) + 6.25 × 身長(cm) - 5 × 年齢(歳) + 5
  // 女性: BMR = 10 × 体重(kg) + 6.25 × 身長(cm) - 5 × 年齢(歳) - 161
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * 活動係数を計算（ジム回数と時間から）
 */
function getActivityFactor(gymSessionsPerWeek: number, gymSessionHours: number): number {
  const totalGymHours = gymSessionsPerWeek * gymSessionHours;
  
  if (totalGymHours === 0) {
    return 1.2; // ほぼ運動しない
  } else if (totalGymHours < 3) {
    return 1.375; // 軽い運動（週1-3回）
  } else if (totalGymHours < 6) {
    return 1.55; // 中程度の運動（週3-5回）
  } else if (totalGymHours < 10) {
    return 1.725; // 激しい運動（週6-7回）
  } else {
    return 1.9; // 非常に激しい運動
  }
}

/**
 * 目標達成日までの週数を計算
 */
function calculateWeeksUntilTarget(targetDate: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00Z');
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    // 過去日付の場合は1週間として扱う（エラーを避ける）
    return 1;
  }
  
  const weeks = Math.max(1, Math.ceil(diffDays / 7)); // 最低1週間
  return weeks;
}

/**
 * 改善されたカロリープラン計算：
 * - ミフリン・セイントジョア式で基礎代謝（BMR）を計算
 * - 活動係数を使ってTDEE（総消費カロリー）を計算
 * - 目標達成日から週数を計算
 * - 安全な減量ペース（週0.5-1kg）を考慮
 * - カロリーが低すぎないようにBMRの1.2倍を下限に設定
 */
export function computeCaloriePlan(input: PlanInput) {
  // 基礎代謝（BMR）を計算
  const bmr = calculateBMR(input.currentWeight, input.height, input.age, input.gender);
  
  // 活動係数を取得
  const activityFactor = getActivityFactor(input.gymSessionsPerWeek, input.gymSessionHours);
  
  // TDEE（総消費カロリー）を計算
  const tdee = bmr * activityFactor;
  
  // 目標達成日までの週数を計算
  const weeks = calculateWeeksUntilTarget(input.targetDate);

  const totalLoss =
    input.goalWeight < input.currentWeight
      ? input.currentWeight - input.goalWeight
      : 0;

  // 週あたりの減量目標（安全な範囲：0.5-1kg/週）
  const weeklyLoss = totalLoss / weeks; // kg/週
  const safeWeeklyLoss = Math.min(Math.max(weeklyLoss, 0.5), 1.0); // 0.5-1kg/週に制限
  
  // 週あたりのカロリー赤字（脂肪1kg ≒ 7700kcal）
  const weeklyDeficit = safeWeeklyLoss * 7700; // kcal/週
  const dailyDeficit = weeklyDeficit / 7; // kcal/日

  const gymDays = Math.max(0, Math.min(7, input.gymSessionsPerWeek));
  const restDays = 7 - gymDays;

  // ジム日の消費カロリーを考慮（ジム1時間あたり約300-600kcal）
  const gymCalorieBurn = input.gymSessionHours * 400; // 1時間あたり400kcal（中程度の運動）

  // ジム日とオフ日で赤字を分配
  let gymDeficitPerDay = 0;
  let restDeficitPerDay = 0;

  if (gymDays > 0 && restDays > 0) {
    // ジム日は運動で消費するので、食事からの赤字を少し減らす
    gymDeficitPerDay = dailyDeficit * 0.4; // ジム日は40%
    restDeficitPerDay = dailyDeficit * 0.6; // オフ日は60%
  } else if (gymDays > 0) {
    gymDeficitPerDay = dailyDeficit;
  } else {
    restDeficitPerDay = dailyDeficit;
  }

  // ジム日の目標カロリー = TDEE + ジム消費 - 赤字
  const gymDayTarget = Math.round(
    clamp(tdee + gymCalorieBurn - gymDeficitPerDay, bmr * 1.2)
  );
  
  // オフ日の目標カロリー = TDEE - 赤字
  const restDayTarget = Math.round(
    clamp(tdee - restDeficitPerDay, bmr * 1.2)
  );

  return {
    maintenanceKcal: Math.round(tdee),
    gymDayTargetKcal: gymDayTarget,
    restDayTargetKcal: restDayTarget,
    bmr: Math.round(bmr),
  };
}

/**
 * スコアを計算（体重と体脂肪率からスコア）
 * - 開始時点（現状）: 50点
 * - 目標達成: 100点
 * - 悪化した場合: 50点未満（0点まで下がる可能性）
 */
export function calculateScore(
  weight: number,
  bodyFat: number,
  goalWeight: number,
  goalBodyFat: number,
  initialWeight: number,
  initialBodyFat: number
): number {
  // 体重スコア（開始50、目標100、悪化すると50未満）
  let weightScore = 50;
  if (initialWeight !== goalWeight) {
    const weightProgress = (initialWeight - weight) / (initialWeight - goalWeight);
    // 進捗が1.0（目標達成）で100点、0.0（現状維持）で50点、負の値（悪化）で50点未満
    weightScore = 50 + weightProgress * 50;
  } else {
    // 目標体重が初期体重と同じ場合、現状維持で50点
    weightScore = 50;
  }
  
  // 体脂肪率スコア（開始50、目標100、悪化すると50未満）
  let bodyFatScore = 50;
  if (initialBodyFat !== goalBodyFat) {
    const bodyFatProgress = (initialBodyFat - bodyFat) / (initialBodyFat - goalBodyFat);
    // 進捗が1.0（目標達成）で100点、0.0（現状維持）で50点、負の値（悪化）で50点未満
    bodyFatScore = 50 + bodyFatProgress * 50;
  } else {
    // 目標体脂肪率が初期体脂肪率と同じ場合、現状維持で50点
    bodyFatScore = 50;
  }
  
  // 体重と体脂肪率の重み付け（体脂肪率を1.5倍重視）
  const totalScore = (weightScore + bodyFatScore * 1.5) / 2.5;
  
  // 0-100の範囲に制限（悪化した場合も0点まで）
  return Math.max(0, Math.min(100, totalScore));
}

/**
 * 達成率を計算（体重と体脂肪率の両方を考慮）
 */
export function calculateProgressRate(
  currentWeight: number,
  currentBodyFat: number,
  goalWeight: number,
  goalBodyFat: number,
  initialWeight: number,
  initialBodyFat: number
): number {
  return calculateScore(currentWeight, currentBodyFat, goalWeight, goalBodyFat, initialWeight, initialBodyFat);
}

/**
 * 計画との比較を計算
 */
export function compareWithPlan(
  settings: InitialSettings,
  entries: DailyEntry[]
): ProgressComparison {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  const targetDate = new Date(settings.targetDate + 'T00:00:00Z');
  
  // 経過日数と総日数を計算
  const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // 計画上のスコア（時間経過による、開始50、目標100）
  const plannedProgress = totalDays > 0 
    ? 50 + (elapsedDays / totalDays) * 50 
    : 50;
  
  // 最新のエントリーから現在の体重と体脂肪率を取得
  const latestEntry = [...entries]
    .filter(e => e.weight !== undefined || e.bodyFat !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  
  const currentWeight = latestEntry?.weight ?? settings.currentWeight;
  const currentBodyFat = latestEntry?.bodyFat ?? settings.currentBodyFat;
  
  // 実際の進捗率
  const actualProgress = calculateProgressRate(
    currentWeight,
    currentBodyFat,
    settings.goalWeight,
    settings.goalBodyFat,
    settings.currentWeight,
    settings.currentBodyFat
  );
  
  // 計画通りかどうか（±2.5点の誤差を許容）
  const isOnSchedule = actualProgress >= plannedProgress - 2.5;
  
  // ビハインドしている場合の日数を計算
  let daysBehind: number | undefined;
  if (!isOnSchedule && totalDays > 0) {
    const progressDiff = plannedProgress - actualProgress;
    // スコアの差を日数に変換（50点の差が総日数に相当）
    daysBehind = Math.ceil((progressDiff / 50) * totalDays);
  }
  
  return {
    actualProgress,
    plannedProgress,
    isOnSchedule,
    daysBehind,
  };
}

// ---- 実績＋カロリープラン → スコアシミュレーション ----

export function buildSimulationData(
  settings: InitialSettings,
  entries: DailyEntry[],
  days: number = 90
): ChartPoint[] {
  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const entryByDate = new Map<string, DailyEntry>();
  for (const e of sortedEntries) {
    entryByDate.set(e.date, e);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = today;
  const targetDate = parseDate(settings.targetDate);
  const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const points: ChartPoint[] = [];

  let currentWeight = settings.currentWeight;
  let currentBodyFat = settings.currentBodyFat;
  
  // 実績データから計画とのずれを計算
  const actualEntries = sortedEntries.filter(e => e.weight !== undefined || e.bodyFat !== undefined);
  let lastActualDay = -1; // 最後に実績があった日

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dateStr = formatDate(date);

    const entry = entryByDate.get(dateStr);
    let actualWeight: number | null = null;
    let actualBodyFat: number | null = null;

    let dailyCalories: number | null = null;
    let gymHours = 0;

    if (entry) {
      dailyCalories = entry.calories;
      gymHours = entry.gymHours;
      if (typeof entry.weight === 'number') {
        actualWeight = entry.weight;
        currentWeight = entry.weight; // 実測があればそれを起点にリセット
      }
      if (typeof entry.bodyFat === 'number') {
        actualBodyFat = entry.bodyFat;
        currentBodyFat = entry.bodyFat;
      }
    }

    // 実績がある場合、計画とのずれを計算
    if (actualWeight !== null || actualBodyFat !== null) {
      const actualScore = calculateScore(
        actualWeight ?? currentWeight,
        actualBodyFat ?? currentBodyFat,
        settings.goalWeight,
        settings.goalBodyFat,
        settings.currentWeight,
        settings.currentBodyFat
      );
      
      lastActualDay = i;
    }

    // この日の「想定ジム日かどうか」（雑に 7 / 週回数 で割り振り）
    const isGymDayPlanned =
      settings.gymSessionsPerWeek > 0
        ? (i % Math.round(7 / settings.gymSessionsPerWeek || 1)) === 0
        : false;

    const plannedCalories = isGymDayPlanned
      ? settings.gymDayTargetKcal
      : settings.restDayTargetKcal;

    const usedCalories = dailyCalories ?? plannedCalories;
    const maintenance = settings.maintenanceKcal;

    if (maintenance > 0 && usedCalories) {
      const deltaKcal = usedCalories - maintenance;
      const deltaWeight = deltaKcal / 7700; // kcal → kg換算
      currentWeight += deltaWeight;
      // 体脂肪率も簡易的に更新（体重減少の80%が体脂肪減少と仮定）
      if (deltaWeight < 0) {
        const fatLoss = Math.abs(deltaWeight) * 0.8;
        const currentFatMass = (currentWeight * currentBodyFat) / 100;
        const newFatMass = Math.max(0, currentFatMass - fatLoss);
        currentBodyFat = (newFatMass / currentWeight) * 100;
      }
    }

    // 計画上のスコア（時間経過による線形な目標、開始50、目標100）
    const plannedScore = totalDays > 0 
      ? 50 + Math.min(50, (i / totalDays) * 50) 
      : 50;

    // 予想スコア（カロリー計算ベース）
    const simulatedScoreFromCalories = calculateScore(
      currentWeight,
      currentBodyFat,
      settings.goalWeight,
      settings.goalBodyFat,
      settings.currentWeight,
      settings.currentBodyFat
    );

    // 予想スコアの計算
    let simulatedScore = simulatedScoreFromCalories;
    
    // 実績がない場合、予想は計画と同じ（線形に目標に向かう）
    if (actualEntries.length === 0) {
      simulatedScore = plannedScore;
    } else if (lastActualDay >= 0 && i > lastActualDay) {
      // 実績がある場合、最後の実績からのずれを考慮して予想を修正
      const daysSinceLastActual = i - lastActualDay;
      const remainingDays = totalDays - i;
      
      if (remainingDays > 0) {
        // 最後の実績時点での計画スコア（開始50、目標100）
        const plannedScoreAtLastActual = totalDays > 0 
          ? 50 + Math.min(50, (lastActualDay / totalDays) * 50) 
          : 50;
        
        // 最後の実績時点での実測スコア
        const lastActualEntry = actualEntries[actualEntries.length - 1];
        const lastActualWeight = lastActualEntry.weight ?? settings.currentWeight;
        const lastActualBodyFat = lastActualEntry.bodyFat ?? settings.currentBodyFat;
        const actualScoreAtLastActual = calculateScore(
          lastActualWeight,
          lastActualBodyFat,
          settings.goalWeight,
          settings.goalBodyFat,
          settings.currentWeight,
          settings.currentBodyFat
        );
        
        // 計画とのずれ
        const deviationAtLastActual = actualScoreAtLastActual - plannedScoreAtLastActual;
        
        // 残り日数でずれを解消するように予想を調整
        // ずれが大きいほど、より積極的に調整が必要
        const adjustment = (deviationAtLastActual / remainingDays) * daysSinceLastActual;
        simulatedScore = simulatedScoreFromCalories + adjustment;
      }
      } else if (i <= lastActualDay) {
      // 実績がある日以前は、実績がない場合は計画と同じ（開始50から線形に増加）
      if (actualWeight === null && actualBodyFat === null) {
        simulatedScore = plannedScore;
      }
    } else {
      // 実績がない場合、予想は計画と同じ（開始50から線形に100に向かう）
      simulatedScore = plannedScore;
    }

    // 実測スコア
    let actualScore: number | null = null;
    if (actualWeight !== null && actualBodyFat !== null) {
      actualScore = calculateScore(
        actualWeight,
        actualBodyFat,
        settings.goalWeight,
        settings.goalBodyFat,
        settings.currentWeight,
        settings.currentBodyFat
      );
    } else if (actualWeight !== null) {
      // 体重のみの場合、体脂肪率は現在の値を使用
      actualScore = calculateScore(
        actualWeight,
        currentBodyFat,
        settings.goalWeight,
        settings.goalBodyFat,
        settings.currentWeight,
        settings.currentBodyFat
      );
    }

    points.push({
      date: dateStr,
      simulatedScore: Math.max(0, Math.min(100, simulatedScore)),
      actualScore: actualScore !== null ? Math.max(0, Math.min(100, actualScore)) : null,
      plannedScore: Math.max(0, Math.min(100, plannedScore)),
    });
  }

  return points;
}
