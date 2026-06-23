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
  let latestDate: Date | null = p.last_visit_at ? new Date(p.last_visit_at) : null;

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


