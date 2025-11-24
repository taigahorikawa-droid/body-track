// components/ChartSection.tsx
'use client';

import { useMemo } from 'react';
import { InitialSettings, DailyEntry } from '@/types';
import { buildSimulationData, calculateProgressRate, compareWithPlan } from '@/lib/simulation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

  // 最新のエントリーから現在の体重と体脂肪率を取得
  const latestEntry = useMemo(
    () => [...entries]
      .filter(e => e.weight !== undefined || e.bodyFat !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date))[0],
    [entries]
  );

  const currentWeight = latestEntry?.weight ?? settings.currentWeight;
  const currentBodyFat = latestEntry?.bodyFat ?? settings.currentBodyFat;

  // 達成率を計算
  const progressRate = useMemo(
    () => calculateProgressRate(
      currentWeight,
      currentBodyFat,
      settings.goalWeight,
      settings.goalBodyFat,
      settings.currentWeight,
      settings.currentBodyFat
    ),
    [currentWeight, currentBodyFat, settings.goalWeight, settings.goalBodyFat, settings.currentWeight, settings.currentBodyFat]
  );

  // 計画との比較
  const comparison = useMemo(
    () => compareWithPlan(settings, entries),
    [settings, entries]
  );

  // 履歴エントリー（体重または体脂肪率が記録されているもの）
  const historyEntries = useMemo(
    () => [...entries]
      .filter(e => e.weight !== undefined || e.bodyFat !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  return (
    <section className="space-y-8">
      {/* 主要メトリクスカード（InBody風） */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="metric-label mb-3">体重</div>
          <div className="metric-value mb-4">{currentWeight.toFixed(1)}</div>
          <div className="text-xs text-gray-500 font-medium">
            目標: {settings.goalWeight} kg
          </div>
        </div>
        <div className="card p-6">
          <div className="metric-label mb-3">体脂肪率</div>
          <div className="metric-value mb-4">{currentBodyFat.toFixed(1)}</div>
          <div className="text-xs text-gray-500 font-medium">
            目標: {settings.goalBodyFat} %
          </div>
        </div>
        <div className="card p-6">
          <div className="metric-label mb-3">総合スコア</div>
          <div className="text-4xl font-light tracking-tight text-emerald-600 mb-4">{progressRate.toFixed(1)}</div>
          <div className="text-xs text-gray-500 font-medium mb-2">
            {progressRate >= 100 ? '目標達成' : progressRate >= 50 ? '改善中' : '要改善'}
          </div>
          <div className={`text-xs font-medium ${
            comparison.isOnSchedule ? 'text-emerald-600' : 'text-orange-500'
          }`}>
            {comparison.isOnSchedule ? '計画通り' : '計画より遅れ'}
          </div>
        </div>
      </div>

      {/* 計画比較表示 */}
      {!comparison.isOnSchedule && (
        <div className="card p-5 border-l-4 border-l-orange-500">
          <div className="text-sm font-medium text-gray-900 mb-2">計画より遅れています</div>
          <div className="text-xs text-gray-600 mb-1">
            実際の進捗: {comparison.actualProgress.toFixed(1)}% / 計画上の進捗: {comparison.plannedProgress.toFixed(1)}%
            {comparison.daysBehind && ` (約${comparison.daysBehind}日遅れ)`}
          </div>
          <div className="text-xs text-gray-500">
            カロリー摂取量や運動量を見直してください。
          </div>
        </div>
      )}

      {/* スコアチャート（InBody風） */}
      <div className="card p-6">
        <div className="mb-6">
          <div className="text-xs text-gray-500 font-medium mb-1">スコア推移</div>
          <div className="text-xs text-gray-400">
            50: 現状 / 100: 目標達成
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={d => {
                  const date = new Date(d);
                  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                }}
                fontSize={10}
                tick={{ fill: '#9ca3af' }}
                tickMargin={8}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                domain={[0, 100]}
                width={40}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(value) => {
                  if (value === 50) return '50';
                  if (value === 100) return '100';
                  return '';
                }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}`, '']}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#6b7280', fontSize: '11px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 11, paddingTop: '16px', color: '#6b7280' }}
                iconType="line"
                iconSize={12}
              />
              <Line
                type="monotone"
                dataKey="plannedScore"
                name="計画"
                stroke="#9ca3af"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="simulatedScore"
                name="予想"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="actualScore"
                name="実測"
                stroke="#10b981"
                dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                connectNulls={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 履歴テーブル（InBody風） */}
      <div className="card p-6">
        <div className="text-xs text-gray-500 font-medium mb-4 uppercase tracking-wider">記録履歴</div>
        {historyEntries.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-12">
            まだ記録がありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 uppercase tracking-wider">体重</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 uppercase tracking-wider">体脂肪率</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 uppercase tracking-wider">スコア</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries.map((entry) => {
                  const entryWeight = entry.weight ?? currentWeight;
                  const entryBodyFat = entry.bodyFat ?? currentBodyFat;
                  const entryScore = calculateProgressRate(
                    entryWeight,
                    entryBodyFat,
                    settings.goalWeight,
                    settings.goalBodyFat,
                    settings.currentWeight,
                    settings.currentBodyFat
                  );
                  return (
                    <tr key={entry.id} className="border-b border-gray-100">
                      <td className="py-3 px-3 text-gray-900 font-medium">{entry.date}</td>
                      <td className="py-3 px-3 text-right text-gray-900">
                        {entry.weight !== undefined ? entry.weight.toFixed(1) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900">
                        {entry.bodyFat !== undefined ? entry.bodyFat.toFixed(1) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">
                        {entryScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
