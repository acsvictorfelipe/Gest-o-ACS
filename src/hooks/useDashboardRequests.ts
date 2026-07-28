import * as React from 'react';
import { supabase } from '../lib/supabase';
import { visitRequestService } from '../lib/visitRequests';
import { generateUUID } from '../lib/utils';
import { healPatientVisitDate } from '../lib/dateUtils';

export function useDashboardRequests(
  user: any,
  setAllPatients: React.Dispatch<React.SetStateAction<any[]>>,
  handleAddToAgenda: (patientId: string) => void
) {
  const [visitRequests, setVisitRequests] = React.useState<any[]>([]);
  const [requestsRefreshTrigger, setRequestsRefreshTrigger] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id) return;
    const loadRequests = async () => {
      try {
        const reqs = await visitRequestService.fetchAll();
        const pendedAndAssigned = reqs.filter(r => r.agent_id === user.id);
        setVisitRequests(pendedAndAssigned);
      } catch (visErr) {
        console.warn("Error fetching agent visit requests:", visErr);
      }
    };
    loadRequests();
  }, [user?.id, requestsRefreshTrigger]);

  const handleUpdateVisitRequestStatus = async (
    requestId: string,
    status: 'pending' | 'accepted' | 'done' | 'dismissed',
    notes?: string
  ) => {
    const originalVisitRequests = [...visitRequests];
    const req = visitRequests.find(r => r.id === requestId);
    if (!req) return;

    // 1. Optimistically update the visit requests list
    setVisitRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));

    // 2. Optimistically add to agenda immediately if accepted
    if (status === 'accepted' && req.patient_id) {
      handleAddToAgenda(req.patient_id);
    }

    // 3. Optimistically update last_visit_at in state if done
    let originalPatients: any[] | null = null;
    if (status === 'done' && req.patient_id) {
      const nowISO = new Date().toISOString();
      setAllPatients(prev => {
        originalPatients = prev;
        return prev.map(p => p.id === req.patient_id ? { ...p, last_visit_at: nowISO } : p);
      });
    }

    try {
      const ok = await visitRequestService.updateStatus(requestId, status, notes);
      if (ok) {
        if (status === 'done' && req.patient_id) {
          // If done, create real visit row and set last_visit_at in database
          const todayStr = new Date().toISOString().split('T')[0];
          const newId = generateUUID();
          
          await supabase.from('visits').insert({
            id: newId,
            patient_id: req.patient_id,
            agent_id: user.id,
            date: todayStr,
            type: 'Solicitada',
            summary: notes || req.reason || 'Visita solicitada marcada como concluída.',
            microarea: user.microarea,
            area_color: user.color || '#00488d'
          });

          const nowISO = new Date().toISOString();
          const healResult = await healPatientVisitDate(supabase, req.patient_id, nowISO);
          if (!healResult.success) {
            console.error('Failed to sync patient last_visit_at:', healResult.error);
          }
        }
        // Silently refresh to ensure absolute sync with server values
        setRequestsRefreshTrigger(prev => prev + 1);
      } else {
        // Rollback on failure
        setVisitRequests(originalVisitRequests);
        if (originalPatients) {
          setAllPatients(originalPatients);
        }
      }
    } catch (e) {
      console.error('Error updating visit request status:', e);
      // Rollback on error
      setVisitRequests(originalVisitRequests);
      if (originalPatients) {
        setAllPatients(originalPatients);
      }
    }
  };

  return {
    visitRequests,
    handleUpdateVisitRequestStatus,
    triggerRefresh: () => setRequestsRefreshTrigger(prev => prev + 1)
  };
}
