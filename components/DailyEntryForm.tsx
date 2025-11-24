// components/DailyEntryForm.tsx
'use client';

import { FormEvent, useState, useMemo } from 'react';
import { DailyEntry, InitialSettings } from '@/types';

type Props = {
  entries: DailyEntry[];
  onChange: (entries: DailyEntry[]) => void;
  settings: InitialSettings | null;
};

export const DailyEntryForm = ({ entries, onChange, settings }: Props) => {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [gymHours, setGymHours] = useState('0');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  // ジム時間に基づいて目標カロリーを計算
  const getTargetCalories = (): number | null => {
    if (!settings) return null;
    const gh = parseFloat(gymHours);
    if (Number.isNaN(gh)) return null;
    
    // ジム時間が0より大きい場合はジム日の目標カロリー、0の場合はオフ日の目標カロリー
    if (gh > 0) {
      return settings.gymDayTargetKcal;
    } else {
      return settings.restDayTargetKcal;
    }
  };

  const targetCal = getTargetCalories();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const cal = parseFloat(calories);
    const gh = parseFloat(gymHours);
    const w = weight ? parseFloat(weight) : undefined;
    const bf = bodyFat ? parseFloat(bodyFat) : undefined;

    // 数値の妥当性チェック
    if (!Number.isFinite(cal) || cal < 0 || cal > 10000) {
      alert('カロリーは0以上10000以下の数値で入力してください。');
      return;
    }
    
    if (!Number.isFinite(gh) || gh < 0 || gh > 24) {
      alert('ジム時間は0以上24以下の数値で入力してください。');
      return;
    }
    
    // 任意項目の妥当性チェック
    if (w !== undefined && (!Number.isFinite(w) || w <= 0 || w > 300)) {
      alert('体重は1kg以上300kg以下の数値で入力してください。');
      return;
    }
    
    if (bf !== undefined && (!Number.isFinite(bf) || bf < 0 || bf > 100)) {
      alert('体脂肪率は0%以上100%以下の数値で入力してください。');
      return;
    }

    const newEntry: DailyEntry = {
      id: `${date}-${Date.now()}`,
      date,
      calories: cal,
      gymHours: gh,
      weight: w,
      bodyFat: bf,
    };

    // 同じ日付のエントリーがあれば更新、なければ追加
    const existingIndex = entries.findIndex(e => e.date === date);
    let newEntries: DailyEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = newEntry;
    } else {
      newEntries = [...entries, newEntry].sort((a, b) => a.date.localeCompare(b.date));
    }

    onChange(newEntries);

    // フォームをリセット（日付は今日のまま）
    setCalories('');
    setGymHours('0');
    setWeight('');
    setBodyFat('');
  };

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm('このエントリーを削除しますか？')) {
      onChange(entries.filter(e => e.id !== id));
    }
  };
  const recentEntries = useMemo(
    () => [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [entries]
  );

  return (
    <section className="space-y-6">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-6">日次記録</div>

      {!settings && (
        <div className="card p-4 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500">
            まず「初期設定」を入力してください
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ステップ1: 日付 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">日付</label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* ステップ2: ジム時間 → 目標カロリー表示 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">ジム時間</label>
          <select
            className="input-field"
            value={gymHours}
            onChange={e => setGymHours(e.target.value)}
            required
          >
            <option value="0">0（オフ日）</option>
            <option value="0.5">0.5</option>
            <option value="1">1</option>
            <option value="1.5">1.5</option>
            <option value="2">2</option>
          </select>
        </div>

        {/* 目標カロリー表示 */}
        {targetCal && (
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">目標カロリー</div>
                <div className="text-[10px] text-gray-400">
                  {parseFloat(gymHours) > 0 ? 'ジムありの日' : 'ジムなしの日'}
                </div>
              </div>
              <div className="text-2xl font-light text-emerald-600">{targetCal}</div>
            </div>
          </div>
        )}

        {/* ステップ3: 実際のカロリー */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
            実際のカロリー
            {targetCal && (
              <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case">
                目標: {targetCal} kcal
              </span>
            )}
          </label>
          <input
            type="number"
            step="1"
            className="input-field"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            placeholder={targetCal ? `${targetCal}` : 'カロリーを入力'}
            required
          />
          {targetCal && calories && (
            <div className="text-[10px] mt-1">
              {(() => {
                const diff = parseFloat(calories) - targetCal;
                if (Math.abs(diff) < 50) {
                  return <span className="text-emerald-600 font-medium">目標に近い</span>;
                } else if (diff > 0) {
                  return <span className="text-orange-500 font-medium">+{diff.toFixed(0)} kcal</span>;
                } else {
                  return <span className="text-gray-500 font-medium">{diff.toFixed(0)} kcal</span>;
                }
              })()}
            </div>
          )}
        </div>

        {/* 任意項目 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4 border-t border-gray-200">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              体重
              <span className="ml-1 text-[10px] font-normal text-gray-400 normal-case">任意</span>
            </label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="65.0"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              体脂肪率
              <span className="ml-1 text-[10px] font-normal text-gray-400 normal-case">任意</span>
            </label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={bodyFat}
              onChange={e => setBodyFat(e.target.value)}
              placeholder="20.0"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          記録
        </button>
      </form>

      {recentEntries.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">最近の記録</div>
          <div className="space-y-2">
            {recentEntries.map(entry => (
              <div
                key={entry.id}
                className="card p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900 mb-1">{entry.date}</div>
                  <div className="text-[10px] text-gray-500">
                    {entry.calories} kcal
                    {entry.gymHours > 0 && ` • ジム ${entry.gymHours}h`}
                    {entry.weight && ` • 体重 ${entry.weight}kg`}
                    {entry.bodyFat && ` • 体脂肪 ${entry.bodyFat}%`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="ml-4 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

