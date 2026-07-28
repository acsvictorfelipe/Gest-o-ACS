import { describe, it, expect } from 'vitest';
import { isAdminRole, isGestorRole, isAgenteRole, canAccessMicroarea, canEditPatientData, getRoleBadgeColor } from '../roleUtils';

describe('roleUtils access control rules', () => {
  it('correctly identifies admin roles', () => {
    expect(isAdminRole('Administrador')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole('Gestor')).toBe(false);
    expect(isAdminRole('Agente')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it('correctly identifies gestor role', () => {
    expect(isGestorRole('Gestor')).toBe(true);
    expect(isGestorRole('Administrador')).toBe(false);
    expect(isGestorRole('Agente')).toBe(false);
  });

  it('correctly identifies agente role', () => {
    expect(isAgenteRole('Agente')).toBe(true);
    expect(isAgenteRole('Gestor')).toBe(false);
  });

  it('enforces microarea access rules', () => {
    const adminUser = { id: 'u1', role: 'Administrador' };
    const gestorUser = { id: 'u2', role: 'Gestor' };
    const agentUser = { id: 'u3', role: 'Agente', microarea: '001' };

    expect(canAccessMicroarea(adminUser, '002')).toBe(true);
    expect(canAccessMicroarea(gestorUser, '002')).toBe(true);
    expect(canAccessMicroarea(agentUser, '001')).toBe(true);
    expect(canAccessMicroarea(agentUser, '002')).toBe(false);
  });

  it('enforces patient edit permissions (Gestor is read-only)', () => {
    const adminUser = { id: 'u1', role: 'Administrador' };
    const gestorUser = { id: 'u2', role: 'Gestor' };
    const agentUser = { id: 'u3', role: 'Agente' };

    expect(canEditPatientData(adminUser, 'u3')).toBe(true);
    expect(canEditPatientData(gestorUser, 'u3')).toBe(false); // Read-only for Gestor
    expect(canEditPatientData(agentUser, 'u3')).toBe(true); // Own patient
    expect(canEditPatientData(agentUser, 'u4')).toBe(false); // Other agent patient
  });

  it('returns valid badge colors for roles', () => {
    expect(getRoleBadgeColor('Administrador')).toContain('purple');
    expect(getRoleBadgeColor('Gestor')).toContain('blue');
    expect(getRoleBadgeColor('Agente')).toContain('emerald');
  });
});
