import { User } from '@supabase/supabase-js';

export type UserRole = 'Agente' | 'Gestor' | 'Administrador' | 'admin';

export * from './types/database';

export interface Campaign {
  id: string;
  title: string;
  content: string;
  created_by: string;
  active: boolean;
  created_at?: string;
}
