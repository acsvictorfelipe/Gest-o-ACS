-- Initial Schema for Gestão ACS

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  microarea TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Agente' CHECK (role IN ('Agente', 'Gestor', 'admin')),
  color TEXT NOT NULL DEFAULT '#00488d',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Households
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  reference TEXT,
  microarea TEXT NOT NULL,
  area_color TEXT NOT NULL,
  agent_id UUID REFERENCES auth.users NOT NULL,
  responsible_cns TEXT,
  responsible_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cns TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL,
  household_id UUID REFERENCES households ON DELETE CASCADE,
  is_family_responsible BOOLEAN DEFAULT FALSE,
  categories TEXT[] DEFAULT '{}',
  clinical_data JSONB DEFAULT '{}'::jsonb,
  microarea TEXT NOT NULL,
  area_color TEXT NOT NULL,
  agent_id UUID REFERENCES auth.users NOT NULL,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Visits
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES auth.users NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  summary TEXT,
  microarea TEXT NOT NULL,
  area_color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Households
CREATE POLICY "Agents see their own households" ON households
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Gestor' AND color = households.area_color)
  );

CREATE POLICY "Agents can insert their own households" ON households
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own households" ON households
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id);

-- Patients
CREATE POLICY "Agents see their own patients" ON patients
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Gestor' AND color = patients.area_color)
  );

CREATE POLICY "Agents can insert their own patients" ON patients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own patients" ON patients
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id);

-- Visits
CREATE POLICY "Agents see their own visits" ON visits
  FOR SELECT TO authenticated USING (
    auth.uid() = agent_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Gestor' AND color = visits.area_color)
  );

CREATE POLICY "Agents can insert their own visits" ON visits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

-- Trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, microarea, role, color)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'microarea',
    COALESCE(new.raw_user_meta_data->>'role', 'Agente'),
    COALESCE(new.raw_user_meta_data->>'color', '#00488d')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
