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

// Calcula a próxima data de visita com base em uma data inicial e um intervalo em dias
export const calculateNextVisit = (dateStr: string, intervalDays: number): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  date.setDate(date.getDate() + intervalDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Retorna um alerta de visita com base na data calculada
export const getVisitAlert = (nextVisitDate: string): { type: 'warning' | 'error'; message: string } | null => {
  if (!nextVisitDate) return null;
  const parts = nextVisitDate.split('-');
  if (parts.length !== 3) return null;
  const next = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { type: 'error', message: `Visita atrasada em ${Math.abs(diffDays)} dia(s)` };
  }
  if (diffDays <= 30) {
    return { type: 'warning', message: `Próxima visita em ${diffDays} dia(s)` };
  }
  return null;
};

// Verifica se a consulta médica anual está atrasada ou próxima (intervalo de 365 dias)
export const getConsultationAlert = (dateStr: string): { type: 'warning' | 'error'; message: string } | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const consultation = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  const nextConsultation = new Date(consultation);
  nextConsultation.setDate(nextConsultation.getDate() + 365);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.ceil((nextConsultation.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { type: 'error', message: `Consulta anual atrasada em ${Math.abs(diffDays)} dia(s)` };
  }
  if (diffDays <= 30) {
    return { type: 'warning', message: `Consulta anual vence em ${diffDays} dia(s)` };
  }
  return null;
};
