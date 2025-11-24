// lib/supabase/auth.ts
import { supabase } from './client';
import { User } from '@supabase/supabase-js';

// Supabaseが初期化されていない場合はエラーを投げる
function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabaseが初期化されていません。環境変数を確認してください。');
  }
  return supabase;
}

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string) {
  const client = ensureSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const client = ensureSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const client = ensureSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = ensureSupabase();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const client = ensureSupabase();
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return { subscription };
}

