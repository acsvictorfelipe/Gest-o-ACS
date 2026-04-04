import { supabase } from './supabase';

export const supabaseService = {
  // Profiles
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Households
  async getHouseholds(agentId?: string, areaColor?: string) {
    let query = supabase.from('households').select('*');
    if (agentId) query = query.eq('agent_id', agentId);
    if (areaColor) query = query.eq('area_color', areaColor);
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async createHousehold(household: any) {
    const { data, error } = await supabase
      .from('households')
      .insert([household])
      .select()
      .single();
    return { data, error };
  },

  // Patients
  async getPatients(agentId?: string, areaColor?: string) {
    let query = supabase.from('patients').select('*');
    if (agentId) query = query.eq('agent_id', agentId);
    if (areaColor) query = query.eq('area_color', areaColor);
    const { data, error } = await query.order('name', { ascending: true });
    return { data, error };
  },

  async createPatient(patient: any) {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single();
    return { data, error };
  },

  // Visits
  async createVisit(visit: any) {
    const { data, error } = await supabase
      .from('visits')
      .insert([visit])
      .select()
      .single();
    return { data, error };
  }
};
