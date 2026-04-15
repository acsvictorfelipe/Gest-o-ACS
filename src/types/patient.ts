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
  diabetes: string;
  diabetesData: DiabetesData;
  hipertensao: string;
  hipertensaoData: HipertensaoData;
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
}

export interface CriancaVacinas {
  bcg: string;
  hepB_nascer: string;
  penta1: string;
  penta2: string;
  penta3: string;
  vip1: string;
  vip2: string;
  vip3: string;
  vipR: string;
  pneumo10_1: string;
  pneumo10_2: string;
  pneumo10_3: string;
  rotavirus1: string;
  rotavirus2: string;
  menC1: string;
  menC2: string;
  menC3: string;
  fa: string;
  scr1: string;
  dtp: string;
  hepA: string;
  scrv: string;
  [key: string]: string; // Allow legacy properties
}

export interface CriancaData {
  consultas: string[];
  visitasAcs: string[];
  visita30dias: string;
  visita6meses: string;
  proximaVisitaSugerida: string;
  vacinas: CriancaVacinas;
}

export interface AdultoData {
  diabetes: string;
  diabetesData: DiabetesData;
  visitasAcsDiabetes: string[];
  hipertensao: string;
  hipertensaoData: HipertensaoData;
  notes: string;
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
}

export interface GeneralVisit {
  date: string;
  summary: string;
}

export interface ClinicalData {
  visitasGerais: GeneralVisit[];
  socialBenefits: string[];
  saudeMental: SaudeMentalData;
  chronic: ChronicData;
  acamadodomiciliado: AcamadoDomiciliadoData;
  gestante: GestanteData;
  crianca: CriancaData;
  adulto: AdultoData;
  idoso: IdosoData;
  rastreamento: RastreamentoData;
}

export interface PatientFormData {
  name: string;
  cns: string;
  responsibleCns: string;
  isFamilyResponsible: boolean;
  birthDate: string;
  gender: string;
  visitDate: string;
  visitType: string;
  visitSummary: string;
  address: string;
  number: string;
  complement: string;
  contact: string;
  messageContact: string;
  householdId: string;
  categories: string[];
  clinicalData: ClinicalData;
}
