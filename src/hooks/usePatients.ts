import { useQuery } from '@tanstack/react-query';
import { fetchTableWithFilters } from '../lib/supabase';
import { AppUser, Patient } from '../types';

export function usePatients(user: AppUser | null | undefined) {
  return useQuery<Patient[]>({
    queryKey: ['patients', user?.id, user?.role, user?.color, user?.microarea],
    queryFn: async () => {
      if (!user) return [];
      return await fetchTableWithFilters<Patient>('patients', user);
    },
    enabled: !!user,
  });
}
