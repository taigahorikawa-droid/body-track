// lib/simulation.ts
import { DailyEntry, InitialSettings } from '@/types';

export type ChartPoint = {
  date: string;
  simulatedScore: number;
  actualScore?: number | null;
  plannedScore: number; // 計画上のスコア
  actualWeight?: number | null;
  simulatedWeight?: number;
  plannedWeight?: number;
  actualBodyFat?: number | null;
  simulatedBodyFat?: number;
  plannedBodyFat?: number;
  // 予測値が含まれるポイントかどうか（未来日＆十分な履歴データがある場合）
  hasPrediction?: boolean;
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
 * カロリープラン計算（ユーザー指定ロジック）
 *
 * 1. 日数 N, 体重変化 ΔW, 1日あたり体重変化 ΔW_day
 * 2. 1日あたり必要カロリー差 ΔE_day = ΔW_day × 7700
 * 3. BMR（Mifflin-St Jeor）
 * 4. オフ日メンテ: C_rest_maint = BMR × 1.3
 * 5. ジム消費: E_gym = 6 × W0 × Tgym
 * 6. ジム日メンテ: C_gym_maint = C_rest_maint + E_gym
 * 7. 実際に食べるカロリー:
 *    - C_rest = C_rest_maint + ΔE_day
 *    - C_gym  = C_gym_maint  + ΔE_day
 *
 * さらに、安全面チェックとして ΔE_day や週あたりの体重変化が大きすぎる場合は
 * warnings にメッセージを入れる。
 */
export function computeCaloriePlan(input: PlanInput) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(input.targetDate + 'T00:00:00Z');

  // 日数 N（最低1日）
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const N = diffDays;

  // 体重変化
  const deltaW = input.goalWeight - input.currentWeight; // kg
  const deltaWDay = deltaW / N; // kg/日

  // 1日あたりカロリー差
  const deltaEDay = deltaWDay * 7700; // kcal/日

  // BMR（Mifflin-St Jeor）
  const bmr = calculateBMR(input.currentWeight, input.height, input.age, input.gender);

  // メンテナンス（オフ日）
  const cRestMaint = bmr * 1.3;

  // ジム消費（MET=6）
  const eGym = 6 * input.currentWeight * input.gymSessionHours;

  // ジム日メンテ
  const cGymMaint = cRestMaint + eGym;

  // 実際に食べるカロリー
  let cRest = cRestMaint + deltaEDay;
  let cGym = cGymMaint + deltaEDay;

  // 極端に低すぎるのを防ぐための下限（BMRの1.1倍）
  const minIntake = bmr * 1.1;
  cRest = Math.max(cRest, minIntake);
  cGym = Math.max(cGym, minIntake);

  // 警告ロジック
  const warnings: string[] = [];

  const weeklyDeltaW = deltaWDay * 7; // kg/週

  // 減量ペースの警告
  if (weeklyDeltaW < -1) {
    warnings.push(
      '減量ペースがかなり急です（週1kg超）。目標日を少し遠くするか、目標体重を少し緩めることをおすすめします。'
    );
  } else if (weeklyDeltaW < -0.8) {
    warnings.push(
      '減量ペースがややハードです（週0.8〜1kg）。体調を見ながら無理のない範囲で進めてください。'
    );
  }

  // 増量ペースの警告
  if (weeklyDeltaW > 0.5) {
    warnings.push(
      '増量ペースがかなり速いです（週0.5kg超）。脂肪の増加が大きくなる可能性があります。'
    );
  } else if (weeklyDeltaW > 0.3) {
    warnings.push(
      '増量ペースがやや速めです（週0.3〜0.5kg）。体脂肪の増え方に注意しながら進めてください。'
    );
  }

  // 1日あたりカロリー差が極端な場合の警告
  if (deltaEDay < -1000) {
    warnings.push(
      '1日のカロリー赤字が1000kcalを超えています。かなりハードな設定なので、もう少し目標日を伸ばすか、目標体重を緩めることを検討してください。'
    );
  } else if (deltaEDay < -800) {
    warnings.push(
      '1日のカロリー赤字が800kcalを超えています。継続が難しく感じたら、設定を少し緩めるのがおすすめです。'
    );
  }

  if (deltaEDay > 600) {
    warnings.push(
      '1日のカロリープラスが600kcalを超えています。脂肪の増加が大きくなる可能性があるので、目標設定を少し見直してもよいかもしれません。'
    );
  } else if (deltaEDay > 400) {
    warnings.push(
      '1日のカロリープラスが400kcalを超えています。増量ペースが速めなので、体脂肪の推移もチェックしながら進めてください。'
    );
  }

  // maintenanceKcal は「オフ日のメンテナンス」を採用
  const maintenanceKcal = Math.round(cRestMaint);

  return {
    maintenanceKcal,
    gymDayTargetKcal: Math.round(cGym),
    restDayTargetKcal: Math.round(cRest),
    bmr: Math.round(bmr),
    deltaEDay,
    warnings,
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

  // ---- 直近1週間のパフォーマンスから平均カロリー差を算出 ----
  const maintenance = settings.maintenanceKcal;

  let hasPredictionSource = false;
  let avgDeltaKcal: number | null = null;

  if (sortedEntries.length > 0 && maintenance > 0) {
    const latestEntryDate = parseDate(sortedEntries[sortedEntries.length - 1].date);
    const weekAgo = addDays(latestEntryDate, -6);

    const recentEntries = sortedEntries.filter(e => {
      const d = parseDate(e.date);
      return d >= weekAgo && d <= latestEntryDate;
    });

    if (recentEntries.length >= 7) {
      const deltas = recentEntries.map(e => e.calories - maintenance);
      const sum = deltas.reduce((acc, v) => acc + v, 0);
      avgDeltaKcal = sum / deltas.length;
      hasPredictionSource = true;
    }
  }

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

    // 直近1週間の平均パフォーマンスからシミュレーションするかどうか
    const isFuture = date > today;
    const canPredict = hasPredictionSource && avgDeltaKcal !== null;

    const usedCalories = (() => {
      // 実績がある日は常に実績を優先
      if (dailyCalories !== null && dailyCalories !== undefined) {
        return dailyCalories;
      }
      // 未来日かつ十分な履歴がある場合は「平均的な1日のカロリー差」を使ってシミュレーション
      if (isFuture && canPredict) {
        return maintenance + avgDeltaKcal!;
      }
      // それ以外は計画値を使用
      return plannedCalories;
    })();

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

    // 計画上の体重と体脂肪率（線形に目標に向かう）
    const plannedWeight = totalDays > 0
      ? settings.currentWeight + (settings.goalWeight - settings.currentWeight) * Math.min(1, i / totalDays)
      : settings.currentWeight;
    const plannedBodyFat = totalDays > 0
      ? settings.currentBodyFat + (settings.goalBodyFat - settings.currentBodyFat) * Math.min(1, i / totalDays)
      : settings.currentBodyFat;

    points.push({
      date: dateStr,
      simulatedScore: Math.max(0, Math.min(100, simulatedScore)),
      actualScore: actualScore !== null ? Math.max(0, Math.min(100, actualScore)) : null,
      plannedScore: Math.max(0, Math.min(100, plannedScore)),
      actualWeight: actualWeight,
      simulatedWeight: currentWeight,
      plannedWeight: plannedWeight,
      actualBodyFat: actualBodyFat,
      simulatedBodyFat: currentBodyFat,
      plannedBodyFat: plannedBodyFat,
      hasPrediction: isFuture && canPredict,
    });
  }

  return points;
}
