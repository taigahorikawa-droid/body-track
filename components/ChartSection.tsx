// components/ChartSection.tsx
'use client';

import { useMemo } from 'react';
import { InitialSettings, DailyEntry } from '@/types';
import { buildSimulationData } from '@/lib/simulation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type Props = {
  settings: InitialSettings | null;
  entries: DailyEntry[];
};

export const ChartSection = ({ settings, entries }: Props) => {
  if (!settings) {
    return (
      <section className="space-y-6">
        <div className="text-xs text-gray-500">
          まず「初期設定」を入力してください
        </div>
      </section>
    );
  }

  const data = useMemo(
    () => buildSimulationData(settings, entries, 90),
    [settings, entries]
  );

  // 予測データが含まれているか（直近1週間分の履歴が十分な場合のみ）
  const hasPrediction = useMemo(
    () => data.some(d => d.hasPrediction),
    [data]
  );

  // 今日の日付を取得
  const todayStr = useMemo(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }, []);

  // 最新のエントリーから現在の体重と体脂肪率を取得
  const latestEntry = useMemo(
    () => [...entries]
      .filter(e => e.weight !== undefined || e.bodyFat !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date))[0],
    [entries]
  );

  const currentWeight = latestEntry?.weight ?? settings.currentWeight;
  const currentBodyFat = latestEntry?.bodyFat ?? settings.currentBodyFat;

  // 体重の最小値と最大値を計算（現状、目標、データから）
  const weightRange = useMemo(() => {
    const weights = [
      settings.currentWeight,
      settings.goalWeight,
      currentWeight,
      ...data.map(d => d.actualWeight).filter((w): w is number => w !== null && w !== undefined),
      ...data.map(d => d.plannedWeight).filter((w): w is number => w !== null && w !== undefined),
      ...data.map(d => d.simulatedWeight).filter((w): w is number => w !== null && w !== undefined),
    ];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;
    // 上下に10%の余白を追加
    const padding = range * 0.1 || 1;
    return {
      min: Math.max(0, Math.floor(min - padding)),
      max: Math.ceil(max + padding),
    };
  }, [settings.currentWeight, settings.goalWeight, currentWeight, data]);

  // 体脂肪率の最小値と最大値を計算（現状、目標、データから）
  const bodyFatRange = useMemo(() => {
    const bodyFats = [
      settings.currentBodyFat,
      settings.goalBodyFat,
      currentBodyFat,
      ...data.map(d => d.actualBodyFat).filter((bf): bf is number => bf !== null && bf !== undefined),
      ...data.map(d => d.plannedBodyFat).filter((bf): bf is number => bf !== null && bf !== undefined),
      ...data.map(d => d.simulatedBodyFat).filter((bf): bf is number => bf !== null && bf !== undefined),
    ];
    const min = Math.min(...bodyFats);
    const max = Math.max(...bodyFats);
    const range = max - min;
    // 上下に10%の余白を追加
    const padding = range * 0.1 || 1;
    return {
      min: Math.max(0, Math.floor(min - padding)),
      max: Math.ceil(max + padding),
    };
  }, [settings.currentBodyFat, settings.goalBodyFat, currentBodyFat, data]);

  // チャート用の共通設定
  const chartConfig = {
    margin: { top: 5, right: 10, bottom: 5, left: 0 },
    xAxis: {
      dataKey: 'date',
      tickFormatter: (d: string) => {
        const date = new Date(d);
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      },
      fontSize: 10,
      tick: { fill: '#9ca3af' },
      tickMargin: 8,
      axisLine: { stroke: '#e5e7eb' },
    },
    tooltip: {
      formatter: (value: number) => [`${value.toFixed(1)}`, ''],
      labelFormatter: (label: string) => label,
      contentStyle: {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '11px',
      },
      labelStyle: { color: '#6b7280', fontSize: '11px' },
    },
    legend: {
      wrapperStyle: { fontSize: 11, paddingTop: '16px', color: '#6b7280' },
      iconType: 'line' as const,
      iconSize: 12,
    },
  };

  return (
    <section className="space-y-8">
      {/* 主要メトリクスカード（体重・体脂肪） */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <div className="metric-label mb-2 sm:mb-3 text-[10px] sm:text-xs">現状体重</div>
          <div className="metric-value mb-2 sm:mb-4 text-2xl sm:text-4xl">{currentWeight.toFixed(1)}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">
            目標: {settings.goalWeight} kg
          </div>
          {(() => {
            const diff = currentWeight - settings.goalWeight;
            const isAchieved = settings.goalWeight < settings.currentWeight 
              ? currentWeight <= settings.goalWeight 
              : currentWeight >= settings.goalWeight;
            return (
              <div className={`text-[10px] sm:text-xs font-medium ${
                isAchieved ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {diff > 0 ? `+${diff.toFixed(1)} kg` : diff < 0 ? `${diff.toFixed(1)} kg` : '達成'}
              </div>
            );
          })()}
        </div>
        <div className="card p-4 sm:p-6">
          <div className="metric-label mb-2 sm:mb-3 text-[10px] sm:text-xs">現状体脂肪率</div>
          <div className="metric-value mb-2 sm:mb-4 text-2xl sm:text-4xl">{currentBodyFat.toFixed(1)}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">
            目標: {settings.goalBodyFat} %
          </div>
          {(() => {
            const diff = currentBodyFat - settings.goalBodyFat;
            const isAchieved = settings.goalBodyFat < settings.currentBodyFat 
              ? currentBodyFat <= settings.goalBodyFat 
              : currentBodyFat >= settings.goalBodyFat;
            return (
              <div className={`text-[10px] sm:text-xs font-medium ${
                isAchieved ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {diff > 0 ? `+${diff.toFixed(1)} %` : diff < 0 ? `${diff.toFixed(1)} %` : '達成'}
              </div>
            );
          })()}
        </div>
      </div>
      {/* チャート（体重・体脂肪） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 体重推移 */}
        <div className="card p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">体重推移</div>
            <div className="text-[9px] sm:text-xs text-gray-400">
              現在: {currentWeight.toFixed(1)} kg / 目標: {settings.goalWeight} kg
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={chartConfig.margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis {...chartConfig.xAxis} />
                <YAxis
                  width={40}
                  domain={[weightRange.min, weightRange.max]}
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} kg`, '']}
                  labelFormatter={(label: string) => label}
                  contentStyle={chartConfig.tooltip.contentStyle}
                  labelStyle={chartConfig.tooltip.labelStyle}
                />
                <Legend {...chartConfig.legend} />
                <ReferenceLine
                  x={todayStr}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  label={{ value: "今日", position: "top", fontSize: 9, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="plannedWeight"
                  name="計画"
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={1.5}
                />
                {hasPrediction && (
                  <Line
                    type="monotone"
                    dataKey="simulatedWeight"
                    name="予想"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actualWeight"
                  name="実測"
                  stroke="#10b981"
                  dot={{ r: 2, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                  connectNulls={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 体脂肪率推移 */}
        <div className="card p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">体脂肪率推移</div>
            <div className="text-[9px] sm:text-xs text-gray-400">
              現在: {currentBodyFat.toFixed(1)} % / 目標: {settings.goalBodyFat} %
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={chartConfig.margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis {...chartConfig.xAxis} />
                <YAxis
                  width={35}
                  domain={[bodyFatRange.min, bodyFatRange.max]}
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} %`, '']}
                  labelFormatter={(label: string) => label}
                  contentStyle={chartConfig.tooltip.contentStyle}
                  labelStyle={chartConfig.tooltip.labelStyle}
                />
                <Legend {...chartConfig.legend} />
                <ReferenceLine
                  x={todayStr}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  label={{ value: "今日", position: "top", fontSize: 9, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="plannedBodyFat"
                  name="計画"
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={1.5}
                />
                {hasPrediction && (
                  <Line
                    type="monotone"
                    dataKey="simulatedBodyFat"
                    name="予想"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actualBodyFat"
                  name="実測"
                  stroke="#10b981"
                  dot={{ r: 2, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                  connectNulls={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
