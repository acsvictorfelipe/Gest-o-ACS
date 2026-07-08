export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  microarea?: string;
  role?: string;
  color?: string;
  created_at?: string;
  streets?: string[];
  last_login?: string;
}

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
  microarea?: string;
  role?: string;
  color?: string;
  created_at?: string;
  streets?: string[];
  last_login?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface DiabetesData {
  avaliacaoPes: string;
  hemoglobinaGlicada: string;
  visitaAcs1: string;
  visitaAcs2: string;
}

export interface HipertensaoData {
  consultas6Meses: string;
  visitaAcs1: string;
  visitaAcs2: string;
}

export interface ChronicData {
  diabetes: string;
  diabetesData: DiabetesData;
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  pressao_aferida_semestre?: string;
  afericao_recente?: string;
  hba1c_semestre?: string;
  exame_recente?: string;
}

export interface AcamadoDomiciliadoData {
  dependencia: string;
  curativos: string;
  cuidador: string;
  usoFralda: string;
  tamanhoFralda: string;
  diabetes: string;
  diabetesData: DiabetesData;
  visitasAcsDiabetes: string[];
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  observacoes: string;
  pressaoAlta?: string;
}

export interface GestanteData {
  dum: string;
  dpp: string;
  consultas: string[];
  visitasAcs: string[];
  visitasAcsDiabetes: string[];
  dtpa: string;
  sifilis: string;
  hepatiteB: string;
  hiv: string;
  hepatiteC: string;
  puerperioConsulta: string;
  puerperioVisita: string;
  saudeBucal: string;
  planejamentoFamiliar: string;
  diabetes: string;
  diabetesData: DiabetesData;
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  notes: string;
  pressaoAlta?: string;
  consulta_odontologica?: string;
}

export interface CriancaData {
  consultas: string[];
  visitasAcs: string[];
  visita30dias: string;
  visita6meses: string;
  proximaVisitaSugerida: string;
  vacinas: Record<string, string>;
  notes: string;
  vacina_1ano_completa?: string;
}

export interface AdultoData {
  diabetes: string;
  diabetesData: DiabetesData;
  visitasAcsDiabetes: string[];
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  notes: string;
  pressaoAlta?: string;
}

export interface IdosoData {
  diabetes: string;
  diabetesData: DiabetesData;
  visitasAcsDiabetes: string[];
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  vacinaInfluenza: string;
  visitaAcs1: string;
  visitaAcs2: string;
  consultaMedicaAnualData: string;
  pressaoAlta?: string;
}

export interface SaudeMentalData {
  notes: string;
}

export interface RastreamentoData {
  exameCitopatologico: string;
  saudeSexualReprodutiva: string;
  mamografia: string;
  vacinaHpv: string;
}

export interface ReceitaData {
  id?: string;
  dataEmissao: string;
  validade: string;
  dataVencimento: string;
  medicamentos?: string;
  notes?: string;
}

export interface VisitaGeralData {
  date: string;
  summary?: string;
  type?: string;
}

export interface ConsultaGeralData {
  date: string;
  summary?: string;
}

export interface ClinicalData {
  sus_atualizado?: string;
  historicoGestacoes?: any[];
  visitasGerais?: VisitaGeralData[];
  consultasGerais?: ConsultaGeralData[];
  socialBenefits?: string[];
  receitas?: ReceitaData[];
  saudeMental?: SaudeMentalData;
  chronic?: ChronicData;
  acamadodomiciliado?: AcamadoDomiciliadoData;
  gestante?: GestanteData;
  crianca?: CriancaData;
  adulto?: AdultoData;
  idoso?: IdosoData;
  rastreamento?: RastreamentoData;
  contact?: string;
  contact2?: string;
  message_contact?: string;
  responsible_cns?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
}

export interface Patient {
  id: string;
  name: string;
  cns: string;
  birth_date: string;
  gender: string;
  household_id?: string | null;
  is_family_responsible?: boolean;
  categories: string[];
  clinical_data?: ClinicalData;
  microarea: string;
  area_color: string;
  agent_id: string;
  last_visit_at?: string | null;
  created_at?: string;
  households?: Household | null;
}

export interface Household {
  id: string;
  address: string;
  number: string;
  complement?: string;
  reference?: string;
  microarea: string;
  area_color: string;
  agent_id: string;
  responsible_cns?: string;
  responsible_name?: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  agent_id: string;
  date: string;
  type: string;
  summary?: string;
  microarea: string;
  area_color: string;
  created_at?: string;
}

export interface SystemLog {
  id: string;
  user_id: string;
  action: string;
  details?: string;
  created_at?: string;
}
