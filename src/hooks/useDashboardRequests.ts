import * as React from 'react';
import { supabase } from '../lib/supabase';
import { visitRequestService } from '../lib/visitRequests';
import { generateUUID } from '../lib/utils';

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
    try {
      const ok = await visitRequestService.updateStatus(requestId, status, notes);
      if (ok) {
        const req = visitRequests.find(r => r.id === requestId);
        
        // If accepted, add to agenda immediately
        if (status === 'accepted') {
          if (req && req.patient_id) {
            handleAddToAgenda(req.patient_id);
          }
        } else if (status === 'done') {
          // If done, create real visit row and set last_visit_at
          if (req && req.patient_id) {
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
            await supabase.from('patients')
              .update({ last_visit_at: nowISO })
              .eq('id', req.patient_id);

            setAllPatients(prev => prev.map(p => p.id === req.patient_id ? { ...p, last_visit_at: nowISO } : p));
          }
        }
        setRequestsRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error('Error updating visit request status:', e);
    }
  };

  return {
    visitRequests,
    handleUpdateVisitRequestStatus,
    triggerRefresh: () => setRequestsRefreshTrigger(prev => prev + 1)
  };
}
