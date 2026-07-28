-- Migration: Fix Security, RLS and Role Escalation Risks
-- Created: 2026-07-26

-- 1. Fix handle_new_user() trigger function
-- Force new self-registered users to always be assigned 'Agente' role in public.profiles,
-- regardless of what raw_user_meta_data->>'role' was provided during auth registration.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, microarea, role, color)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'microarea', '001'),
    'Agente', -- Always force minimal role 'Agente' for self-signup
    COALESCE(new.raw_user_meta_data->>'color', '#00488d')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Prevent role and privilege escalation on profiles UPDATE policy
-- Clean up previous UPDATE policies on public.profiles
DROP POLICY IF EXISTS "Allow profile update for owners, admins, and gestors" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update for owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Policy A: Normal users (Agentes) can update their own profile name, but CANNOT change privileged fields (role, microarea, color)
CREATE POLICY "Users can update their own profile safely" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
    color = (SELECT p.color FROM public.profiles p WHERE p.id = auth.uid()) AND
    microarea = (SELECT p.microarea FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Policy B: Admins can update any profile without field restrictions
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy C: Gestors can update profiles in their area
CREATE POLICY "Gestors can update area profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (is_gestor(color))
  WITH CHECK (is_gestor(color));

-- 4. Enforce strict Gestor read-only access on clinical records (households, patients, visits)
-- Agentes: full CRUD on their own records (agent_id = auth.uid())
-- Gestores: READ-ONLY for their assigned area_color (no INSERT, UPDATE, DELETE)
-- Administradores: global access

-- Clean up Gestor write policies on profiles
DROP POLICY IF EXISTS "Gestors can update area profiles" ON public.profiles;

-- Households Update & Delete
DROP POLICY IF EXISTS "Allow update for owners, admins, and gestors" ON public.households;
DROP POLICY IF EXISTS "Allow update for owners and admins" ON public.households;
CREATE POLICY "Allow update for owners and admins" ON public.households
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR is_admin())
  WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow delete for owners, admins, and gestors" ON public.households;
DROP POLICY IF EXISTS "Allow delete for owners and admins" ON public.households;
CREATE POLICY "Allow delete for owners and admins" ON public.households
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_id OR is_admin());

-- Patients Update & Delete
DROP POLICY IF EXISTS "Allow patient update for owners, admins, and gestors" ON public.patients;
DROP POLICY IF EXISTS "Allow patient update for owners and admins" ON public.patients;
CREATE POLICY "Allow patient update for owners and admins" ON public.patients
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR is_admin())
  WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow patient delete for owners, admins, and gestors" ON public.patients;
DROP POLICY IF EXISTS "Allow patient delete for owners and admins" ON public.patients;
CREATE POLICY "Allow patient delete for owners and admins" ON public.patients
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_id OR is_admin());

-- Visits Update & Delete
DROP POLICY IF EXISTS "Allow visit update for owners, admins, and gestors" ON public.visits;
DROP POLICY IF EXISTS "Allow visit update for owners and admins" ON public.visits;
CREATE POLICY "Allow visit update for owners and admins" ON public.visits
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR is_admin())
  WITH CHECK (auth.uid() = agent_id OR is_admin());

DROP POLICY IF EXISTS "Allow visit delete for owners, admins, and gestors" ON public.visits;
DROP POLICY IF EXISTS "Allow visit delete for owners and admins" ON public.visits;
CREATE POLICY "Allow visit delete for owners and admins" ON public.visits
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_id OR is_admin());

-- 5. Ensure all SECURITY DEFINER functions explicitly set search_path
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_gestor(TEXT) SET search_path = public;
ALTER FUNCTION public.is_gestor_any() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 6. Transactional deletion helper function for administrative user deletion
CREATE OR REPLACE FUNCTION public.delete_user_cascade(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.visits WHERE agent_id = target_user_id;
  DELETE FROM public.patients WHERE agent_id = target_user_id;
  DELETE FROM public.households WHERE agent_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
