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

export const calculateAge = (birthDate: string) => {
  if (!birthDate) return '';
  const today = new Date();
  
  // Split the date string (YYYY-MM-DD) to avoid timezone shifts
  const parts = birthDate.split('-');
  if (parts.length !== 3) return '';
  const birthYear = parseInt(parts[0]);
  const birthMonth = parseInt(parts[1]) - 1; // 0-indexed
  const birthDay = parseInt(parts[2]);
  
  let years = today.getFullYear() - birthYear;
  let months = today.getMonth() - birthMonth;
  
  if (today.getDate() < birthDay) {
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

export const getAgeNumber = (birthDate: string) => {
  if (!birthDate) return 0;
  const today = new Date();
  
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;
  const birthYear = parseInt(parts[0]);
  const birthMonth = parseInt(parts[1]) - 1;
  const birthDay = parseInt(parts[2]);
  
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return age;
};

export const getAgeInMonths = (birthDate: string) => {
  if (!birthDate) return 0;
  
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;
  const birthYear = parseInt(parts[0]);
  const birthMonth = parseInt(parts[1]) - 1;
  const birthDay = parseInt(parts[2]);
  
  const today = new Date();
  let months = (today.getFullYear() - birthYear) * 12;
  months += today.getMonth() - birthMonth;
  if (today.getDate() < birthDay) {
    months--;
  }
  return Math.max(0, months);
};

// Verifica se o cidadão está na faixa etária de Criança (até 24 meses / 2 anos de vida exatos).
// Ao completar 24 meses e 1 dia, a função retorna false (deve transicionar para Adulto).
export const isChildAge = (birthDate: string): boolean => {
  if (!birthDate) return false;
  const parts = birthDate.split('-');
  if (parts.length !== 3) return false;
  const birthYear = parseInt(parts[0]);
  const birthMonth = parseInt(parts[1]) - 1;
  const birthDay = parseInt(parts[2]);
  
  const birth = new Date(birthYear, birthMonth, birthDay, 0, 0, 0);
  if (isNaN(birth.getTime())) return false;
  
  // Data exata de 2 anos (24 meses)
  const twoYears = new Date(birthYear + 2, birthMonth, birthDay, 23, 59, 59);
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
  const isAcamado = categories.includes('AcamadoDomiciliado') || categories.includes('Acamado / Domiciliado');
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

  // 2. Acamados e Saúde Mental de alta prioridade: acompanhamento a cada 60 dias
  if (isAcamado || isSaudeMental) {
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




