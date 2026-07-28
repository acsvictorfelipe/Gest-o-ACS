import { AppUser, UserProfile } from '../types/database';

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === 'administrador' || normalized === 'admin';
}

export function isGestorRole(role?: string | null): boolean {
  if (!role) return false;
  return role === 'Gestor';
}

export function isAgenteRole(role?: string | null): boolean {
  if (!role) return false;
  return role === 'Agente';
}

export function canAccessMicroarea(user?: AppUser | UserProfile | null, targetMicroarea?: string): boolean {
  if (!user) return false;
  if (isAdminRole(user.role) || isGestorRole(user.role)) return true;
  if (!targetMicroarea) return false;
  return user.microarea === targetMicroarea;
}

export function canEditPatientData(user?: AppUser | UserProfile | null, patientAgentId?: string): boolean {
  if (!user) return false;
  if (isGestorRole(user.role)) return false; // Gestor is read-only
  if (isAdminRole(user.role)) return true; // Admin can edit any
  return user.id === patientAgentId || !patientAgentId;
}

export function getRoleBadgeColor(role?: string | null): string {
  if (isAdminRole(role)) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';
  if (isGestorRole(role)) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
}
