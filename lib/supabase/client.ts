// lib/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

// Supabaseを使用する場合のみクライアントを初期化
if (process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
}

export { supabase };

