-- Fix for infinite recursion and role constraints
-- Run this in your Supabase SQL Editor

-- 1. Update the role check constraint to include 'Administrador'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Agente', 'Gestor', 'Administrador', 'admin'));

-- 2. Create security definer functions to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor(area_color TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Gestor' AND color = area_color
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update policies to use these functions
-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true); -- Keep this simple to avoid recursion

-- Households
DROP POLICY IF EXISTS "Agents see their own households" ON households;
CREATE POLICY "Agents see their own households" ON households
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR is_admin() OR is_gestor(area_color)
  );

-- Patients
DROP POLICY IF EXISTS "Agents see their own patients" ON patients;
CREATE POLICY "Agents see their own patients" ON patients
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR is_admin() OR is_gestor(area_color)
  );

-- Visits
DROP POLICY IF EXISTS "Agents see their own visits" ON visits;
CREATE POLICY "Agents see their own visits" ON visits
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR is_admin() OR is_gestor(area_color)
  );
