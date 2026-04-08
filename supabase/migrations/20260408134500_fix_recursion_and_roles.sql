-- Fix for infinite recursion and role constraints
-- Run this in your Supabase SQL Editor

-- 1. Update the role check constraint to include 'Administrador'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Agente', 'Gestor', 'Administrador', 'admin'));

-- 2. Create security definer functions to bypass RLS recursion
-- We use SECURITY DEFINER and set a search_path to prevent recursion and ensure security
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_gestor(area_color TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Gestor' AND color = area_color
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Clean up ALL existing policies on profiles to ensure no hidden recursion
-- This is the "Nuclear Option" to stop the infinite loop
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- 4. Recreate only the SAFE policies for profiles
-- Authenticated users can see all profiles (needed for UI and internal checks)
-- This policy is NOT recursive because it doesn't query the profiles table in its USING clause
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Users can only update their own basic info
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Update policies for other tables to use the non-recursive functions
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
