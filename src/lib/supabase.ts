import { createClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

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
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: safeStorage,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

export async function fetchAllRows<T>(
  tableName: string,
  options?: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<T[]> {
  const selectQuery = options?.select || '*';
  let allData: T[] = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore && allData.length < (options?.limit || 10000)) {
    let query = supabase
      .from(tableName)
      .select(selectQuery)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching all rows from ${tableName}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...(data as unknown as T[])];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function fetchTableWithFilters<T>(
  tableName: string,
  user: any,
  options?: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  const selectQuery = options?.select || '*';
  let allData: T[] = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore && allData.length < 10000) {
    let query = supabase
      .from(tableName)
      .select(selectQuery)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (user) {
      if (user.role === 'Administrador' || user.role === 'admin') {
        // No filter
      } else if (user.role === 'Gestor') {
        query = query.eq('area_color', user.color);
      } else {
        query = query.eq('agent_id', user.id);
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching table ${tableName} with filters:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...(data as unknown as T[])];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}
