import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AppUser, Visit } from '../types';

export function useVisits(user: AppUser | null | undefined) {
  return useQuery<Visit[]>({
    queryKey: ['visits', user?.id, user?.role, user?.color, user?.microarea],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from('visits').select('*');
      if (user.role === 'Gestor') {
        query = query.eq('area_color', user.color || '');
      } else if (user.role !== 'Administrador') {
        query = query.eq('agent_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Visit[];
    },
    enabled: !!user,
  });
}
