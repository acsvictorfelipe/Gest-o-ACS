import { supabase } from './supabase';

export interface VisitRequest {
  id: string;
  agent_id: string;
  patient_id: string;
  patient_name: string;
  patient_address?: string;
  patient_cns?: string;
  request_by: string;
  sender_name: string;
  status: 'pending' | 'accepted' | 'done' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'gestao_acs_visit_requests';

// Get local requests fallback
const getLocalRequests = (): VisitRequest[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error parsing local visit requests:', e);
    return [];
  }
};

// Save local requests fallback
const saveLocalRequests = (requests: VisitRequest[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving local visit requests:', e);
  }
};

export const visitRequestService = {
  async fetchAll(): Promise<VisitRequest[]> {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table probably doesn't exist, fallback to local storage
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return getLocalRequests();
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('Supabase visit_requests failed, using localStorage fallback:', err);
      return getLocalRequests();
    }
  },

  async create(request: Omit<VisitRequest, 'id' | 'created_at' | 'status'>): Promise<VisitRequest> {
    const newRequest: VisitRequest = {
      ...request,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .insert(newRequest)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          const locals = getLocalRequests();
          locals.unshift(newRequest);
          saveLocalRequests(locals);
          return newRequest;
        }
        throw error;
      }
      return data || newRequest;
    } catch (err) {
      console.warn('Supabase insert visit_request failed, using localStorage fallback:', err);
      const locals = getLocalRequests();
      locals.unshift(newRequest);
      saveLocalRequests(locals);
      return newRequest;
    }
  },

  async updateStatus(id: string, status: VisitRequest['status'], notes?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status, notes })
        .eq('id', id);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          const locals = getLocalRequests();
          const targetIndex = locals.findIndex(r => r.id === id);
          if (targetIndex !== -1) {
            locals[targetIndex].status = status;
            if (notes !== undefined) {
              locals[targetIndex].notes = notes;
            }
            saveLocalRequests(locals);
            return true;
          }
          return false;
        }
        throw error;
      }
      return true;
    } catch (err) {
      console.warn('Supabase update visit_request failed, using localStorage fallback:', err);
      const locals = getLocalRequests();
      const targetIndex = locals.findIndex(r => r.id === id);
      if (targetIndex !== -1) {
        locals[targetIndex].status = status;
        if (notes !== undefined) {
          locals[targetIndex].notes = notes;
        }
        saveLocalRequests(locals);
        return true;
      }
      return false;
    }
  }
};
