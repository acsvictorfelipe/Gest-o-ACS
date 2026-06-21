export type UserRole = 'Agente' | 'Gestor' | 'Administrador' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  microarea?: string;
  role: UserRole | string;
  color: string;
  created_at?: string;
  streets?: string[];
}

export interface AppUser {
  id: string;
  email?: string;
  name: string;
  microarea?: string;
  role: UserRole | string;
  color: string;
  created_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
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

export interface Patient {
  id: string;
  name: string;
  cns: string;
  birth_date: string;
  gender: string;
  household_id?: string | null;
  is_family_responsible?: boolean;
  categories: string[];
  clinical_data?: Record<string, any>;
  microarea: string;
  area_color: string;
  agent_id: string;
  last_visit_at?: string | null;
  created_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  agent_id: string;
  date: string;
  type: string;
  summary?: string | null;
  microarea: string;
  area_color: string;
  created_at?: string;
  patients?: Patient;
}
