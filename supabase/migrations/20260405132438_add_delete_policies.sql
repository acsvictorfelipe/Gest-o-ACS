-- Migration to allow Agents to delete their own records

-- 1. Allow Agents to delete their own Households
CREATE POLICY "Agentes excluem seus domicílios" ON households 
FOR DELETE TO authenticated 
USING (auth.uid() = agent_id);

-- 2. Allow Agents to delete their own Patients
CREATE POLICY "Agentes excluem seus pacientes" ON patients 
FOR DELETE TO authenticated 
USING (auth.uid() = agent_id);

-- 3. Allow Agents to delete their own Visits
CREATE POLICY "Agentes excluem suas visitas" ON visits 
FOR DELETE TO authenticated 
USING (auth.uid() = agent_id);
