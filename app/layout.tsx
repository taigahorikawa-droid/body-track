// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Body Track | 体重・カロリー管理',
  description: 'Inbody 風のシンプルな体重・カロリー管理アプリ（ローカル専用）',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-white">
        {children}
      </body>
    </html>
  );
}
