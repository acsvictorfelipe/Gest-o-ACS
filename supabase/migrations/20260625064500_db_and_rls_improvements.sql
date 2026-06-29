-- Migration: DB and RLS improvements for Gestão ACS
-- 1. Create missing tables

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visit Requests
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_address TEXT,
  patient_cns TEXT,
  request_by UUID REFERENCES auth.users ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'done', 'dismissed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streets TEXT[] DEFAULT '{}';

-- 3. Enable RLS on new tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- Helper for gestor check without specific area color
CREATE OR REPLACE FUNCTION public.is_gestor_any()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Gestor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Set up safe RLS policies for campaigns
DROP POLICY IF EXISTS "Campaigns are viewable by authenticated users" ON public.campaigns;
CREATE POLICY "Campaigns are viewable by authenticated users" ON public.campaigns
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and Gestors can insert campaigns" ON public.campaigns;
CREATE POLICY "Admins and Gestors can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_gestor_any());

DROP POLICY IF EXISTS "Admins and Gestors can update campaigns" ON public.campaigns;
CREATE POLICY "Admins and Gestors can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (is_admin() OR is_gestor_any());

DROP POLICY IF EXISTS "Admins and Gestors can delete campaigns" ON public.campaigns;
CREATE POLICY "Admins and Gestors can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (is_admin() OR is_gestor_any());

-- 5. Set up safe RLS policies for system_logs
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs" ON public.system_logs
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert system_logs" ON public.system_logs;
CREATE POLICY "Authenticated users can insert system_logs" ON public.system_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Set up safe RLS policies for visit_requests
DROP POLICY IF EXISTS "Allow select on visit_requests" ON public.visit_requests;
CREATE POLICY "Allow select on visit_requests" ON public.visit_requests
  FOR SELECT TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor_any() OR auth.uid() = request_by);

DROP POLICY IF EXISTS "Allow insert on visit_requests" ON public.visit_requests;
CREATE POLICY "Allow insert on visit_requests" ON public.visit_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = request_by OR is_admin() OR is_gestor_any());

DROP POLICY IF EXISTS "Allow update on visit_requests" ON public.visit_requests;
CREATE POLICY "Allow update on visit_requests" ON public.visit_requests
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor_any());

DROP POLICY IF EXISTS "Allow delete on visit_requests" ON public.visit_requests;
CREATE POLICY "Allow delete on visit_requests" ON public.visit_requests
  FOR DELETE TO authenticated USING (is_admin() OR is_gestor_any());

-- 7. Complete RLS on existing tables

-- Profiles
DROP POLICY IF EXISTS "Allow profile insert for admins" ON public.profiles;
CREATE POLICY "Allow profile insert for admins" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Allow profile update for owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update for owners, admins, and gestors" ON public.profiles;
CREATE POLICY "Allow profile update for owners, admins, and gestors" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR is_admin() OR is_gestor(color));

DROP POLICY IF EXISTS "Allow profile delete for admins" ON public.profiles;
CREATE POLICY "Allow profile delete for admins" ON public.profiles
  FOR DELETE TO authenticated USING (is_admin());

-- Households
DROP POLICY IF EXISTS "Allow insert for agents and admins" ON public.households;
CREATE POLICY "Allow insert for agents and admins" ON public.households
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow update for owners, admins, and gestors" ON public.households;
CREATE POLICY "Allow update for owners, admins, and gestors" ON public.households
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

DROP POLICY IF EXISTS "Allow delete for owners, admins, and gestors" ON public.households;
CREATE POLICY "Allow delete for owners, admins, and gestors" ON public.households
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

-- Patients
DROP POLICY IF EXISTS "Allow patient insert for agents and admins" ON public.patients;
CREATE POLICY "Allow patient insert for agents and admins" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow patient update for owners, admins, and gestors" ON public.patients;
CREATE POLICY "Allow patient update for owners, admins, and gestors" ON public.patients
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

DROP POLICY IF EXISTS "Allow patient delete for owners, admins, and gestors" ON public.patients;
CREATE POLICY "Allow patient delete for owners, admins, and gestors" ON public.patients
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

-- Visits
DROP POLICY IF EXISTS "Allow visit insert for agents and admins" ON public.visits;
CREATE POLICY "Allow visit insert for agents and admins" ON public.visits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow visit update for owners, admins, and gestors" ON public.visits;
CREATE POLICY "Allow visit update for owners, admins, and gestors" ON public.visits
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

DROP POLICY IF EXISTS "Allow visit delete for owners, admins, and gestors" ON public.visits;
CREATE POLICY "Allow visit delete for owners, admins, and gestors" ON public.visits
  FOR DELETE TO authenticated USING (auth.uid() = agent_id OR is_admin() OR is_gestor(area_color));

-- 8. Normalization of category names
-- Replace 'Idosos' with 'Idoso' in the categories array
UPDATE public.patients
SET categories = array_replace(categories, 'Idosos', 'Idoso')
WHERE 'Idosos' = ANY(categories);

-- Replace 'Gestantes' with 'Gestante' in the categories array
UPDATE public.patients
SET categories = array_replace(categories, 'Gestantes', 'Gestante')
WHERE 'Gestantes' = ANY(categories);

-- Let's also do other common plurals to singular just in case:
UPDATE public.patients
SET categories = array_replace(categories, 'Crianças', 'Criança')
WHERE 'Crianças' = ANY(categories);

UPDATE public.patients
SET categories = array_replace(categories, 'Diabéticos', 'Diabético')
WHERE 'Diabéticos' = ANY(categories);

UPDATE public.patients
SET categories = array_replace(categories, 'Hipertensos', 'Hipertenso')
WHERE 'Hipertensos' = ANY(categories);

-- Deduplicate category elements in the array
UPDATE public.patients
SET categories = ARRAY(SELECT DISTINCT unnest(categories))
WHERE 'Idoso' = ANY(categories) OR 'Gestante' = ANY(categories) OR 'Criança' = ANY(categories) OR 'Diabético' = ANY(categories) OR 'Hipertenso' = ANY(categories);
