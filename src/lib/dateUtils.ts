export const VACCINE_SCHEDULE = [
  { age: 0, label: 'Ao nascer', vaccines: [
    { id: 'bcg', label: 'BCG' },
    { id: 'hepB_nascer', label: 'Hep B' }
  ]},
  { age: 2, label: '2 meses', vaccines: [
    { id: 'penta1', label: 'Penta (1ª dose)' },
    { id: 'vip1', label: 'VIP (1ª dose)' },
    { id: 'pneumo10_1', label: 'Pneumo 10 (1ª dose)' },
    { id: 'rotavirus1', label: 'Rotavírus Humano (1ª dose)' }
  ]},
  { age: 3, label: '3 meses', vaccines: [
    { id: 'menC1', label: 'MenC (1ª dose)' }
  ]},
  { age: 4, label: '4 meses', vaccines: [
    { id: 'penta2', label: 'Penta (2ª dose)' },
    { id: 'vip2', label: 'VIP (2ª dose)' },
    { id: 'pneumo10_2', label: 'Pneumo 10 (2ª dose)' },
    { id: 'rotavirus2', label: 'Rotavírus Humano (2ª dose)' }
  ]},
  { age: 5, label: '5 meses', vaccines: [
    { id: 'menC2', label: 'MenC (2ª dose)' }
  ]},
  { age: 6, label: '6 meses', vaccines: [
    { id: 'penta3', label: 'Penta (3ª dose)' },
    { id: 'vip3', label: 'VIP (3ª dose)' }
  ]},
  { age: 9, label: '9 meses', vaccines: [
    { id: 'fa', label: 'FA (Febre Amarela)' }
  ]},
  { age: 12, label: '12 meses', vaccines: [
    { id: 'scr1', label: 'SCR (Tríplice Viral)' },
    { id: 'pneumo10_3', label: 'Pneumo 10 (3ª dose)' },
    { id: 'menC3', label: 'MenC (3ª dose)' }
  ]},
  { age: 15, label: '15 meses', vaccines: [
    { id: 'dtp', label: 'DTP' },
    { id: 'vipR', label: 'VIP (R)' },
    { id: 'hepA', label: 'Hep A' },
    { id: 'scrv', label: 'SCRV (Tetra Viral)' }
  ]}
];

export const vaccineLabels: Record<string, string> = {
  penta2m: 'Penta 2 Meses',
  penta4m: 'Penta 4 Meses',
  penta6m: 'Penta 6 Meses',
  dtp15m: 'DTP 15 meses',
  dtp4y: 'DTP 4 anos',
  hepB: 'Hepatite B',
  vip2m: 'VIP 2 meses',
  vip4m: 'VIP 4 meses',
  vip6m: 'VIP 6 meses',
  vop15m: 'VOP 15 meses',
  vop4y: 'VOP 4 anos',
  scr2m: 'SCR 2 meses',
  scr15m: 'SCR 15 meses',
  pneumo2m: 'Pneumo10 2 meses',
  pneumo4m: 'Pneumo10 4 meses',
  pneumo12m: 'Pneumo10 12 meses',
  visitaAcs1: '1ª Visita ACS',
  visitaAcs2: '2ª Visita ACS',
  consultaMedicaAnualData: 'Consulta Médica Anual',
  avaliacaoPes: 'Avaliação dos Pés',
  consultas6Meses: 'Consultas nos últimos 6 meses',
  hemoglobinaGlicada: 'Hemoglobina Glicada',
  vacinaInfluenza: 'Vacina Influenza',
  exameCitopatologico: 'Exame Citopatológico',
  saudeSexualReprodutiva: 'Saúde Sexual Reprodutiva',
  mamografia: 'Mamografia',
  vacinaHpv: 'Vacina HPV'
};

/**
 * Categorias válidas de pacientes.
 * Use sempre essas constantes para evitar typos.
 */
export const PATIENT_CATEGORIES = {
  CRIANCA:           'Criança',
  GESTANTE:          'Gestante',
  ADULTO:            'Adulto',
  IDOSO:             'Idoso',
  ACAMADO:           'Acamado',
  DOMICILIADO:       'Domiciliado',
  ACAMADO_LEGACY:    'AcamadoDomiciliado',
  SAUDE_MENTAL:      'SaudeMental',
} as const;

export type PatientCategory = (typeof PATIENT_CATEGORIES)[keyof typeof PATIENT_CATEGORIES];

/**
 * Verifica se um paciente deve ser tratado como Criança (≤ 24 meses).
 * Centraliza a regra que antes estava duplicada em useDashboard, usePatientList e usePatientFormSave.
 *
 * Regra de desempate:
 *  - Se birth_date existir → usa isChildAge (cálculo de data exato)
 *  - Caso contrário → verifica se a categoria 'Criança' está no array (cadastro incompleto)
 */
export function isPatientChild(patient: { birth_date?: string | null; categories?: string[] | null }): boolean {
  if (patient.birth_date) {
    return isChildAge(patient.birth_date);
  }
  const cats = Array.isArray(patient.categories) ? patient.categories : [];
  return cats.some(c => c === 'Criança' || c === 'crianca' || c === 'Crianças');
}

/**
 * Verifica se um paciente é diagnosticado com Diabetes.
 */
export function isPatientDiabetic(patient: any): boolean {
  if (!patient) return false;
  const clinical = patient.clinical_data || {};
  const categories = Array.isArray(patient.categories) ? patient.categories : [];
  return (
    clinical.chronic?.diabetes === 'Sim' ||
    clinical.gestante?.diabetes === 'Sim' ||
    clinical.acamadodomiciliado?.diabetes === 'Sim' ||
    clinical.adulto?.diabetes === 'Sim' ||
    clinical.idoso?.diabetes === 'Sim' ||
    categories.some((c: string) => c === 'Diabético' || c === 'Diabéticos' || c === 'diabeticos' || c === 'diabéticos')
  );
}

/**
 * Verifica se um paciente diabético faz uso de Insulina.
 */
export function isPatientInsulinUser(patient: any): boolean {
  if (!patient || !isPatientDiabetic(patient)) return false;
  const clinical = patient.clinical_data || {};
  const isTrue = (val: any) => val === true || val === 'Sim' || val === 'sim' || val === 'true' || val === 1;

  return (
    isTrue(clinical.chronic?.diabetesData?.usoInsulina) ||
    isTrue(clinical.chronic?.usoInsulina) ||
    isTrue(clinical.chronic?.toma_insulina) ||
    isTrue(clinical.gestante?.diabetesData?.usoInsulina) ||
    isTrue(clinical.acamadodomiciliado?.diabetesData?.usoInsulina) ||
    isTrue(clinical.adulto?.diabetesData?.usoInsulina) ||
    isTrue(clinical.idoso?.diabetesData?.usoInsulina) ||
    isTrue(clinical.uso_insulina) ||
    isTrue(clinical.toma_insulina) ||
    isTrue(clinical.insulina)
  );
}

/**
 * Verifica se um paciente é diagnosticado com Hipertensão Arterial.
 */
export function isPatientHipertenso(patient: any): boolean {
  if (!patient) return false;
  const clinical = patient.clinical_data || {};
  const categories = Array.isArray(patient.categories) ? patient.categories : [];
  return (
    clinical.chronic?.hipertensao === 'Sim' ||
    clinical.gestante?.hipertensao === 'Sim' ||
    clinical.gestante?.pressaoAlta === 'Sim' ||
    clinical.acamadodomiciliado?.hipertensao === 'Sim' ||
    clinical.acamadodomiciliado?.pressaoAlta === 'Sim' ||
    clinical.idoso?.hipertensao === 'Sim' ||
    clinical.idoso?.pressaoAlta === 'Sim' ||
    clinical.adulto?.hipertensao === 'Sim' ||
    clinical.adulto?.pressaoAlta === 'Sim' ||
    categories.some((c: string) => c === 'Hipertenso' || c === 'Hipertensos' || c === 'hipertensos' || c === 'hipertenso')
  );
}

/**
 * Verifica se um paciente recebe Bolsa Família.
 */
export function isPatientBolsaFamilia(patient: any): boolean {
  if (!patient) return false;
  const clinical = patient.clinical_data || {};
  const benefits = Array.isArray(clinical.socialBenefits) ? clinical.socialBenefits : [];
  const categories = Array.isArray(patient.categories) ? patient.categories : [];

  const matchesBolsa = (s: string) => {
    if (!s || typeof s !== 'string') return false;
    const norm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return norm.includes('bolsa familia') || norm.includes('bolsa_familia') || norm === 'bf';
  };

  return (
    benefits.some(matchesBolsa) ||
    categories.some(matchesBolsa) ||
    clinical.bolsa_familia === true ||
    clinical.bolsa_familia === 'Sim' ||
    clinical.bolsa_familia === 'sim' ||
    clinical.bolsaFamilia === true ||
    clinical.bolsaFamilia === 'Sim' ||
    clinical.bolsaFamilia === 'sim'
  );
}

/**
 * Verifica se um paciente é Acamado (restrito ao leito).
 * Mantém retrocompatibilidade com registros legados 'AcamadoDomiciliado'.
 */
export function isPatientAcamado(patient: any): boolean {
  if (!patient) return false;
  const cats: string[] = Array.isArray(patient.categories) ? patient.categories : [];
  const cond = patient.clinical_data?.acamadodomiciliado?.condicao;
  if (cats.includes('Acamado')) return true;
  if (cats.includes('AcamadoDomiciliado') || cats.includes('Acamado / Domiciliado')) {
    return cond !== 'Domiciliado';
  }
  return false;
}

/**
 * Verifica se um paciente é Domiciliado (restrito ao domicílio, não necessariamente acamado).
 */
export function isPatientDomiciliado(patient: any): boolean {
  if (!patient) return false;
  const cats: string[] = Array.isArray(patient.categories) ? patient.categories : [];
  const cond = patient.clinical_data?.acamadodomiciliado?.condicao;
  if (cats.includes('Domiciliado')) return true;
  if (
    (cats.includes('AcamadoDomiciliado') || cats.includes('Acamado / Domiciliado')) &&
    (cond === 'Domiciliado' || cond === 'Acamado e Domiciliado')
  ) {
    return true;
  }
  return false;
}

/**
 * Verifica se um paciente é Acamado ou Domiciliado.
 */
export function isPatientAcamadoOuDomiciliado(patient: any): boolean {
  return isPatientAcamado(patient) || isPatientDomiciliado(patient);
}

/**
 * Verifica se o paciente é do sexo feminino (para relatórios separados de saúde da mulher).
 */
export function isPatientWoman(patient: any): boolean {
  if (!patient) return false;
  const cats: string[] = Array.isArray(patient.categories) ? patient.categories : [];
  if (cats.includes('Gestante')) return true;
  const rawGender = String(patient.gender || patient.clinical_data?.gender || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return rawGender === 'feminino' || rawGender === 'f' || rawGender === 'mulher' || rawGender === 'fem';
}

/**
 * Verifica se um paciente é beneficiário do BPC / LOAS.
 */
export function isPatientLoas(patient: any): boolean {
  if (!patient) return false;
  const clinical = patient.clinical_data || {};
  const benefits = Array.isArray(clinical.socialBenefits) ? clinical.socialBenefits : [];
  const categories = Array.isArray(patient.categories) ? patient.categories : [];

  const matchesLoas = (s: string) => {
    if (!s || typeof s !== 'string') return false;
    const norm = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return norm.includes('loas') || norm.includes('bpc');
  };

  const isTrue = (val: any) => val === true || val === 'Sim' || val === 'sim' || val === 'true' || val === 1;

  return (
    benefits.some(matchesLoas) ||
    categories.some(matchesLoas) ||
    isTrue(clinical.loas) ||
    isTrue(clinical.bpc) ||
    isTrue(clinical.bpc_loas) ||
    isTrue(clinical.bpcLoas)
  );
}

/**
 * Verifica se um paciente é Idoso (categoria Idoso ou idade >= 60 anos).
 */
export function isPatientIdoso(patient: any): boolean {
  if (!patient) return false;
  const categories = Array.isArray(patient.categories) ? patient.categories : [];
  const ageNum = patient.birth_date ? getAgeNumber(patient.birth_date) : 0;
  return (
    categories.some((c: string) => c === 'Idoso' || c === 'Idosos' || c === 'idoso' || c === 'idosos') ||
    (ageNum >= 60 && !isPatientChild(patient))
  );
}

export const parseBirthDate = (birthDate: any): Date | null => {
  if (!birthDate) return null;
  if (birthDate instanceof Date) return isNaN(birthDate.getTime()) ? null : birthDate;
  if (typeof birthDate !== 'string') return null;
  
  const clean = birthDate.trim();
  if (!clean) return null;

  // Handle ISO strings (ex: 2024-05-10T12:00:00Z)
  const datePart = clean.includes('T') ? clean.split('T')[0] : clean;

  // Handle YYYY-MM-DD
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
  }

  // Handle DD/MM/YYYY or YYYY/MM/DD
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d, 12, 0, 0);
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d, 12, 0, 0);
      }
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
};

export const calculateAge = (birthDate: string) => {
  const birth = parseBirthDate(birthDate);
  if (!birth) return '';
  const today = new Date();
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years < 0) return '0 Anos e 0 Meses';

  const yearsStr = years === 1 ? '1 Ano' : `${years} Anos`;
  
  if (years < 5) {
    const monthsStr = months === 1 ? '1 Mês' : `${months} Meses`;
    return `${yearsStr} e ${monthsStr}`;
  }
  
  return yearsStr;
};

export const getAgeNumber = (birthDate: string): number => {
  const birth = parseBirthDate(birthDate);
  if (!birth) return 0;
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

export const getAgeInMonths = (birthDate: string): number => {
  const birth = parseBirthDate(birthDate);
  if (!birth) return 0;
  
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  return Math.max(0, months);
};

// Verifica se o cidadão está na faixa etária de Criança (até 24 meses / 2 anos de vida exatos).
// Ao completar 24 meses e 1 dia, a função retorna false (deve transicionar para Adulto).
export const isChildAge = (birthDate: string): boolean => {
  const birth = parseBirthDate(birthDate);
  if (!birth) return false;
  
  const twoYears = new Date(birth);
  twoYears.setFullYear(twoYears.getFullYear() + 2);
  twoYears.setHours(23, 59, 59, 999);
  
  const today = new Date();
  return today <= twoYears;
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Handle ISO strings by taking only the date part
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};
export const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  // Create date at noon local time to avoid timezone shifts
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
};

// Algoritmo de validação oficial do Cartão SUS (CNS)
export const validateCNS = (cns: string): boolean => {
  if (!cns) return false;
  const cleanCns = cns.replace(/\D/g, '');
  if (cleanCns.length !== 15) return false;

  const firstDigit = cleanCns[0];
  if (!['1', '2', '7', '8', '9'].includes(firstDigit)) return false;

  if (['1', '2'].includes(firstDigit)) {
    // CNS Permanente
    const pis = cleanCns.substring(0, 11);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(pis[i]) * (15 - i);
    }
    const rest = sum % 11;
    let dv = 11 - rest;
    if (dv === 11) dv = 0;

    let result = '';
    if (dv === 10) {
      sum += 2;
      const newRest = sum % 11;
      let newDv = 11 - newRest;
      if (newDv === 11) newDv = 0;
      result = pis + "001" + String(newDv);
    } else {
      result = pis + "000" + String(dv);
    }
    return cleanCns === result;
  } else if (['7', '8', '9'].includes(firstDigit)) {
    // CNS Provisório
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(cleanCns[i]) * (15 - i);
    }
    return sum % 11 === 0;
  }

  return false;
};

export function getPatientLastVisitAt(p: any): string | null {
  if (!p) return null;
  let latestDate: Date | null = null;

  if (p.last_visit_at) {
    const initialD = new Date(p.last_visit_at);
    if (!isNaN(initialD.getTime())) {
      latestDate = initialD;
    }
  }

  const checkDate = (dStr: any) => {
    if (!dStr) return;
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      if (!latestDate || d > latestDate) {
        latestDate = d;
      }
    }
  };

  const clinical = p.clinical_data || {};

  // Check general visits (ACS visits only, general consultations are excluded)
  if (Array.isArray(clinical.visitasGerais)) {
    clinical.visitasGerais.forEach((v: any) => {
      if (typeof v === 'string') checkDate(v);
      else if (v && typeof v === 'object') checkDate(v.date);
    });
  }

  // Check child milestones (only ACS visits are included; clinical.crianca.consultas are excluded)
  if (clinical.crianca) {
    if (Array.isArray(clinical.crianca.visitasAcs)) {
      clinical.crianca.visitasAcs.forEach((d: any) => checkDate(d));
    }
    checkDate(clinical.crianca.visita30dias);
    checkDate(clinical.crianca.visita6meses);
  }

  // Check gestante milestones (only ACS visits are included; clinical.gestante.consultas and puerperioConsulta are excluded)
  if (clinical.gestante) {
    if (Array.isArray(clinical.gestante.visitasAcs)) {
      clinical.gestante.visitasAcs.forEach((d: any) => checkDate(d));
    }
    checkDate(clinical.gestante.puerperioVisita);
  }

  // Check visits under other categories (including chronic)
  const categoriesWithDiabetesAndHypertension = ['gestante', 'acamadodomiciliado', 'adulto', 'idoso', 'chronic'];
  categoriesWithDiabetesAndHypertension.forEach(cat => {
    const section = clinical[cat];
    if (section) {
      if (Array.isArray(section.visitasAcsDiabetes)) {
        section.visitasAcsDiabetes.forEach((d: any) => checkDate(d));
      }
      if (section.diabetesData) {
        checkDate(section.diabetesData.visitaAcs1);
        checkDate(section.diabetesData.visitaAcs2);
      }
      if (section.hipertensaoData) {
        checkDate(section.hipertensaoData.visitaAcs1);
        checkDate(section.hipertensaoData.visitaAcs2);
      }
    }
  });

  // Check special idoso milestones (only ACS visits are included; consultaMedicaAnualData is excluded)
  if (clinical.idoso) {
    checkDate(clinical.idoso.visitaAcs1);
    checkDate(clinical.idoso.visitaAcs2);
  }

  return latestDate ? latestDate.toISOString() : null;
}

export function getPatientVisitInterval(p: any): number {
  if (!p) return 180; // Padrão semestral

  const categories = p.categories || [];
  const clinical = p.clinical_data || {};

  const isGestante = categories.includes('Gestante');
  const isAcamadoOuDomiciliado = isPatientAcamadoOuDomiciliado(p);
  const isSaudeMental = categories.includes('SaudeMental') || categories.includes('Saúde Mental');

  const isDiabetico = clinical.chronic?.diabetes === 'Sim' || 
                      clinical.gestante?.diabetes === 'Sim' || 
                      clinical.acamadodomiciliado?.diabetes === 'Sim' || 
                      clinical.adulto?.diabetes === 'Sim' || 
                      clinical.idoso?.diabetes === 'Sim';

  const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || 
                       clinical.gestante?.hipertensao === 'Sim' || 
                       clinical.gestante?.pressaoAlta === 'Sim' || 
                       clinical.acamadodomiciliado?.hipertensao === 'Sim' || 
                       clinical.acamadodomiciliado?.pressaoAlta === 'Sim' || 
                       clinical.adulto?.hipertensao === 'Sim' || 
                       clinical.adulto?.pressaoAlta === 'Sim' || 
                       clinical.idoso?.hipertensao === 'Sim' || 
                       clinical.idoso?.pressaoAlta === 'Sim';

  // 1. Gestantes: recomendação mensal, com tolerância máxima de 60 dias para atraso (mínimo de 3 visitas ACS no pré-natal)
  if (isGestante) {
    return 60;
  }

  // 2. Acamados, Domiciliados e Saúde Mental de alta prioridade: acompanhamento a cada 60 dias
  if (isAcamadoOuDomiciliado || isSaudeMental) {
    return 60;
  }

  // 3. Hipertensos e Diabéticos: acompanhamento semestral (2 visitas no ano = 180 dias / D+180)
  if (isDiabetico || isHipertenso) {
    return 180;
  }

  // 4. Crianças menores de 2 anos: acompanhamento por marcos de desenvolvimento (semestral 180 dias para rotina geral)
  const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
  if (categories.includes('Criança') && ageInMonths <= 24) {
    return 180;
  }

  // 5. Idosos e População Geral: semestral (180 dias)
  return 180;
}

export function isVisitLate(lastVisitAt: string | null | undefined, patient?: any): boolean {
  if (!patient) {
    if (!lastVisitAt) return true;
    return false;
  }

  const categories = patient.categories || [];
  const clinical = patient.clinical_data || {};
  const ageInMonths = patient.birth_date ? getAgeInMonths(patient.birth_date) : 999;

  // Criança de 1 a 5 meses que já realizou a visita de 30 dias (ou marcada como não realizada): não está em atraso
  if (categories.includes('Criança') && ageInMonths < 6) {
    const has30DaysHandled = Boolean(clinical.crianca?.visita30dias) || 
                             Boolean(clinical.crianca?.visita30diasNaoRealizada) || 
                             Boolean(lastVisitAt);
    if (has30DaysHandled && ageInMonths >= 1) {
      return false;
    }
  }

  if (!lastVisitAt) return true;
  
  const allowedInterval = getPatientVisitInterval(patient);
  
  try {
    const cleanDateStr = lastVisitAt.includes('T') ? lastVisitAt.split('T')[0] : lastVisitAt;
    const parts = cleanDateStr.split('-');
    if (parts.length !== 3) return true;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    // Cria data ao meio-dia para independência de fuso horário
    const lastVisitDate = new Date(year, month, day, 12, 0, 0);
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    
    const diffTime = todayNoon.getTime() - lastVisitDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays > allowedInterval;
  } catch (e) {
    console.warn('Error parsing last visit date in isVisitLate:', e);
    return true;
  }
}

/**
 * Retorna status granular da visita de um paciente, com detecção de faixa
 * intermediária "expiring" adaptada por categoria (ex: ≤30 dias para semestral 180d, ≤15 dias para gestantes).
 */
export function getVisitStatus(lastVisitAt: string | null | undefined, patient?: any): {
  status: 'ok' | 'expiring' | 'overdue' | 'never';
  daysRemaining: number;
  daysSinceVisit: number;
  interval: number;
} {
  const interval = getPatientVisitInterval(patient);

  if (!patient) {
    return { status: lastVisitAt ? 'ok' : 'never', daysRemaining: 0, daysSinceVisit: 0, interval };
  }

  const categories = patient.categories || [];
  const clinical = patient.clinical_data || {};
  const ageInMonths = patient.birth_date ? getAgeInMonths(patient.birth_date) : 999;

  // Regra de marcos para crianças até 6 meses (respeitando justificativa de não realizada)
  if (categories.includes('Criança') && ageInMonths < 6) {
    const has30DaysHandled = Boolean(clinical.crianca?.visita30dias) || 
                             Boolean(clinical.crianca?.visita30diasNaoRealizada) || 
                             Boolean(lastVisitAt);
    if (has30DaysHandled) {
      if (ageInMonths >= 5 && !clinical.crianca?.visita6meses && !clinical.crianca?.visita6mesesNaoRealizada) {
        return { status: 'expiring', daysRemaining: 15, daysSinceVisit: 150, interval: 180 };
      }
      return { status: 'ok', daysRemaining: 60, daysSinceVisit: 30, interval: 180 };
    }
  }

  if (!lastVisitAt) {
    return { status: 'never', daysRemaining: 0, daysSinceVisit: 999, interval };
  }

  try {
    const cleanDateStr = lastVisitAt.includes('T') ? lastVisitAt.split('T')[0] : lastVisitAt;
    const parts = cleanDateStr.split('-');
    if (parts.length !== 3) {
      return { status: 'never', daysRemaining: 0, daysSinceVisit: 999, interval };
    }

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    const lastVisitDate = new Date(year, month, day, 12, 0, 0);
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);

    const diffTime = todayNoon.getTime() - lastVisitDate.getTime();
    const daysSinceVisit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = interval - daysSinceVisit;

    if (daysSinceVisit > interval) {
      return { status: 'overdue', daysRemaining, daysSinceVisit, interval };
    }

    // Faixa de atenção de proximidade:
    // Para prazos semestrais (180 dias / hipertensos / diabéticos), alertar com 30 dias de antecedência
    // Para gestantes e demais, alertar com 15 dias de antecedência
    const expiringThreshold = interval >= 180 ? 30 : 15;
    if (daysRemaining <= expiringThreshold) {
      return { status: 'expiring', daysRemaining, daysSinceVisit, interval };
    }

    return { status: 'ok', daysRemaining, daysSinceVisit, interval };
  } catch (e) {
    console.warn('Error in getVisitStatus:', e);
    return { status: 'never', daysRemaining: 0, daysSinceVisit: 999, interval };
  }
}


/**
 * Explicit, observable, and testable operation to heal/sync a patient's last_visit_at
 * in the database when explicitly triggered (e.g. after adding a visit or running a manual sync).
 */
export async function healPatientVisitDate(
  supabaseClient: any,
  patientId: string,
  targetDate: string
): Promise<{ success: boolean; error?: string }> {
  if (!patientId || !targetDate) {
    return { success: false, error: 'patientId and targetDate are required' };
  }
  try {
    const { error } = await supabaseClient
      .from('patients')
      .update({ last_visit_at: targetDate })
      .eq('id', patientId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Substitui ocorrências exatas de uma data (YYYY-MM-DD) dentro de clinical_data
 * ao alterar a data de uma visita já registrada.
 */
export function replaceDateInClinicalData(
  clinicalData: any,
  fromDate: string,
  toDate: string
): { updated: any; changed: boolean } {
  const fromDay = String(fromDate || '').split('T')[0];
  const toDay = String(toDate || '').split('T')[0];

  if (!clinicalData || typeof clinicalData !== 'object' || !fromDay || !toDay || fromDay === toDay) {
    return { updated: clinicalData, changed: false };
  }

  let changed = false;
  const updated = JSON.parse(JSON.stringify(clinicalData));

  const replaceScalar = (val: any) => {
    if (typeof val === 'string' && val.split('T')[0] === fromDay) {
      changed = true;
      return toDay;
    }
    return val;
  };

  if (Array.isArray(updated.visitasGerais)) {
    updated.visitasGerais = updated.visitasGerais.map((v: any) => {
      if (typeof v === 'string') return replaceScalar(v);
      if (v && typeof v === 'object' && typeof v.date === 'string' && v.date.split('T')[0] === fromDay) {
        changed = true;
        return { ...v, date: toDay };
      }
      return v;
    });
  }

  if (updated.crianca && typeof updated.crianca === 'object') {
    if (Array.isArray(updated.crianca.visitasAcs)) {
      updated.crianca.visitasAcs = updated.crianca.visitasAcs.map(replaceScalar);
    }
    if (updated.crianca.visita30dias) updated.crianca.visita30dias = replaceScalar(updated.crianca.visita30dias);
    if (updated.crianca.visita6meses) updated.crianca.visita6meses = replaceScalar(updated.crianca.visita6meses);
  }

  if (updated.gestante && typeof updated.gestante === 'object') {
    if (Array.isArray(updated.gestante.visitasAcs)) {
      updated.gestante.visitasAcs = updated.gestante.visitasAcs.map(replaceScalar);
    }
    if (updated.gestante.puerperioVisita) {
      updated.gestante.puerperioVisita = replaceScalar(updated.gestante.puerperioVisita);
    }
  }

  const chronicSections = ['gestante', 'acamadodomiciliado', 'adulto', 'idoso', 'chronic'];
  chronicSections.forEach((cat) => {
    const section = updated[cat];
    if (section && typeof section === 'object') {
      if (Array.isArray(section.visitasAcsDiabetes)) {
        section.visitasAcsDiabetes = section.visitasAcsDiabetes.map(replaceScalar);
      }
      if (section.diabetesData && typeof section.diabetesData === 'object') {
        if (section.diabetesData.visitaAcs1) section.diabetesData.visitaAcs1 = replaceScalar(section.diabetesData.visitaAcs1);
        if (section.diabetesData.visitaAcs2) section.diabetesData.visitaAcs2 = replaceScalar(section.diabetesData.visitaAcs2);
      }
      if (section.hipertensaoData && typeof section.hipertensaoData === 'object') {
        if (section.hipertensaoData.visitaAcs1) section.hipertensaoData.visitaAcs1 = replaceScalar(section.hipertensaoData.visitaAcs1);
        if (section.hipertensaoData.visitaAcs2) section.hipertensaoData.visitaAcs2 = replaceScalar(section.hipertensaoData.visitaAcs2);
      }
    }
  });

  if (updated.idoso && typeof updated.idoso === 'object') {
    if (updated.idoso.visitaAcs1) updated.idoso.visitaAcs1 = replaceScalar(updated.idoso.visitaAcs1);
    if (updated.idoso.visitaAcs2) updated.idoso.visitaAcs2 = replaceScalar(updated.idoso.visitaAcs2);
  }

  return { updated, changed };
}

/**
 * Recalcula a verdadeira última data de visita do paciente combinando as visitas
 * da tabela `visits` e os campos clínicos, ignorando o valor antigo de `last_visit_at`.
 */
export function recomputePatientLastVisitAt(
  patient: any,
  dbVisits: Array<{ date?: string | null }> = []
): string | null {
  let latestMs = -1;
  let latestDay: string | null = null;

  const considerDate = (raw: any) => {
    if (!raw || typeof raw !== 'string') return;
    const day = raw.split('T')[0];
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? new Date(`${day}T12:00:00`)
      : new Date(raw);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > latestMs) {
      latestMs = parsed.getTime();
      latestDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : parsed.toISOString().split('T')[0];
    }
  };

  if (Array.isArray(dbVisits)) {
    dbVisits.forEach((v) => considerDate(v?.date));
  }

  const clinicalMax = getPatientLastVisitAt({ ...(patient || {}), last_visit_at: null });
  if (clinicalMax) {
    considerDate(clinicalMax);
  }

  if (!latestDay) return null;
  return new Date(`${latestDay}T12:00:00`).toISOString();
}

/**
 * Calcula a idade gestacional com base na DUM (Data da Última Menstruação).
 * Retorna { weeks, days, text, shortText } ou null caso DUM seja inválida, futura ou superior a 44 semanas.
 */
export function calculateGestationalAge(dum?: string | null): { weeks: number; days: number; text: string; shortText: string } | null {
  if (!dum) return null;
  const parts = String(dum).split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dumDate = new Date(y, m, d);
  if (isNaN(dumDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dumDate.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dumDate.getTime();
  if (diffMs < 0) return null;

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  if (weeks > 44) return null;

  const text = days === 0 
    ? `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
    : `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} e ${days} ${days === 1 ? 'dia' : 'dias'}`;

  const shortText = days === 0
    ? `${weeks} sem`
    : `${weeks}s ${days}d`;

  return { weeks, days, text, shortText };
}




