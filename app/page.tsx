// app/page.tsx
'use client';

import { useState } from 'react';
import { InitialSetupForm } from '@/components/InitialSetupForm';
import { DailyEntryForm } from '@/components/DailyEntryForm';
import { ChartSection } from '@/components/ChartSection';
import { useLocalStorageState } from '@/lib/useLocalStorage';
import { DailyEntry, InitialSettings } from '@/types';

type Tab = 'setup' | 'entry' | 'chart';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('entry');
  const [settings, setSettings] = useLocalStorageState<InitialSettings | null>(
    'weight-app-initial-settings',
    null
  );
  const [entries, setEntries] = useLocalStorageState<DailyEntry[]>(
    'weight-app-daily-entries',
    []
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-normal tracking-wide text-gray-900">
            Body Track
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          {/* デスクトップ: 3カラムレイアウト */}
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {/* 左: 日次記録 */}
            <div>
              <DailyEntryForm entries={entries} onChange={setEntries} settings={settings} />
            </div>
            {/* 中央: チャート */}
            <div>
              <ChartSection settings={settings} entries={entries} />
            </div>
            {/* 右: 初期設定 */}
            <div>
              <InitialSetupForm value={settings} onChange={setSettings} />
            </div>
          </div>

          {/* モバイル: タブ切り替え表示 */}
          <div className="lg:hidden">
            {activeTab === 'entry' && (
              <div className="transition-opacity duration-300">
                <DailyEntryForm entries={entries} onChange={setEntries} settings={settings} />
              </div>
            )}
            {activeTab === 'chart' && (
              <div className="transition-opacity duration-300">
                <ChartSection settings={settings} entries={entries} />
              </div>
            )}
            {activeTab === 'setup' && (
              <div className="transition-opacity duration-300">
                <InitialSetupForm value={settings} onChange={setSettings} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 下部固定タブバー（モバイルのみ） */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white safe-area-inset-bottom lg:hidden">
        <div className="grid grid-cols-3 max-w-7xl mx-auto relative">
          {/* アクティブインジケーター */}
          <div
            className={`tab-indicator ${
              activeTab === 'entry' ? 'left-0' : activeTab === 'chart' ? 'left-1/3' : 'left-2/3'
            }`}
          />
          <button
            onClick={() => setActiveTab('entry')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors duration-200 ${
              activeTab === 'entry'
                ? 'text-emerald-600'
                : 'text-gray-500'
            }`}
          >
            <svg
              className={`h-5 w-5 ${activeTab === 'entry' ? 'text-emerald-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            <span className={`text-[10px] font-medium transition-colors duration-200 ${activeTab === 'entry' ? 'text-emerald-600' : 'text-gray-500'}`}>
              記録
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors duration-200 ${
              activeTab === 'chart'
                ? 'text-emerald-600'
                : 'text-gray-500'
            }`}
          >
            <svg
              className={`h-5 w-5 ${activeTab === 'chart' ? 'text-emerald-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <span className={`text-[10px] font-medium transition-colors duration-200 ${activeTab === 'chart' ? 'text-emerald-600' : 'text-gray-500'}`}>
              チャート
            </span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors duration-200 ${
              activeTab === 'setup'
                ? 'text-emerald-600'
                : 'text-gray-500'
            }`}
          >
            <svg
              className={`h-5 w-5 ${activeTab === 'setup' ? 'text-emerald-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className={`text-[10px] font-medium transition-colors duration-200 ${activeTab === 'setup' ? 'text-emerald-600' : 'text-gray-500'}`}>
              設定
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

