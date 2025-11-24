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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [hasGym, setHasGym] = useState(false);
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  // ジムあり/なしに基づいて目標カロリーを計算
  const getTargetCalories = (): number | null => {
    if (!settings) return null;
    return hasGym ? settings.gymDayTargetKcal : settings.restDayTargetKcal;
  };

  const targetCal = getTargetCalories();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const cal = parseFloat(calories);
    const w = weight ? parseFloat(weight) : undefined;
    const bf = bodyFat ? parseFloat(bodyFat) : undefined;

    // 数値の妥当性チェック
    if (!Number.isFinite(cal) || cal < 0 || cal > 10000) {
      alert('カロリーは0以上10000以下の数値で入力してください。');
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

    // ジムありの場合は初期設定の時間を使用
    const gymHours = hasGym ? (settings?.gymSessionHours ?? 0) : 0;

    const newEntry: DailyEntry = {
      id: editingId || `${date}-${Date.now()}`,
      date,
      calories: cal,
      gymHours: gymHours,
      weight: w,
      bodyFat: bf,
    };

    // 編集モードの場合は既存のエントリーを更新、新規の場合は追加
    let newEntries: DailyEntry[];
    if (editingId) {
      const existingIndex = entries.findIndex(e => e.id === editingId);
      if (existingIndex >= 0) {
        newEntries = [...entries];
        newEntries[existingIndex] = newEntry;
      } else {
        // IDが見つからない場合は追加
        newEntries = [...entries, newEntry].sort((a, b) => a.date.localeCompare(b.date));
      }
    } else {
      // 新規作成の場合、同じ日付のエントリーがあれば更新、なければ追加
      const existingIndex = entries.findIndex(e => e.date === date);
      if (existingIndex >= 0) {
        newEntries = [...entries];
        newEntries[existingIndex] = newEntry;
      } else {
        newEntries = [...entries, newEntry].sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    onChange(newEntries);

    // フォームをリセット
    handleCancel();
  };

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm('このエントリーを削除しますか？')) {
      onChange(entries.filter(e => e.id !== id));
    }
  };

  const handleEdit = (entry: DailyEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setHasGym(entry.gymHours > 0);
    setCalories(entry.calories.toString());
    setWeight(entry.weight?.toString() ?? '');
    setBodyFat(entry.bodyFat?.toString() ?? '');
    // スクロールしてフォームを表示
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    const today = new Date();
    setDate(today.toISOString().slice(0, 10));
    setHasGym(false);
    setCalories('');
    setWeight('');
    setBodyFat('');
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

        {/* ステップ2: ジムあり/なし → 目標カロリー表示 */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              checked={hasGym}
              onChange={e => setHasGym(e.target.checked)}
            />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              ジムあり
              {settings && hasGym && (
                <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case">
                  ({settings.gymSessionHours}h)
                </span>
              )}
            </span>
          </label>
        </div>

        {/* 目標カロリー表示 */}
        {targetCal && (
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">目標カロリー</div>
                <div className="text-[10px] text-gray-400">
                  {hasGym ? 'ジムありの日' : 'ジムなしの日'}
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

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1">
            {editingId ? '更新' : '記録'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
            >
              キャンセル
            </button>
          )}
        </div>
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
                <div className="ml-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(entry)}
                    className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

