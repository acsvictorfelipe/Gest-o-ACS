import * as React from 'react';
import { supabase } from '../lib/supabase';
import { encryptionService } from '../lib/encryption';
import { safeStorage } from '../lib/safeStorage';
import { generateUUID } from '../lib/utils';
import { healPatientVisitDate } from '../lib/dateUtils';

export interface SyncItem {
  id: string;
  name: string;
  done: boolean;
}

export function useDashboardAgenda(user: any, allPatients: any[], setAllPatients: React.Dispatch<React.SetStateAction<any[]>>) {
  const [dailyAgenda, setDailyAgenda] = React.useState<SyncItem[]>(() => {
    const saved = safeStorage.getItem('gestao_acs_daily_agenda');
    if (!saved) return [];
    const decrypted = encryptionService.decrypt(saved);
    try {
      return JSON.parse(decrypted || saved);
    } catch {
      return [];
    }
  });

  const saveAgenda = (newAgenda: SyncItem[]) => {
    setDailyAgenda(newAgenda);
    const serialized = JSON.stringify(newAgenda);
    const encrypted = encryptionService.encrypt(serialized);
    safeStorage.setItem('gestao_acs_daily_agenda', encrypted);
  };

  const handleAddToAgenda = (patientId: string) => {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;
    if (dailyAgenda.some(item => item.id === patientId)) return;
    saveAgenda([...dailyAgenda, { id: patient.id, name: patient.name, done: false }]);
  };

  const handleRemoveFromAgenda = (patientId: string) => {
    saveAgenda(dailyAgenda.filter(item => item.id !== patientId));
  };

  const handleToggleAgenda = async (patientId: string) => {
    const item = dailyAgenda.find(i => i.id === patientId);
    if (!item) return;
    const nextValue = !item.done;

    // Save current states for potential rollback
    const originalAgenda = [...dailyAgenda];
    const originalPatients = [...allPatients];

    // Optimistically update the agenda list checkmark status
    saveAgenda(dailyAgenda.map(it => it.id === patientId ? { ...it, done: nextValue } : it));

    if (nextValue) {
      // Optimistically update the last_visit_at on the local patients array so alerts go green instantly
      const nowISO = new Date().toISOString();
      setAllPatients(prev => prev.map(p => p.id === patientId ? { ...p, last_visit_at: nowISO } : p));

      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const newId = generateUUID();
        
        await supabase.from('visits').insert({
          id: newId,
          patient_id: patientId,
          agent_id: user.id,
          date: todayStr,
          type: 'Rotina',
          summary: 'Visita de rotina registrada via roteiro diário do painel.',
          microarea: user.microarea,
          area_color: user.color || '#00488d'
        });

        const healResult = await healPatientVisitDate(supabase, patientId, nowISO);
        if (!healResult.success) {
          throw new Error(healResult.error || 'Falha ao atualizar data da última visita do paciente');
        }
      } catch (err) {
        console.error('Error saving routine visit from agenda:', err);
        // Rollback states on error
        saveAgenda(originalAgenda);
        setAllPatients(originalPatients);
      }
    }
  };

  return {
    dailyAgenda,
    handleAddToAgenda,
    handleRemoveFromAgenda,
    handleToggleAgenda
  };
}
