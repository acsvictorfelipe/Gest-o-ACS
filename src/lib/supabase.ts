import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const isBrowser = typeof window !== 'undefined';
  const config = isBrowser && (window as any).__SUPABASE_CONFIG__ ? (window as any).__SUPABASE_CONFIG__ : {};
  
  return {
    url: config.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: config.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
};

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please configure them in your AI Studio Environment Variables (Secrets).');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
