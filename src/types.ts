export type UserRole = 'Agente' | 'Gestor' | 'Administrador' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  microarea?: string;
  role: UserRole | string;
  color: string;
  created_at?: string;
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
