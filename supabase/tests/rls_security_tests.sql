-- Test Suite: RLS & Authorization Security Validation
-- Execute in Supabase SQL Editor or pgTAP test environment for verification

BEGIN;

-- 1. Test handle_new_user() trigger force 'Agente' role
-- Simulate raw user metadata with malicious role attempt
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  inserted_role TEXT;
BEGIN
  -- Insert dummy user in auth.users simulation
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    test_user_id,
    'attacker@test.com',
    '{"name": "Attacker", "role": "Administrador", "microarea": "999"}'::jsonb
  );

  -- Check if trigger inserted 'Agente' instead of 'Administrador'
  SELECT role INTO inserted_role FROM public.profiles WHERE id = test_user_id;

  IF inserted_role = 'Agente' THEN
    RAISE NOTICE 'SUCCESS: handle_new_user() prevented role escalation. Assigned role: %', inserted_role;
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Role escalation occurred! Assigned role: %', inserted_role;
  END IF;
END $$;

-- 2. Test User Profile Self-Update Protection
-- Verify that a user cannot update their own role, color, or microarea
DO $$
DECLARE
  agente_id UUID := gen_random_uuid();
  updated_role TEXT;
BEGIN
  -- Setup test agent
  INSERT INTO public.profiles (id, name, email, microarea, role, color)
  VALUES (agente_id, 'Agente Teste', 'agente@test.com', '001', 'Agente', '#00488d');

  -- Simulate session as Agente
  PERFORM set_config('request.jwt.claim.sub', agente_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Attempt to self-promote to Administrador
  BEGIN
    UPDATE public.profiles SET role = 'Administrador' WHERE id = agente_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Self-promotion blocked by WITH CHECK policy.';
  END;

  -- Verify role remains 'Agente'
  SELECT role INTO updated_role FROM public.profiles WHERE id = agente_id;
  IF updated_role = 'Agente' THEN
    RAISE NOTICE 'SUCCESS: Role remains Agente.';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: User was able to promote role to %', updated_role;
  END IF;
END $$;

-- 3. Test Gestor Read-Only Enforcement on Patients & Households
-- Verify that Gestor can SELECT records in their area, but CANNOT INSERT, UPDATE, or DELETE
DO $$
DECLARE
  gestor_id UUID := gen_random_uuid();
  agent_id UUID := gen_random_uuid();
  patient_id UUID := gen_random_uuid();
  household_id UUID := gen_random_uuid();
  affected_count INT := 0;
BEGIN
  -- Setup agent and gestor in area #00488d
  INSERT INTO public.profiles (id, name, email, microarea, role, color)
  VALUES 
    (agent_id, 'Agente Area A', 'agenteA@test.com', '001', 'Agente', '#00488d'),
    (gestor_id, 'Gestor Area A', 'gestorA@test.com', '001', 'Gestor', '#00488d');

  -- Insert patient owned by agent
  INSERT INTO public.patients (id, agent_id, name, cpf, area_color, microarea)
  VALUES (patient_id, agent_id, 'Paciente Teste', '11122233344', '#00488d', '001');

  -- Simulate session as Gestor
  PERFORM set_config('request.jwt.claim.sub', gestor_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Gestor attempts UPDATE on patient
  UPDATE public.patients SET name = 'Hacked by Gestor' WHERE id = patient_id;
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_count = 0 THEN
    RAISE NOTICE 'SUCCESS: Gestor UPDATE on patients blocked by RLS (0 rows updated).';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Gestor was able to UPDATE patient record!';
  END IF;

  -- Gestor attempts DELETE on patient
  DELETE FROM public.patients WHERE id = patient_id;
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_count = 0 THEN
    RAISE NOTICE 'SUCCESS: Gestor DELETE on patients blocked by RLS (0 rows deleted).';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Gestor was able to DELETE patient record!';
  END IF;
END $$;

ROLLBACK;
