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
  if (!dateStr) return 'N/A';
  // Split the date string (YYYY-MM-DD) to avoid timezone shifts
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};
