import { User } from '@supabase/supabase-js';

export type UserRole = 'Agente' | 'Gestor' | 'Administrador' | 'admin';

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  microarea?: string;
  role?: UserRole | string;
  color?: string;
  created_at?: string;
  streets?: string[];
  last_login?: string;
}

export interface AppUser extends Partial<User> {
  id: string;
  email?: string;
  name?: string;
  microarea?: string;
  role?: UserRole | string;
  color?: string;
  created_at?: string;
  streets?: string[];
  last_login?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Patient {
  id: string;
  name: string;
  cns: string;
  birth_date: string;
  gender: string;
  household_id?: string;
  is_family_responsible?: boolean;
  categories: string[];
  clinical_data?: any;
  microarea: string;
  area_color: string;
  agent_id: string;
  last_visit_at?: string;
  created_at?: string;
}

export interface Household {
  id: string;
  address: string;
  number: string;
  complement?: string;
  reference?: string;
  microarea: string;
  area_color: string;
  agent_id: string;
  responsible_cns?: string;
  responsible_name?: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  agent_id: string;
  date: string;
  type: string;
  summary?: string;
  microarea: string;
  area_color: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  title: string;
  content: string;
  created_by: string;
  active: boolean;
  created_at?: string;
}

export interface SystemLog {
  id: string;
  user_id: string;
  action: string;
  details?: string;
  created_at?: string;
}
