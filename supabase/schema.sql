-- Supabaseテーブル構造
-- SupabaseダッシュボードのSQL Editorで実行してください

-- settings テーブル
-- 4桁番号などの任意の文字列キーで管理するため、user_id を TEXT に変更
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY,
  current_weight NUMERIC(5, 1) NOT NULL,
  current_body_fat NUMERIC(5, 1) NOT NULL,
  goal_weight NUMERIC(5, 1) NOT NULL,
  goal_body_fat NUMERIC(5, 1) NOT NULL,
  target_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  age INTEGER NOT NULL,
  height NUMERIC(5, 1) NOT NULL,
  gym_session_hours NUMERIC(3, 1) NOT NULL,
  gym_sessions_per_week INTEGER NOT NULL,
  maintenance_kcal INTEGER NOT NULL,
  gym_day_target_kcal INTEGER NOT NULL,
  rest_day_target_kcal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- entries テーブル
-- 4桁番号などの任意の文字列キーで管理するため、user_id を TEXT に変更
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  calories INTEGER NOT NULL,
  gym_hours NUMERIC(3, 1) NOT NULL,
  weight NUMERIC(5, 1),
  body_fat NUMERIC(5, 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Row Level Security (RLS)
-- ログインベースではなく「番号を知っている人は誰でもアクセスOK」という前提に変更
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- 認証情報に依存せず、すべての行へのアクセスを許可するポリシー
CREATE POLICY "Anyone can view settings with code"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert settings with code"
  ON settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update settings with code"
  ON settings FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can view entries with code"
  ON entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert entries with code"
  ON entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update entries with code"
  ON entries FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete entries with code"
  ON entries FOR DELETE
  USING (true);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);

