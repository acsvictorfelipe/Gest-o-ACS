-- Database Migration for Admin Features: Campaigns, System Logs, and Multi-agent transfers
-- Run this in your Supabase SQL Editor

-- 1. Create Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for campaigns
DROP POLICY IF EXISTS "Campaigns are viewable by all authenticated users" ON public.campaigns;
CREATE POLICY "Campaigns are viewable by all authenticated users" ON public.campaigns
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.is_admin());

-- 2. Create System Logs Table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for system_logs
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins and team gestores can view system logs" ON public.system_logs;
CREATE POLICY "Admins and team gestores can view system logs" ON public.system_logs
  FOR SELECT TO authenticated USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p_gestor
      JOIN public.profiles p_user ON p_gestor.color = p_user.color
      WHERE p_gestor.id = auth.uid() 
        AND p_gestor.role = 'Gestor' 
        AND p_user.id = user_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert system logs" ON public.system_logs;
CREATE POLICY "Authenticated users can insert system logs" ON public.system_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Update update/delete policies for Households to allow Admins and Gestors (team coordinators)
DROP POLICY IF EXISTS "Agents can update their own households" ON public.households;
DROP POLICY IF EXISTS "Agents and admins can update households" ON public.households;
CREATE POLICY "Agents and admins/gestors can update households" ON public.households
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR public.is_admin() OR public.is_gestor(area_color));

DROP POLICY IF EXISTS "Agentes excluem seus domicílios" ON public.households;
DROP POLICY IF EXISTS "Agents and admins can delete households" ON public.households;
DROP POLICY IF EXISTS "Agents and admins/gestors can delete households" ON public.households;
CREATE POLICY "Agents and admins/gestors can delete households" ON public.households
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR public.is_admin() OR public.is_gestor(area_color));

-- 4. Update update/delete policies for Patients to allow Admins and Gestors
DROP POLICY IF EXISTS "Agents can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Agents and admins can update patients" ON public.patients;
CREATE POLICY "Agents and admins/gestors can update patients" ON public.patients
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR public.is_admin() OR public.is_gestor(area_color));

DROP POLICY IF EXISTS "Agentes excluem seus pacientes" ON public.patients;
DROP POLICY IF EXISTS "Agents and admins can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Agents and admins/gestors can delete patients" ON public.patients;
CREATE POLICY "Agents and admins/gestors can delete patients" ON public.patients
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR public.is_admin() OR public.is_gestor(area_color));

-- 5. Update delete policies for Visits to allow Admins and Gestors
DROP POLICY IF EXISTS "Agentes excluem suas visitas" ON public.visits;
DROP POLICY IF EXISTS "Agents and admins can delete visits" ON public.visits;
DROP POLICY IF EXISTS "Agents and admins/gestors can delete visits" ON public.visits;
CREATE POLICY "Agents and admins/gestors can delete visits" ON public.visits
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR public.is_admin() OR public.is_gestor(area_color));
