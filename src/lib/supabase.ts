import { createClient } from '@supabase/supabase-js';
import { isAdminRole, isGestorRole } from './roleUtils';
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
      if (isAdminRole(user.role)) {
        // No filter
      } else if (isGestorRole(user.role)) {
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

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export async function fetchPaginatedTable<T>(
  tableName: string,
  user: any,
  options?: {
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    searchColumn?: string;
    searchTerm?: string;
    countMethod?: 'exact' | 'planned' | 'estimated' | null;
  }
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(200, Math.max(1, options?.pageSize || 50));
  const selectQuery = options?.select || '*';
  const fromIndex = (page - 1) * pageSize;
  const toIndex = page * pageSize - 1;

  const countOption = options?.countMethod !== undefined ? options.countMethod : 'exact';

  let query = countOption
    ? supabase.from(tableName).select(selectQuery, { count: countOption as any })
    : supabase.from(tableName).select(selectQuery);

  if (user) {
    if (isAdminRole(user.role)) {
      // No area/agent restriction
    } else if (isGestorRole(user.role)) {
      query = query.eq('area_color', user.color);
    } else {
      query = query.eq('agent_id', user.id);
    }
  }

  if (options?.searchColumn && options?.searchTerm?.trim()) {
    query = query.ilike(options.searchColumn, `%${options.searchTerm.trim()}%`);
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }

  query = query.range(fromIndex, toIndex);

  const { data, count, error } = await query;

  if (error) {
    console.error(`Error fetching paginated data from ${tableName}:`, error);
    throw error;
  }

  const totalCount = count || (data ? data.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return {
    data: (data || []) as unknown as T[],
    count: totalCount,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages
  };
}

