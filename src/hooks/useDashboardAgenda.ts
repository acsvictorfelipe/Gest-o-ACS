import * as React from 'react';
import { supabase } from '../lib/supabase';
import { encryptionService } from '../lib/encryption';
import { safeStorage } from '../lib/safeStorage';
import { generateUUID } from '../lib/utils';

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

    saveAgenda(dailyAgenda.map(it => it.id === patientId ? { ...it, done: nextValue } : it));

    if (nextValue) {
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

        const nowISO = new Date().toISOString();
        await supabase.from('patients')
          .update({ last_visit_at: nowISO })
          .eq('id', patientId);

        setAllPatients(prev => prev.map(p => p.id === patientId ? { ...p, last_visit_at: nowISO } : p));
      } catch (err) {
        console.error('Error saving routine visit from agenda:', err);
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
