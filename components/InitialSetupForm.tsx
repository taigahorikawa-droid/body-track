// components/InitialSetupForm.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { InitialSettings } from '@/types';
import { computeCaloriePlan } from '@/lib/simulation';

type Props = {
  value: InitialSettings | null;
  onChange: (settings: InitialSettings) => void;
};

export const InitialSetupForm = ({ value, onChange }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('65');
  const [currentBodyFat, setCurrentBodyFat] = useState('20');
  const [goalWeight, setGoalWeight] = useState('62');
  const [goalBodyFat, setGoalBodyFat] = useState('15');
  const [targetDate, setTargetDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3); // デフォルトは3ヶ月後
    return date.toISOString().slice(0, 10);
  });
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('170');
  const [gymSessionHours, setGymSessionHours] = useState('1');
  const [gymSessionsPerWeek, setGymSessionsPerWeek] = useState('3');

  useEffect(() => {
    if (value) {
      setCurrentWeight(String(value.currentWeight));
      setCurrentBodyFat(String(value.currentBodyFat));
      setGoalWeight(String(value.goalWeight));
      setGoalBodyFat(String(value.goalBodyFat));
      if (value.targetDate) {
        setTargetDate(value.targetDate);
      }
      setGender(value.gender || 'male');
      setAge(String(value.age || 30));
      setHeight(String(value.height || 170));
      setGymSessionHours(String(value.gymSessionHours));
      setGymSessionsPerWeek(String(value.gymSessionsPerWeek));
      // 値が設定されている場合は編集モードをオフにする
      setIsEditing(false);
    }
  }, [value]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const cw = parseFloat(currentWeight);
    const cbf = parseFloat(currentBodyFat);
    const gw = parseFloat(goalWeight);
    const gbf = parseFloat(goalBodyFat);
    const a = parseInt(age, 10);
    const h = parseFloat(height);
    const gsh = parseFloat(gymSessionHours);
    const gspw = parseInt(gymSessionsPerWeek, 10);

    // 数値の妥当性チェック（NaN、無限大、負の値などをチェック）
    if (
      !Number.isFinite(cw) || cw <= 0 || cw > 300 ||
      !Number.isFinite(gw) || gw <= 0 || gw > 300 ||
      !Number.isFinite(gsh) || gsh < 0 || gsh > 24 ||
      !Number.isFinite(gspw) || gspw < 0 || gspw > 7 ||
      !Number.isFinite(a) || a < 1 || a > 120 ||
      !Number.isFinite(h) || h < 100 || h > 250
    ) {
      alert('すべての数値を正しい範囲で入力してください。\n体重: 1-300kg, 年齢: 1-120歳, 身長: 100-250cm');
      return;
    }
    
    // 体脂肪率のチェック（任意項目だが、入力されている場合は妥当性チェック）
    if (!Number.isNaN(cbf) && (cbf < 0 || cbf > 100)) {
      alert('体脂肪率は0%以上100%以下で入力してください。');
      return;
    }
    
    if (!Number.isNaN(gbf) && (gbf < 0 || gbf > 100)) {
      alert('目標体脂肪率は0%以上100%以下で入力してください。');
      return;
    }

    const plan = computeCaloriePlan({
      currentWeight: cw,
      goalWeight: gw,
      targetDate: targetDate,
      gender: gender,
      age: a,
      height: h,
      gymSessionHours: gsh,
      gymSessionsPerWeek: gspw,
    });

    const settings: InitialSettings = {
      currentWeight: cw,
      currentBodyFat: Number.isNaN(cbf) ? 0 : cbf,
      goalWeight: gw,
      goalBodyFat: Number.isNaN(gbf) ? 0 : gbf,
      targetDate: targetDate,
      gender: gender,
      age: a,
      height: h,
      gymSessionHours: gsh,
      gymSessionsPerWeek: gspw,
      maintenanceKcal: plan.maintenanceKcal,
      gymDayTargetKcal: plan.gymDayTargetKcal,
      restDayTargetKcal: plan.restDayTargetKcal,
    };

    onChange(settings);
    setIsEditing(false); // 保存後は編集モードをオフにする
  };

  const handleCancel = () => {
    // 元の値に戻す
    if (value) {
      setCurrentWeight(String(value.currentWeight));
      setCurrentBodyFat(String(value.currentBodyFat));
      setGoalWeight(String(value.goalWeight));
      setGoalBodyFat(String(value.goalBodyFat));
      if (value.targetDate) {
        setTargetDate(value.targetDate);
      }
      setGender(value.gender || 'male');
      setAge(String(value.age || 30));
      setHeight(String(value.height || 170));
      setGymSessionHours(String(value.gymSessionHours));
      setGymSessionsPerWeek(String(value.gymSessionsPerWeek));
    }
    setIsEditing(false);
  };

  const isLocked = !!(value && !isEditing);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">初期設定</div>
        {isLocked && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            編集
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">現在の体重</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={currentWeight}
              onChange={e => setCurrentWeight(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">現在の体脂肪率</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={currentBodyFat}
              onChange={e => setCurrentBodyFat(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">目標体重</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">目標体脂肪率</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={goalBodyFat}
              onChange={e => setGoalBodyFat(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">目標達成日</label>
            <input
              type="date"
              className="input-field"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              required
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">性別</label>
            <select
              className="input-field"
              value={gender}
              onChange={e => setGender(e.target.value as 'male' | 'female')}
              required
              disabled={isLocked}
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">年齢</label>
            <input
              type="number"
              min="1"
              max="120"
              className="input-field"
              value={age}
              onChange={e => setAge(e.target.value)}
              required
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">身長</label>
            <input
              type="number"
              step="0.1"
              min="100"
              max="250"
              className="input-field"
              value={height}
              onChange={e => setHeight(e.target.value)}
              required
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">1回のジム時間</label>
            <input
              type="number"
              step="0.5"
              min="0"
              className="input-field"
              value={gymSessionHours}
              onChange={e => setGymSessionHours(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">週のジム回数</label>
            <input
              type="number"
              min="0"
              max="7"
              className="input-field"
              value={gymSessionsPerWeek}
              onChange={e => setGymSessionsPerWeek(e.target.value)}
              disabled={isLocked}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between pt-5 border-t border-gray-200">
          {!isLocked && (
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                {value ? '保存' : '計算'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
              )}
            </div>
          )}
          {value && (
            <div className="card px-5 py-4 space-y-3 text-xs">
              <div className="flex justify-between items-center gap-8">
                <span className="text-gray-500 font-medium">維持カロリー</span>
                <span className="font-medium text-gray-900">{value.maintenanceKcal} kcal</span>
              </div>
              <div className="flex justify-between items-center gap-8">
                <span className="text-gray-500 font-medium">ジムありの日</span>
                <span className="font-medium text-gray-900">{value.gymDayTargetKcal} kcal</span>
              </div>
              <div className="flex justify-between items-center gap-8">
                <span className="text-gray-500 font-medium">ジムなしの日</span>
                <span className="font-medium text-gray-900">{value.restDayTargetKcal} kcal</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </section>
  );
};
