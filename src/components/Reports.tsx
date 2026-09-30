import React, { useState, useEffect, useMemo } from 'react';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { 
  BarChart3, 
  Search, 
  Filter, 
  FileDown, 
  Loader2,
  Baby,
  HeartPulse,
  User,
  Smile,
  Bed,
  Activity,
  Gift,
  Users,
  Home,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  Droplets,
  Printer,
  FileText,
  LayoutGrid,
  ArrowUpDown
} from 'lucide-react';
import { UI_CONFIG } from '../constants';

import { 
  calculateAge, 
  getAgeInMonths, 
  getAgeNumber,
  VACCINE_SCHEDULE, 
  formatDate, 
  isPatientChild, 
  isPatientDiabetic, 
  isPatientInsulinUser, 
  isPatientHipertenso, 
  isPatientBolsaFamilia 
} from '../lib/dateUtils';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';

export function Reports({ user }: { user: any }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Geral');
  const [domiciliosViewMode, setDomiciliosViewMode] = useState<'esus' | 'cards'>('esus');
  const [streetFilter, setStreetFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [visits, setVisits] = useState<any[]>([]);
  const [fetchingVisits, setFetchingVisits] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!user.microarea && !isAdminRole(user.role) && !isGestorRole(user.role)) return;
      setLoading(true);
      try {
        // Fetch Patients using central helper
        const allPatients = await fetchTableWithFilters<any>('patients', user, {
          orderBy: { column: 'name', ascending: true }
        });

        // Fetch Households using central helper
        const allHouseholds = await fetchTableWithFilters<any>('households', user, {
          select: '*, patients(id, name, birth_date, cns, is_family_responsible, categories, clinical_data, contact)',
          orderBy: { column: 'address', ascending: true }
        });

        setPatients(allPatients || []);
        setHouseholds(allHouseholds || []);
      } catch (error) {
        console.error("Error fetching data for reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.microarea, user?.id, user?.role, user?.color]);

  useEffect(() => {
    if (categoryFilter !== 'Produção Mensal') return;
    
    const fetchVisitsForMonth = async () => {
      if (!user) {
        setFetchingVisits(false);
        return;
      }
      setFetchingVisits(true);
      try {
        const allVisits = await fetchTableWithFilters<any>('visits', user, {
          select: `
            *,
            patients (
              id,
              name,
              cns,
              birth_date,
              categories,
              clinical_data
            )
          `,
          orderBy: { column: 'date', ascending: true }
        });

        // Filter by selected year and month
        const filtered = (allVisits || []).filter(v => {
          if (!v.date) return false;
          const dateParts = v.date.split('-');
          if (dateParts.length < 2) return false;
          const y = parseInt(dateParts[0], 10);
          const m = parseInt(dateParts[1], 10);
          return y === selectedYear && m === selectedMonth;
        });

        setVisits(filtered);
      } catch (err) {
        console.error("Error fetching visits for production report:", err);
      } finally {
        setFetchingVisits(false);
      }
    };
    
    fetchVisitsForMonth();
  }, [categoryFilter, selectedMonth, selectedYear, user?.id, user?.role, user?.color]);

  const householdsMap = useMemo(() => {
    const map: Record<string, any> = {};
    households.forEach(h => {
      if (h.id) map[h.id] = h;
    });
    return map;
  }, [households]);

  const householdResidentsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    households.forEach(h => {
      if (h.id) map[h.id] = [];
    });

    // Populate from central patients list
    patients.forEach(p => {
      if (p.household_id && map[p.household_id]) {
        map[p.household_id].push(p);
      }
    });

    // Also include any relation patients in case some aren't in filtered patients
    households.forEach(h => {
      if (h.id && Array.isArray(h.patients)) {
        h.patients.forEach((hp: any) => {
          if (hp && hp.id && !map[h.id].some(existing => existing.id === hp.id)) {
            map[h.id].push(hp);
          }
        });
      }
    });

    return map;
  }, [households, patients]);

  const getHouseholdFamilyDetails = (h: any) => {
    const residents: any[] = householdResidentsMap[h.id] || [];

    // Identify family responsible
    let responsible = residents.find(r => r.is_family_responsible);
    if (!responsible && h.responsible_name) {
      const cleanHResp = h.responsible_name.trim().toLowerCase();
      responsible = residents.find(r => r.name?.trim().toLowerCase() === cleanHResp);
    }
    if (!responsible && h.responsible_cns) {
      responsible = residents.find(r => r.cns?.trim() === h.responsible_cns?.trim());
    }
    if (!responsible && residents.length > 0 && !h.responsible_name) {
      responsible = residents[0];
    }

    // All other residents are dependents
    const dependents = residents.filter(r => r.id !== responsible?.id);

    // Primary household contact
    const contact = h.contact || 
      responsible?.contact || 
      responsible?.clinical_data?.contact || 
      (dependents.find(d => d.contact || d.clinical_data?.contact)?.contact) || 
      '-';

    const respName = responsible?.name || h.responsible_name || 'Não informado';
    const respBirth = responsible?.birth_date || h.responsible_birth_date || null;
    const respCns = responsible?.cns || h.responsible_cns || '';

    return {
      responsible,
      respName,
      respBirth,
      respCns,
      dependents,
      contact,
      totalResidents: residents.length || (h.responsible_name ? 1 : 0)
    };
  };

  const getResidentCategories = (resident: any): string[] => {
    if (!resident) return [];
    const set = new Set<string>();
    const rawCats: string[] = Array.isArray(resident.categories) ? resident.categories : [];

    rawCats.forEach(c => {
      if (!c || c === 'Geral' || c === 'Todas') return;
      if (c === 'Hipertensos' || c === 'Hipertenso') set.add('Hipertenso');
      else if (c === 'Diabéticos' || c === 'Diabético' || c === 'Diabetico') set.add('Diabético');
      else if (c === 'AcamadoDomiciliado' || c === 'Acamado' || c === 'Domiciliado') set.add('Acamado');
      else if (c === 'SaudeMental' || c === 'Saúde Mental') set.add('Saúde Mental');
      else if (c === 'Gestantes' || c === 'Gestante') set.add('Gestante');
      else if (c === 'Crianças' || c === 'Criança' || c === 'Crianca') set.add('Criança');
      else if (c === 'Idosos' || c === 'Idoso') set.add('Idoso');
      else if (c === 'Adultos' || c === 'Adulto') set.add('Adulto');
      else set.add(c);
    });

    if (isPatientHipertenso(resident)) set.add('Hipertenso');
    if (isPatientDiabetic(resident)) set.add('Diabético');
    if (isPatientChild(resident)) set.add('Criança');

    const age = resident.birth_date ? getAgeNumber(resident.birth_date) : null;
    if (age !== null) {
      if (age >= 60) set.add('Idoso');
      else if (age >= 18 && !set.has('Criança') && !set.has('Gestante') && !set.has('Idoso') && set.size === 0) {
        set.add('Adulto');
      }
    }

    return Array.from(set);
  };

  const getPatientAddress = (p: any): string => {
    if (p.household_id && householdsMap[p.household_id]) {
      const h = householdsMap[p.household_id];
      const comp = h.complement ? ` - ${h.complement}` : '';
      return `${h.address || ''}, ${h.number || 'S/N'}${comp}`.trim();
    }
    const c = p.clinical_data || {};
    const addr = p.address || c.address || '';
    const num = p.number || c.number || 'S/N';
    const comp = p.complement || c.complement ? ` - ${p.complement || c.complement}` : '';
    if (addr) return `${addr}, ${num}${comp}`.trim();
    return 'Sem endereço cadastrado';
  };

  const getPatientHouseholdResponsible = (p: any): string => {
    if (p.household_id && householdsMap[p.household_id]) {
      return householdsMap[p.household_id].responsible_name || 'Titular';
    }
    return p.is_family_responsible ? 'Titular' : (p.responsible_cns ? `CNS: ${p.responsible_cns}` : '-');
  };

  const getPatientContact = (p: any): string => {
    const c = p.clinical_data || {};
    return p.contact || c.contact || p.contact2 || c.contact2 || '-';
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const addr = getPatientAddress(p).toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        p.name?.toLowerCase().includes(term) || 
        p.cns?.includes(searchTerm) ||
        addr.includes(term);

      if (!matchesSearch) return false;

      if (categoryFilter === 'Geral' || categoryFilter === 'Todas') {
        return true;
      }

      if (categoryFilter === 'Bolsa Família') {
        return isPatientBolsaFamilia(p);
      }

      if (categoryFilter === 'Beneficiários') {
        const benefits = p.clinical_data?.socialBenefits || [];
        return benefits.length > 0 || isPatientBolsaFamilia(p);
      }

      if (categoryFilter === 'Hipertensos') {
        return isPatientHipertenso(p);
      }

      if (categoryFilter === 'Diabéticos') {
        return isPatientDiabetic(p);
      }

      if (categoryFilter === 'Gestante') {
        return p.categories?.includes('Gestante');
      }

      if (categoryFilter === 'Criança') {
        return isPatientChild(p);
      }

      if (categoryFilter === 'Idoso') {
        const age = p.birth_date ? calculateAge(p.birth_date) : 0;
        const ageNum = typeof age === 'number' ? age : parseInt(String(age));
        return p.categories?.includes('Idoso') || p.categories?.includes('Idosos') || (ageNum >= 60 && !isPatientChild(p));
      }

      if (categoryFilter === 'Adulto') {
        const age = p.birth_date ? calculateAge(p.birth_date) : 0;
        const ageNum = typeof age === 'number' ? age : parseInt(String(age));
        return p.categories?.includes('Adulto') || (!isPatientChild(p) && ageNum < 60 && p.birth_date);
      }

      if (categoryFilter === 'AcamadoDomiciliado') {
        return p.categories?.includes('AcamadoDomiciliado') || p.categories?.includes('Acamado') || p.categories?.includes('Domiciliado');
      }

      if (categoryFilter === 'SaudeMental') {
        return p.categories?.includes('SaudeMental') || p.categories?.includes('Saúde Mental');
      }

      return true;
    });
  }, [patients, searchTerm, categoryFilter, householdsMap]);

  const extractHouseNumber = (numStr?: string | null): { num: number; suffix: string; isSN: boolean } => {
    if (!numStr) return { num: Infinity, suffix: '', isSN: true };
    const clean = String(numStr).trim();
    if (!clean || /^s\/?n/i.test(clean) || /sem n/i.test(clean)) {
      return { num: Infinity, suffix: clean, isSN: true };
    }
    
    // Check if starts with digits, e.g. "14", "00014", "14 A", "14-B", "102"
    const leadingMatch = clean.match(/^(\d+)(.*)$/);
    if (leadingMatch) {
      return {
        num: parseInt(leadingMatch[1], 10),
        suffix: leadingMatch[2].trim().toLowerCase(),
        isSN: false
      };
    }
    
    // Check if any number exists inside, e.g. "Lote 12", "Km 5", "N 20"
    const anyDigitMatch = clean.match(/(\d+)/);
    if (anyDigitMatch) {
      return {
        num: parseInt(anyDigitMatch[1], 10),
        suffix: clean.toLowerCase(),
        isSN: false
      };
    }

    return { num: Infinity, suffix: clean.toLowerCase(), isSN: true };
  };

  const availableStreets = useMemo(() => {
    const set = new Set<string>();
    households.forEach(h => {
      if (h.address?.trim()) {
        set.add(h.address.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [households]);

  const filteredHouseholds = useMemo(() => {
    const list = households.filter(h => {
      const term = searchTerm.toLowerCase();
      const residents = householdResidentsMap[h.id] || [];

      // Check if any resident name or CNS matches search
      const matchesResident = residents.some(r => 
        r.name?.toLowerCase().includes(term) || 
        r.cns?.includes(term)
      );

      const matchesSearch = !searchTerm || 
                            h.responsible_name?.toLowerCase().includes(term) || 
                            h.address?.toLowerCase().includes(term) ||
                            h.number?.toLowerCase().includes(term) ||
                            h.complement?.toLowerCase().includes(term) ||
                            h.contact?.includes(term) ||
                            matchesResident;

      const matchesStreet = !streetFilter || h.address?.toLowerCase().includes(streetFilter.toLowerCase());
      
      const isPlaceholder = (!h.responsible_name || 
                             h.responsible_name === 'Responsável Importado' || 
                             h.responsible_name === 'Responsável não cadastrado') && 
                            residents.length === 0;
      
      return matchesSearch && matchesStreet && !isPlaceholder;
    });

    // Ordenar domicílios:
    // Na busca por rua ou listagem de domicílios, agrupa pelo logradouro
    // e ordena os números das casas estritamente do menor para o maior (1, 2, 14, 19, 102...)
    return list.sort((a, b) => {
      const streetA = (a.address || '').trim().toLowerCase();
      const streetB = (b.address || '').trim().toLowerCase();
      
      const streetComp = streetA.localeCompare(streetB, 'pt-BR', { sensitivity: 'base', numeric: true });
      if (streetComp !== 0) {
        return streetComp;
      }

      // Mesma rua: ordenar números das casas do menor para o maior
      const numA = extractHouseNumber(a.number);
      const numB = extractHouseNumber(b.number);

      if (numA.num !== numB.num) {
        return numA.num - numB.num;
      }

      if (numA.suffix !== numB.suffix) {
        return numA.suffix.localeCompare(numB.suffix, 'pt-BR', { numeric: true });
      }

      const compA = (a.complement || '').trim().toLowerCase();
      const compB = (b.complement || '').trim().toLowerCase();
      return compA.localeCompare(compB, 'pt-BR', { numeric: true });
    });
  }, [households, searchTerm, streetFilter, householdResidentsMap]);

  const getClinicalSummary = (p: any) => {
    const clinical = p.clinical_data || {};
    let info = [];

    const isDiab = isPatientDiabetic(p);
    const isInsulin = isPatientInsulinUser(p);
    const isHip = isPatientHipertenso(p);

    if (isDiab) {
      info.push(isInsulin ? 'Diabetes (Insulina)' : 'Diabetes');
    }
    if (isHip) {
      info.push('Hipertensão');
    }

    if (p.categories?.includes('Gestante')) {
      const g = clinical.gestante || {};
      if (g.dpp) info.push(`DPP: ${formatDate(g.dpp)}`);
      const consultasCount = g.consultas?.filter((c: string) => c).length || 0;
      if (consultasCount > 0) info.push(`${consultasCount} Consultas PN`);
      if (g.dtpa === 'Sim') info.push('dTpa OK');
    }

    if (isPatientChild(p)) {
      const c = clinical.crianca || {};
      const consultasCount = c.consultas?.filter((c: string) => c).length || 0;
      if (consultasCount > 0) info.push(`${consultasCount} Consultas Puericultura`);
    }

    if (p.categories?.includes('AcamadoDomiciliado')) {
      const a = clinical.acamadodomiciliado || {};
      info.push(`Dep: ${a.dependencia || 'Total'}`);
      if (a.usoFralda === 'Sim') info.push(`Fralda ${a.tamanhoFralda || ''}`);
    }

    if (p.categories?.includes('SaudeMental')) {
      const sm = clinical.saudeMental || {};
      if (sm.notes) info.push(`S.Mental: ${sm.notes}`);
    }

    if (isPatientBolsaFamilia(p)) {
      info.push('Bolsa Família');
    }

    return info.length > 0 ? info.join(' | ') : 'Sem agravos registrados';
  };

  const getGestanteStats = (p: any) => {
    const g = p.clinical_data?.gestante || {};
    const consultas = g.consultas?.filter((c: string) => c).length || 0;
    
    const tests = [
      { name: 'Sífilis', value: g.sifilis },
      { name: 'HIV', value: g.hiv },
      { name: 'Hepatite B', value: g.hepatiteB },
      { name: 'Hepatite C', value: g.hepatiteC }
    ];
    
    const realizados = tests.filter(t => t.value && t.value !== 'NÃO REALIZADO').map(t => t.name);
    const pendentes = tests.filter(t => !t.value || t.value === 'NÃO REALIZADO').map(t => t.name);
    
    const vacinasTomadas = g.dtpa === 'Sim' ? ['dTpa'] : [];
    const vacinasPendentes = g.dtpa !== 'Sim' ? ['dTpa'] : [];
    
    return { 
      consultas, 
      realizados, 
      pendentes, 
      vacinasTomadas, 
      vacinasPendentes,
      dum: g.dum ? formatDate(g.dum) : '-',
      dpp: g.dpp ? formatDate(g.dpp) : '-',
      saudeBucal: g.saudeBucal ? formatDate(g.saudeBucal) : '-'
    };
  };

  const getCriancaStats = (p: any) => {
    const c = p.clinical_data?.crianca || {};
    const consultas = c.consultas?.filter((v: string) => v).length || 0;
    
    const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
    const vacinas = c.vacinas || {};
    const tomadasKeys = Object.entries(vacinas)
      .filter(([_, v]) => v === 'Sim' || (typeof v === 'string' && v.length > 5))
      .map(([k, _]) => k);
    
    const vaccineLabels: Record<string, string> = {
      bcg: 'BCG',
      hepB_nascer: 'Hep B',
      penta1: 'Penta 1ª',
      penta2: 'Penta 2ª',
      penta3: 'Penta 3ª',
      vip1: 'VIP 1ª',
      vip2: 'VIP 2ª',
      vip3: 'VIP 3ª',
      pneumo10_1: 'Pneumo 1ª',
      pneumo10_2: 'Pneumo 2ª',
      rotavirus1: 'Rota 1ª',
      rotavirus2: 'Rota 2ª',
      menC1: 'MenC 1ª',
      menC2: 'MenC 2ª',
      fa: 'Febre Amarela',
      scr1: 'Tríplice Viral',
      dtp: 'DTP',
      hepA: 'Hep A'
    };

    const tomadas = tomadasKeys.map(k => vaccineLabels[k] || k);
    
    const dueVaccines = VACCINE_SCHEDULE
      .filter(group => group.age <= ageInMonths)
      .flatMap(group => group.vaccines);
      
    const pendentes = dueVaccines
      .filter(v => vacinas[v.id] !== 'Sim')
      .map(v => v.label);
    
    return { consultas, tomadas, pendentes, ageInMonths };
  };

  const generatePDF = async () => {
    const { default: jsPDFModule } = await import('jspdf');
    const { default: autoTableModule } = await import('jspdf-autotable');
    const autoTable = autoTableModule;

    const colorNames: Record<string, string> = {
      '#00488d': 'Azul',
      '#eab308': 'Amarelo',
      '#64748b': 'Cinza',
      '#db2777': 'Rosa',
      '#78350f': 'Marrom'
    };
    const userColorLabel = user?.color ? (colorNames[user.color.toLowerCase()] || user.color) : 'N/A';
    const emitDateStr = new Date().toLocaleDateString('pt-BR');

    // 1. PRODUÇÃO MENSAL
    if (categoryFilter === 'Produção Mensal') {
      const doc = new jsPDFModule({ orientation: 'portrait' });
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const compStr = `${monthNames[selectedMonth - 1]} / ${selectedYear}`;

      doc.setFontSize(16);
      doc.setTextColor(13, 148, 136);
      doc.text('CONSOLIDAÇÃO MENSAL DE PRODUÇÃO - ACS', 14, 20);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente Comunitário: ${user.name} | Microárea: ${user.microarea || '-'} | Área: ${userColorLabel}`, 14, 27);
      doc.text(`Competência: ${compStr} | Emitido em: ${emitDateStr}`, 14, 32);

      const vRealizadas = visits.filter(v => v.outcome === 'Realizada' || !v.outcome).length;
      const vAusentes = visits.filter(v => v.outcome === 'Ausente').length;
      const vRecusadas = visits.filter(v => v.outcome === 'Recusada').length;

      const vGestantes = visits.filter(v => v.patients?.categories?.includes('Gestante')).length;
      const vCriancas = visits.filter(v => isPatientChild(v.patients || {})).length;
      const vIdosos = visits.filter(v => {
        const p = v.patients || {};
        const age = p.birth_date ? calculateAge(p.birth_date) : 0;
        return p.categories?.includes('Idoso') || Number(age) >= 60;
      }).length;
      const vAcamados = visits.filter(v => v.patients?.categories?.includes('AcamadoDomiciliado')).length;
      const vMental = visits.filter(v => v.patients?.categories?.includes('SaudeMental')).length;
      const vHipertensos = visits.filter(v => isPatientHipertenso(v.patients || {})).length;
      const vDiabeticos = visits.filter(v => isPatientDiabetic(v.patients || {})).length;

      const summaryData = [
        ['Total de Visitas Domiciliares Realizadas', vRealizadas],
        ['Total de Visitas Domiciliares Ausentes', vAusentes],
        ['Total de Visitas Domiciliares Recusadas', vRecusadas],
        ['Visitas a Gestantes (Pré-natal / Puerpério)', vGestantes],
        ['Visitas a Crianças (Puericultura e Vacinas)', vCriancas],
        ['Visitas a Hipertensos', vHipertensos],
        ['Visitas a Diabéticos (Acompanhamento Glicêmico/Pés)', vDiabeticos],
        ['Visitas a Idosos', vIdosos],
        ['Visitas a Acamados e Domiciliados', vAcamados],
        ['Visitas a Usuários de Saúde Mental', vMental]
      ];

      doc.setFontSize(11);
      doc.setTextColor(0, 72, 141);
      doc.text('I. QUADRO RESUMO DE PRODUÇÃO', 14, 42);

      autoTable(doc, {
        startY: 46,
        head: [['Atividade / Indicador de Produção Territorial', 'Quantidade Consolidada']],
        body: summaryData,
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 8.5, cellPadding: 3 },
        alternateRowStyles: { fillColor: [244, 252, 251] }
      });

      let nextY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(11);
      doc.setTextColor(0, 72, 141);
      doc.text('II. RELAÇÃO NOMINAL DAS VISITAS REALIZADAS', 14, nextY);
      nextY += 4;

      const detailData = visits.map((v, idx) => [
        idx + 1,
        formatDate(v.date),
        v.patients?.name || 'Paciente não localizado',
        v.patients?.cns ? v.patients.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
        v.type || 'Rotina',
        v.outcome || 'Realizada'
      ]);

      autoTable(doc, {
        startY: nextY,
        head: [['Nº', 'Data', 'Nome do Cidadão', 'Cartão SUS (CNS)', 'Tipo de Atendimento', 'Desfecho']],
        body: detailData,
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`Producao_Mensal_MA_${user.microarea || 'Geral'}_${selectedMonth}_${selectedYear}.pdf`);
      return;
    }

    // 2. RELATÓRIO GERAL (COM TODAS AS INFORMAÇÕES DOS PACIENTES)
    if (categoryFilter === 'Geral' || categoryFilter === 'Todas') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(0, 72, 141);
      doc.text('RELATÓRIO GERAL TERRITORIAL DE PACIENTES - CADASTRO COMPLETO', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Área: ${userColorLabel} | Total: ${filteredPatients.length} pacientes | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredPatients.map((p, idx) => {
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        const cats = p.categories?.join(', ') || 'Geral';
        const c = p.clinical_data || {};
        
        let condicoes = [];
        if (isPatientHipertenso(p)) condicoes.push('Hipertenso');
        if (isPatientDiabetic(p)) {
          condicoes.push(isPatientInsulinUser(p) ? 'Diabético (Insulina)' : 'Diabético');
        }
        if (p.categories?.includes('AcamadoDomiciliado')) condicoes.push(`Acamado (${c.acamadodomiciliado?.dependencia || 'Total'})`);
        if (p.categories?.includes('Gestante')) condicoes.push('Gestante');
        if (p.categories?.includes('SaudeMental')) condicoes.push('Saúde Mental');
        const condicoesStr = condicoes.length > 0 ? condicoes.join(', ') : 'Nenhum agravo';

        const benefits = Array.isArray(c.socialBenefits) && c.socialBenefits.length > 0 
          ? c.socialBenefits.join(', ') 
          : (isPatientBolsaFamilia(p) ? 'Bolsa Família' : 'Nenhum');

        return [
          idx + 1,
          p.name || 'Sem nome',
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
          p.gender ? (p.gender === 'Feminino' || p.gender === 'F' ? 'F' : 'M') : '-',
          getPatientAddress(p),
          getPatientContact(p),
          cats,
          condicoesStr,
          benefits
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Nome do Cidadão', 'Cartão SUS (CNS)', 'Nascimento / Idade', 'Sexo', 'Endereço Completo', 'Contato', 'Categorias', 'Condições Crônicas / Agravos', 'Benefícios Sociais']],
        body: tableData,
        headStyles: { fillColor: [0, 72, 141], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`Relatorio_Geral_Pacientes_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 3. RELATÓRIO DO BOLSA FAMÍLIA
    if (categoryFilter === 'Bolsa Família') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129); // Emerald color
      doc.text('RELATÓRIO DE BENEFICIÁRIOS - PROGRAMA BOLSA FAMÍLIA', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Acompanhamento de Saúde na Atenção Básica`, 14, 22);
      doc.text(`Total de Beneficiários Localizados: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 27);

      const tableData = filteredPatients.map((p, idx) => {
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        const ageInM = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
        
        let grupo = 'Beneficiário Geral';
        if (p.categories?.includes('Gestante')) {
          grupo = '🤰 Gestante (Pré-Natal)';
        } else if (isPatientChild(p)) {
          grupo = ageInM <= 84 ? `👶 Criança (${age} - Puericultura/Vacina)` : `🧒 Criança/Adolescente (${age})`;
        } else if (Number(age) >= 60) {
          grupo = '👵 Idoso';
        }

        const benefits = p.clinical_data?.socialBenefits?.join(', ') || 'Bolsa Família';

        return [
          idx + 1,
          p.name || 'Sem nome',
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
          getPatientAddress(p),
          getPatientHouseholdResponsible(p),
          getPatientContact(p),
          grupo,
          benefits,
          getClinicalSummary(p)
        ];
      });

      autoTable(doc, {
        startY: 32,
        head: [['Nº', 'Nome do Cidadão', 'Cartão SUS (CNS)', 'Nascimento / Idade', 'Endereço', 'Responsável / Domicílio', 'Contato', 'Grupo / Condicionalidade', 'Benefícios', 'Resumo Clínico']],
        body: tableData,
        headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        alternateRowStyles: { fillColor: [240, 253, 244] }
      });

      doc.save(`Relatorio_Bolsa_Familia_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 4. RELATÓRIO DE GESTANTES
    if (categoryFilter === 'Gestante') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(236, 72, 153); // Pink
      doc.text('RELATÓRIO DE ACOMPANHAMENTO - GESTANTES', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Total de Gestantes: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredPatients.map((p, idx) => {
        const stats = getGestanteStats(p);
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        return [
          idx + 1,
          p.name,
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
          getPatientAddress(p),
          getPatientContact(p),
          stats.dum,
          stats.dpp,
          `${stats.consultas} Consultas`,
          stats.realizados.join(', ') || 'Nenhum',
          stats.pendentes.join(', ') || 'Nenhum',
          stats.vacinasTomadas.join(', ') || 'Pendente',
          stats.saudeBucal
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Nome da Gestante', 'Cartão SUS', 'Nasc./Idade', 'Endereço', 'Contato', 'DUM', 'DPP', 'Consultas PN', 'Testes OK', 'Testes Pendentes', 'Vacina dTpa', 'Saúde Bucal']],
        body: tableData,
        headStyles: { fillColor: [219, 39, 119], fontSize: 7.5 },
        styles: { fontSize: 6.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [253, 242, 248] }
      });

      doc.save(`Relatorio_Gestantes_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 5. RELATÓRIO DE CRIANÇAS
    if (categoryFilter === 'Criança') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text('RELATÓRIO DE ACOMPANHAMENTO - CRIANÇAS E PUERICULTURA', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Total de Crianças: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredPatients.map((p, idx) => {
        const stats = getCriancaStats(p);
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        return [
          idx + 1,
          p.name,
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age} / ${stats.ageInMonths}m)` : '-',
          getPatientAddress(p),
          getPatientHouseholdResponsible(p),
          getPatientContact(p),
          `${stats.consultas} Consultas`,
          stats.tomadas.join(', ') || 'Nenhuma registrada',
          stats.pendentes.join(', ') || 'Nenhuma pendente'
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Nome da Criança', 'Cartão SUS', 'Nascimento / Idade', 'Endereço', 'Responsável', 'Contato', 'Consultas Puericultura', 'Vacinas Tomadas', 'Vacinas Pendentes / Atrasadas']],
        body: tableData,
        headStyles: { fillColor: [37, 99, 235], fontSize: 7.5 },
        styles: { fontSize: 6.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [239, 246, 255] }
      });

      doc.save(`Relatorio_Criancas_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 6. RELATÓRIO DE DIABÉTICOS (E INSULINA)
    if (categoryFilter === 'Diabéticos') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(139, 92, 246); // Violet
      doc.text('RELATÓRIO DE ACOMPANHAMENTO - DIABÉTICOS E USO DE INSULINA', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Total de Diabéticos: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredPatients.map((p, idx) => {
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        const c = p.clinical_data?.chronic || p.clinical_data?.adulto || p.clinical_data?.idoso || {};
        const dData = c.diabetesData || {};
        const tomaInsulina = isPatientInsulinUser(p) ? 'SIM (Insulina)' : 'Não';
        const pes = dData.avaliacaoPes || 'Não';
        const hba1c = dData.hemoglobinaGlicada || 'Não';

        return [
          idx + 1,
          p.name,
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
          getPatientAddress(p),
          getPatientContact(p),
          tomaInsulina,
          pes,
          hba1c,
          isPatientHipertenso(p) ? 'Sim' : 'Não'
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Nome do Cidadão', 'Cartão SUS', 'Nasc./Idade', 'Endereço', 'Contato', 'Uso de Insulina', 'Avaliação dos Pés', 'Hemoglobina Glicada', 'Hipertensão Associada']],
        body: tableData,
        headStyles: { fillColor: [124, 58, 237], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        alternateRowStyles: { fillColor: [245, 243, 255] }
      });

      doc.save(`Relatorio_Diabeticos_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 7. RELATÓRIO DE HIPERTENSOS
    if (categoryFilter === 'Hipertensos') {
      const doc = new jsPDFModule({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(239, 68, 68); // Red
      doc.text('RELATÓRIO DE ACOMPANHAMENTO - HIPERTENSOS', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Total de Hipertensos: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredPatients.map((p, idx) => {
        const age = p.birth_date ? calculateAge(p.birth_date) : '-';
        const c = p.clinical_data?.chronic || p.clinical_data?.adulto || p.clinical_data?.idoso || {};
        const hData = c.hipertensaoData || {};
        const consultas6m = hData.consultas6Meses || 'Não';

        return [
          idx + 1,
          p.name,
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
          getPatientAddress(p),
          getPatientContact(p),
          consultas6m,
          isPatientDiabetic(p) ? 'Sim' : 'Não',
          getClinicalSummary(p)
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Nome do Cidadão', 'Cartão SUS', 'Nasc./Idade', 'Endereço', 'Contato', 'Consulta Médica Últimos 6m', 'Diabetes Associado', 'Resumo Clínico']],
        body: tableData,
        headStyles: { fillColor: [220, 38, 38], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        alternateRowStyles: { fillColor: [254, 242, 242] }
      });

      doc.save(`Relatorio_Hipertensos_MA_${user.microarea || 'Geral'}.pdf`);
      return;
    }

    // 8. RELATÓRIO DE DOMICÍLIOS (LAYOUT ESPELHO COM BADGES E CADASTRO)
    if (categoryFilter === 'Domicílios') {
      const doc = new jsPDFModule({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const microNum = user?.microarea || households[0]?.microarea || '';
      const tableBody: any[] = [];

      // Subheader row (Micro Área...)
      tableBody.push([
        {
          content: `MICRO ÁREA: ${microNum}`,
          styles: {
            fontStyle: 'bold',
            fontSize: 8,
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
            lineWidth: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: [255, 255, 255],
            lineWidth: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 }
          }
        }
      ]);

      // Star helper for Bolsa Família badge
      const drawStar = (cx: number, cy: number, spikes = 5, outerRadius = 0.8, innerRadius = 0.35) => {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        const points: [number, number][] = [];
        for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          points.push([x, y]);
          rot += step;
          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          points.push([x, y]);
          rot += step;
        }
        doc.lines(
          points.slice(1).map((p, idx) => [p[0] - points[idx][0], p[1] - points[idx][1]]),
          points[0][0],
          points[0][1],
          [1, 1],
          'F',
          true
        );
      };

      filteredHouseholds.forEach(h => {
        const family = getHouseholdFamilyDetails(h);
        const residents: any[] = [];
        if (family.responsible) residents.push(family.responsible);
        (family.dependents || []).forEach((d: any) => {
          if (!residents.some(r => r.id === d.id)) residents.push(d);
        });

        if (residents.length === 0) {
          residents.push({
            name: family.respName,
            birth_date: family.respBirth,
            cns: family.respCns,
            is_family_responsible: true
          });
        }

        const formattedNumber = /^\d+$/.test(String(h.number || '').trim())
          ? String(h.number).trim().padStart(5, '0')
          : (h.number || 'S/N');
        const compStr = h.complement ? ` - ${h.complement.toUpperCase()}` : '';
        const enderecoLinha = `${(h.address || 'LOGRADOURO NÃO INFORMADO').toUpperCase()}, ${formattedNumber}${compStr}`;

        // Address Header Row
        tableBody.push([
          {
            content: enderecoLinha,
            styles: {
              fontStyle: 'bold',
              fontSize: 8,
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
              cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
              lineWidth: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 }
            }
          },
          {
            content: String(residents.length),
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              fontSize: 8.5,
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
              lineWidth: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 }
            }
          }
        ]);

        // Individual Resident Rows
        residents.forEach((r, rIdx) => {
          const isResp = r.id === family.responsible?.id || r.is_family_responsible || rIdx === 0;
          const hasBF = isPatientBolsaFamilia(r);
          const cats = getResidentCategories(r);
          const catStr = cats.length > 0 ? cats.map(c => c.toUpperCase()).join(', ') : 'ADULTO';
          const dNascStr = r.birth_date ? formatDate(r.birth_date) : 'N/I';
          const cnsFormatted = r.cns ? `CNS: ${r.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}` : '';

          const line2Parts = [dNascStr, catStr];
          if (cnsFormatted) line2Parts.push(cnsFormatted);
          const line2 = line2Parts.join('    ');

          const isLast = rIdx === residents.length - 1;

          tableBody.push([
            {
              content: '',
              rawResident: {
                name: (r.name || 'NÃO INFORMADO').toUpperCase(),
                isResp,
                hasBF,
                line2
              },
              styles: {
                minCellHeight: 11,
                cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
                lineWidth: {
                  top: 0,
                  bottom: isLast ? 0.35 : 0,
                  left: 0.35,
                  right: 0.35
                }
              }
            },
            {
              content: '',
              styles: {
                lineWidth: {
                  top: 0,
                  bottom: isLast ? 0.35 : 0,
                  left: 0.35,
                  right: 0.35
                }
              }
            }
          ]);
        });
      });

      autoTable(doc, {
        startY: 8,
        margin: { top: 8, left: 8, right: 8, bottom: 8 },
        head: [
          [
            {
              content: 'DOMICÍLIO',
              styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                fontSize: 8.5,
                textColor: [0, 0, 0],
                fillColor: [255, 255, 255],
                lineWidth: 0.35
              }
            },
            {
              content: 'Nº\nUSUARIOS',
              styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                fontSize: 7.5,
                textColor: [0, 0, 0],
                fillColor: [255, 255, 255],
                lineWidth: 0.35
              }
            }
          ]
        ],
        body: tableBody,
        theme: 'plain',
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.35,
        styles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.35,
          font: 'helvetica',
          textColor: [0, 0, 0],
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 174 },
          1: { cellWidth: 20 }
        },
        pageBreak: 'auto',
        didDrawCell: (data) => {
          if (
            data.section === 'body' &&
            data.column.index === 0 &&
            data.cell.raw &&
            typeof data.cell.raw === 'object' &&
            (data.cell.raw as any).rawResident
          ) {
            const res = (data.cell.raw as any).rawResident;
            const startX = data.cell.x + 3;
            const startY = data.cell.y + 4.2;

            // 1. Citizen Name (Bold)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text(res.name, startX, startY);

            let badgeX = startX + doc.getTextWidth(res.name) + 3;

            // 2. Responsável Badge (Cyan pill)
            if (res.isResp) {
              const bText = 'RESPONSÁVEL';
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              const bTextW = doc.getTextWidth(bText);
              const bW = bTextW + 3;
              const bH = 3.5;
              const bY = startY - 2.6;

              doc.setDrawColor(6, 182, 212); // cyan-500
              doc.setFillColor(236, 254, 255); // cyan-50
              doc.setLineWidth(0.2);
              doc.roundedRect(badgeX, bY, bW, bH, 0.7, 0.7, 'FD');

              doc.setTextColor(8, 145, 178); // cyan-600
              doc.text(bText, badgeX + 1.5, startY - 0.2);

              badgeX += bW + 2.5;
            }

            // 3. Bolsa Família Badge (Emerald pill + star)
            if (res.hasBF) {
              const bText = 'BOLSA FAMÍLIA';
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              const bTextW = doc.getTextWidth(bText);
              const bW = bTextW + 5.2;
              const bH = 3.5;
              const bY = startY - 2.6;

              doc.setDrawColor(16, 185, 129); // emerald-500
              doc.setFillColor(236, 253, 245); // emerald-50
              doc.setLineWidth(0.2);
              doc.roundedRect(badgeX, bY, bW, bH, 0.7, 0.7, 'FD');

              // Draw star icon
              doc.setFillColor(5, 150, 105);
              drawStar(badgeX + 2.2, startY - 0.9, 5, 0.8, 0.35);

              doc.setTextColor(5, 150, 105); // emerald-600
              doc.text(bText, badgeX + 3.8, startY - 0.2);
            }

            // 4. Line 2: Birth date, categories, CNS
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(res.line2, startX, startY + 4.4);
          }
        }
      });

      doc.save(`Ficha_Domicilios_MA_${microNum || 'Geral'}.pdf`);
      return;
    }

    // 9. OUTRAS CATEGORIAS (Idoso, Acamado, Saúde Mental, Beneficiários, Adulto)
    const doc = new jsPDFModule({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setTextColor(0, 72, 141);
    doc.text(`RELATÓRIO DE PACIENTES - ${categoryFilter.toUpperCase()}`, 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Categoria: ${categoryFilter} | Total: ${filteredPatients.length} | Emitido em: ${emitDateStr}`, 14, 22);

    const tableData = filteredPatients.map((p, idx) => {
      const age = p.birth_date ? calculateAge(p.birth_date) : '-';
      return [
        idx + 1,
        p.name,
        p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
        p.birth_date ? `${formatDate(p.birth_date)} (${age})` : '-',
        getPatientAddress(p),
        getPatientContact(p),
        p.categories?.join(', ') || 'Geral',
        getClinicalSummary(p)
      ];
    });

    autoTable(doc, {
      startY: 27,
      head: [['Nº', 'Nome do Cidadão', 'Cartão SUS (CNS)', 'Nascimento / Idade', 'Endereço Completo', 'Contato', 'Categorias', 'Informações Clínicas e Acompanhamento']],
      body: tableData,
      headStyles: { fillColor: [0, 72, 141], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    doc.save(`Relatorio_${categoryFilter}_MA_${user.microarea || 'Geral'}.pdf`);
  };

  const renderBolsaFamiliaBadge = (resident: any) => {
    if (!resident || !isPatientBolsaFamilia(resident)) return null;
    return (
      <span 
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs shrink-0"
        title="Beneficiário do Programa Bolsa Família"
      >
        🎁 Bolsa Família
      </span>
    );
  };

  const renderResidentBadges = (resident: any) => {
    if (!resident) return null;
    const cats = getResidentCategories(resident);
    const hasBF = isPatientBolsaFamilia(resident);

    if (cats.length === 0 && !hasBF) return null;

    const catStyleMap: Record<string, { bg: string; label: string }> = {
      'Gestante':     { bg: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800', label: '🤰 Gestante' },
      'Criança':      { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800', label: '👶 Criança' },
      'Idoso':        { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800', label: '👵 Idoso' },
      'Hipertenso':   { bg: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800', label: '❤️ Hipertenso' },
      'Diabético':    { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800', label: '🩸 Diabético' },
      'Adulto':       { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', label: '🧑 Adulto' },
      'Acamado':      { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: '🛏️ Acamado' },
      'Saúde Mental': { bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', label: '🧠 Saúde Mental' },
    };

    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {cats.map((cat: string) => {
          const m = catStyleMap[cat] || {
            bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
            label: cat
          };
          return (
            <span 
              key={cat}
              className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${m.bg}`}
            >
              {m.label}
            </span>
          );
        })}

        {hasBF && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
            🎁 Bolsa Família
          </span>
        )}
      </div>
    );
  };

  const categories = [
    { id: 'Geral', label: '📋 Geral (Todos os Pacientes)', count: patients.length },
    { id: 'Bolsa Família', label: '🎁 Bolsa Família', count: patients.filter(p => isPatientBolsaFamilia(p)).length },
    { id: 'Gestante', label: '🤰 Gestantes', count: patients.filter(p => p.categories?.includes('Gestante')).length },
    { id: 'Criança', label: '👶 Crianças', count: patients.filter(p => isPatientChild(p)).length },
    { id: 'Hipertensos', label: '❤️ Hipertensos', count: patients.filter(p => isPatientHipertenso(p)).length },
    { id: 'Diabéticos', label: '🩸 Diabéticos / Insulina', count: patients.filter(p => isPatientDiabetic(p)).length },
    { id: 'Idoso', label: '👵 Idosos', count: patients.filter(p => {
      const a = p.birth_date ? calculateAge(p.birth_date) : 0;
      return p.categories?.includes('Idoso') || (Number(a) >= 60 && !isPatientChild(p));
    }).length },
    { id: 'AcamadoDomiciliado', label: '🛏️ Acamados / Domiciliados', count: patients.filter(p => p.categories?.includes('AcamadoDomiciliado') || p.categories?.includes('Acamado')).length },
    { id: 'Adulto', label: '🧑 Adultos', count: patients.filter(p => {
      const a = p.birth_date ? calculateAge(p.birth_date) : 0;
      return p.categories?.includes('Adulto') || (!isPatientChild(p) && Number(a) < 60 && p.birth_date);
    }).length },
    { id: 'SaudeMental', label: '🧠 Saúde Mental', count: patients.filter(p => p.categories?.includes('SaudeMental') || p.categories?.includes('Saúde Mental')).length },
    { id: 'Beneficiários', label: '🏛️ Benefícios Sociais', count: patients.filter(p => (p.clinical_data?.socialBenefits?.length || 0) > 0 || isPatientBolsaFamilia(p)).length },
    { id: 'Domicílios', label: '🏠 Domicílios', count: filteredHouseholds.length },
    { id: 'Produção Mensal', label: '📊 Produção Mensal (ACS)', count: visits.length }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            Relatórios e Consolidados
          </h2>
          <p className="text-xs text-text-secondary font-medium tracking-tight">
            Gere relatórios nominais por categoria, listagem geral completa e acompanhamento do Bolsa Família.
          </p>
        </header>
        <button 
          onClick={generatePDF}
          disabled={categoryFilter === 'Produção Mensal' ? visits.length === 0 || fetchingVisits : categoryFilter === 'Domicílios' ? filteredHouseholds.length === 0 : filteredPatients.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all disabled:opacity-50 text-sm cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          Gerar e Baixar PDF ({categoryFilter === 'Domicílios' ? filteredHouseholds.length : filteredPatients.length})
        </button>
      </div>

      {/* Categories Bar */}
      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Selecione o Tipo de Relatório:</label>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id 
                  ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20 scale-[1.02]' 
                  : 'bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 text-text-secondary dark:text-slate-300 hover:bg-bg-primary hover:border-teal-500/30'
              }`}
            >
              <span>{cat.label}</span>
              {cat.id !== 'Produção Mensal' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  categoryFilter === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Period Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mt-1">
          {categoryFilter === 'Produção Mensal' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:ring-2 focus:ring-teal-600/20 transition-all text-text-primary dark:text-white"
                >
                  {[
                    { v: 1, l: 'Janeiro' },
                    { v: 2, l: 'Fevereiro' },
                    { v: 3, l: 'Março' },
                    { v: 4, l: 'Abril' },
                    { v: 5, l: 'Maio' },
                    { v: 6, l: 'Junho' },
                    { v: 7, l: 'Julho' },
                    { v: 8, l: 'Agosto' },
                    { v: 9, l: 'Setembro' },
                    { v: 10, l: 'Outubro' },
                    { v: 11, l: 'Novembro' },
                    { v: 12, l: 'Dezembro' }
                  ].map(m => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:ring-2 focus:ring-teal-600/20 transition-all text-text-primary dark:text-white"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="relative group col-span-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
              <input 
                type="text" 
                placeholder={categoryFilter === 'Domicílios' ? "Pesquisar logradouro ou responsável..." : "Pesquisar nome, CNS ou endereço..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-teal-600/20 transition-all text-text-primary dark:text-white"
              />
            </div>
          )}

          {categoryFilter === 'Domicílios' && (
            <div className="relative group">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
              <input 
                type="text" 
                list="street-filter-options"
                placeholder="Filtrar por rua (números ordenados menor ao maior)..."
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-xs font-medium focus:ring-2 focus:ring-teal-600/20 transition-all text-text-primary dark:text-white"
              />
              {streetFilter && (
                <button
                  type="button"
                  onClick={() => setStreetFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
                  title="Limpar filtro de rua"
                >
                  ✕
                </button>
              )}
              <datalist id="street-filter-options">
                {availableStreets.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-teal-600" />
          <p className="text-sm font-medium">Carregando dados dos relatórios...</p>
        </div>
      ) : categoryFilter === 'Produção Mensal' ? (
        fetchingVisits ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-teal-600" />
            <p className="text-sm font-medium">Calculando produção consolidada...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Visitas Realizadas</span>
                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 block">
                  {visits.filter(v => v.outcome === 'Realizada' || !v.outcome).length}
                </span>
              </div>
              <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Visitas Ausentes</span>
                <span className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1 block">
                  {visits.filter(v => v.outcome === 'Ausente').length}
                </span>
              </div>
              <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Gestantes Atendidas</span>
                <span className="text-2xl font-bold text-pink-500 mt-1 block">
                  {visits.filter(v => v.patients?.categories?.includes('Gestante')).length}
                </span>
              </div>
              <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Crianças Acompanhadas</span>
                <span className="text-2xl font-bold text-blue-500 mt-1 block">
                  {visits.filter(v => isPatientChild(v.patients || {})).length}
                </span>
              </div>
            </div>

            {/* Main Visitas List Table Card */}
            <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="text-sm font-bold text-text-primary dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  Detalhamento Nominal das Visitas da Competência
                </h3>
                <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 font-bold text-xs rounded-full border border-teal-100 dark:border-teal-900/30">
                  {visits.length} Visitas Registradas
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-primary dark:bg-slate-800/30 border-b border-border dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Data</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Cidadão</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Cartão SUS</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Atendimento</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Desfecho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {visits.length > 0 ? (
                      visits.map((v) => (
                        <tr key={v.id} className="hover:bg-bg-primary/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-text-primary dark:text-white">
                            {formatDate(v.date) || '-'}
                          </td>
                          <td className="px-6 py-4 font-bold text-teal-600 dark:text-teal-400">
                            {v.patients?.name || 'Paciente não localizado'}
                          </td>
                          <td className="px-6 py-4 text-text-secondary font-semibold">
                            {v.patients?.cns ? v.patients.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded uppercase text-slate-600 dark:text-slate-300">
                              {v.type || 'Rotina'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                              v.outcome === 'Ausente' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                : v.outcome === 'Recusada' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {v.outcome || 'Realizada'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-text-muted">
                          Nenhuma visita registrada nesta competência.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-bg-secondary dark:bg-slate-900 rounded-2xl border border-border dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-text-primary dark:text-white uppercase tracking-wider">
                {categoryFilter === 'Geral' ? '📋 Relatório Geral Completo de Cidadãos' :
                 categoryFilter === 'Bolsa Família' ? '🎁 Relação de Beneficiários do Bolsa Família' :
                 categoryFilter === 'Gestante' ? '🤰 Relatório de Acompanhamento - Gestantes' :
                 categoryFilter === 'Domicílios' ? '🏠 Cadastro e Ficha Territorial de Domicílios' :
                 `👥 Relatório de Pacientes - ${categoryFilter}`}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {categoryFilter === 'Domicílios' && (
                <>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs no-print">
                    <button
                      onClick={() => setDomiciliosViewMode('esus')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        domiciliosViewMode === 'esus'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Visualização idêntica à ficha de impressão do e-SUS"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ficha e-SUS (Impressão)
                    </button>
                    <button
                      onClick={() => setDomiciliosViewMode('cards')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        domiciliosViewMode === 'cards'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Visualização em cartões detalhados"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Cartões
                    </button>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer no-print"
                    title="Imprimir folha A4 oficial"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Folha
                  </button>
                </>
              )}
              {categoryFilter === 'Domicílios' && (
                <span 
                  className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700"
                  title="Domicílios ordenados por rua e número da casa em ordem crescente"
                >
                  <ArrowUpDown className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  Nºs: menor ao maior
                </span>
              )}
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-3 py-1 rounded-full border border-teal-100 dark:border-teal-900/30">
                {categoryFilter === 'Domicílios' ? `${filteredHouseholds.length} Domicílios` : `${filteredPatients.length} Pacientes`}
              </span>
            </div>
          </div>

          {categoryFilter === 'Domicílios' ? (
            domiciliosViewMode === 'esus' ? (
              <div className="p-2 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40 overflow-x-auto">
                {filteredHouseholds.length > 0 ? (
                  <div className="bg-white text-slate-950 border-2 border-slate-900 rounded-sm overflow-hidden shadow-sm font-sans min-w-[700px] max-w-5xl mx-auto print-sheet">
                    {/* Table Header Row */}
                    <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-slate-100/90 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <div className="col-span-10 sm:col-span-11 p-2 text-center border-r-2 border-slate-900">
                        DOMICÍLIO
                      </div>
                      <div className="col-span-2 sm:col-span-1 p-2 text-center text-[10px] sm:text-xs flex items-center justify-center">
                        Nº USUARIOS
                      </div>
                    </div>

                    {/* Subheader Row */}
                    <div className="px-3 py-2 border-b-2 border-slate-900 bg-white font-bold text-xs uppercase text-slate-900">
                      <span>MICRO ÁREA: {user.microarea || households[0]?.microarea || '-'}</span>
                    </div>

                    {/* Domicile blocks */}
                    <div className="divide-y-2 divide-slate-900">
                      {filteredHouseholds.map((h, idx) => {
                        const family = getHouseholdFamilyDetails(h);
                        const residents: any[] = [];
                        if (family.responsible) residents.push(family.responsible);
                        (family.dependents || []).forEach((d: any) => {
                          if (!residents.some(r => r.id === d.id)) residents.push(d);
                        });

                        if (residents.length === 0) {
                          residents.push({
                            name: family.respName,
                            birth_date: family.respBirth,
                            cns: family.respCns,
                            is_family_responsible: true
                          });
                        }

                        const formattedNumber = /^\d+$/.test(String(h.number || '').trim())
                          ? String(h.number).trim().padStart(5, '0')
                          : (h.number || 'S/N');
                        const compStr = h.complement ? ` ${h.complement.toUpperCase()}` : '';
                        const enderecoLinha = `${(h.address || 'LOGRADOURO NÃO INFORMADO').toUpperCase()}, ${formattedNumber} -${compStr}`;

                        return (
                          <div key={h.id || idx} className="break-inside-avoid">
                            {/* Domicile Address Bar */}
                            <div className="grid grid-cols-12 border-b border-slate-900 bg-slate-100/70 font-bold text-xs text-slate-900">
                              <div className="col-span-10 sm:col-span-11 px-3 py-1.5 border-r-2 border-slate-900 flex items-center gap-2">
                                <span className="tracking-wide">{enderecoLinha}</span>
                              </div>
                              <div className="col-span-2 sm:col-span-1 px-1 py-1.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center bg-slate-100">
                                {residents.length}
                              </div>
                            </div>

                            {/* Residents Container */}
                            <div className="grid grid-cols-12 bg-white">
                              <div className="col-span-10 sm:col-span-11 p-2 sm:p-2.5 space-y-1.5 border-r-2 border-slate-900">
                                {residents.map((r, rIdx) => {
                                  const isResp = r.id === family.responsible?.id || r.is_family_responsible || rIdx === 0;
                                  const hasBF = isPatientBolsaFamilia(r);
                                  const cats = getResidentCategories(r);
                                  const dNasc = r.birth_date ? formatDate(r.birth_date) : 'N/I';
                                  const motherOrCns = r.mother_name || 
                                    r.clinical_data?.mother_name || 
                                    r.clinical_data?.mae || 
                                    r.clinical_data?.nome_mae || 
                                    (r.cns ? `CNS: ${r.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}` : '');

                                  return (
                                    <div key={r.id || rIdx} className="space-y-0.5 text-slate-900">
                                      {/* Line 1: Name, Tags */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-xs sm:text-[13px] uppercase tracking-wide text-black">
                                          {r.name || 'NÃO INFORMADO'}
                                        </span>
                                        {isResp && (
                                          <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-300 uppercase print:border-black print:text-black">
                                            Responsável
                                          </span>
                                        )}
                                        {hasBF && (
                                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 uppercase print:border-black print:text-black">
                                            ★ Bolsa Família
                                          </span>
                                        )}
                                      </div>

                                      {/* Line 2: Birth date, Categories, Mother's name / CNS with tight, natural spacing */}
                                      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-0.5 text-[11px] text-slate-800 font-medium pl-1 sm:pl-2">
                                        <span className="font-semibold text-slate-900 shrink-0">{dNasc}</span>
                                        {cats.length > 0 ? (
                                          <span className="text-xs text-slate-900 font-semibold uppercase shrink-0">{cats.join(', ')}</span>
                                        ) : (
                                          <span className="text-slate-400 font-normal shrink-0">-</span>
                                        )}
                                        {motherOrCns && (
                                          <span className="uppercase text-slate-700 truncate font-medium" title={motherOrCns}>
                                            {motherOrCns}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="col-span-2 sm:col-span-1 bg-white"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-text-muted">
                    <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Nenhum domicílio encontrado com os filtros selecionados.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                {filteredHouseholds.length > 0 ? (
                  filteredHouseholds.map((h, idx) => {
                    const family = getHouseholdFamilyDetails(h);
                    return (
                      <div 
                        key={h.id}
                        className="bg-bg-primary dark:bg-slate-800/40 border border-border dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs hover:border-teal-500/30 transition-all"
                      >
                        {/* 1. Logradouro - nº - complemento - contato */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-border dark:border-slate-800">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800/40 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-1.5">
                                  <Home className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                                  <span>{h.address || 'Sem logradouro'}</span>
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">,</span>
                                  <span>nº {h.number || 'S/N'}</span>
                                  {h.complement && (
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                      {h.complement}
                                    </span>
                                  )}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-text-secondary">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <strong className="font-semibold text-text-primary dark:text-slate-200">Contato:</strong> {family.contact}
                                </span>
                                {h.neighborhood && (
                                  <span className="text-slate-400">• Bairro: {h.neighborhood}</span>
                                )}
                                <span className="text-slate-400">• Microárea: {h.microarea || user?.microarea || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-lg border border-teal-200 dark:border-teal-800/40 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {family.dependents.length === 0 ? '1 Morador (Responsável)' : `${family.totalResidents} Moradores`}
                            </span>
                          </div>
                        </div>

                        {/* Residents: Responsável familiar & Dependentes */}
                        {family.dependents.length > 0 ? (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-3.5">
                            {/* 2. Responsável familiar - nome - data de nascimento */}
                            <div className="lg:col-span-5 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl p-3.5 flex flex-col justify-between">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded">
                                      👑 Responsável Familiar
                                    </span>
                                    {renderBolsaFamiliaBadge(family.responsible)}
                                  </div>
                                  {family.responsible && (
                                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                                      Cadastrado ✓
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-sm text-text-primary dark:text-white">
                                  {family.respName}
                                </p>
                                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                  <span>Data de Nascimento:</span>
                                  <strong className="text-text-primary dark:text-slate-200">
                                    {family.respBirth ? formatDate(family.respBirth) : 'Não informada'}
                                  </strong>
                                </p>
                                {renderResidentBadges(family.responsible)}
                              </div>
                              {family.respCns && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-2 pt-2 border-t border-teal-100/80 dark:border-teal-900/30">
                                  CNS: {family.respCns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}
                                </p>
                              )}
                            </div>

                            {/* 3. Dependentes - nome - data de nascimento */}
                            <div className="lg:col-span-7 bg-bg-secondary dark:bg-slate-900/50 border border-border dark:border-slate-800 rounded-xl p-3.5">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  <Users className="w-3 h-3" />
                                  Dependentes ({family.dependents.length})
                                </span>
                              </div>

                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {family.dependents.map((dep: any, dIdx: number) => (
                                  <div 
                                    key={dep.id || dIdx}
                                    className="bg-bg-primary dark:bg-slate-800/60 border border-border dark:border-slate-800 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="space-y-1 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-text-primary dark:text-white flex items-center gap-1.5">
                                          <span className="text-slate-400 font-normal text-[11px]">{dIdx + 1}.</span>
                                          {dep.name}
                                        </p>
                                        {renderBolsaFamiliaBadge(dep)}
                                      </div>
                                      <p className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>Nascimento:</span>
                                        <strong className="text-text-primary dark:text-slate-300">
                                          {dep.birth_date ? formatDate(dep.birth_date) : 'Não informada'}
                                        </strong>
                                      </p>
                                      {renderResidentBadges(dep)}
                                    </div>
                                    {dep.cns && (
                                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 self-start sm:self-auto shrink-0 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                                        CNS: {dep.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3.5">
                            {/* Apenas Responsável Familiar quando não há dependentes */}
                            <div className="bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2.5 py-0.5 rounded w-fit">
                                    👑 Responsável Familiar
                                  </span>
                                  {renderBolsaFamiliaBadge(family.responsible)}
                                </div>
                                {family.respCns && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/80 dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-900/30">
                                    CNS: {family.respCns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-base text-text-primary dark:text-white">
                                  {family.respName}
                                </p>
                                {family.responsible && (
                                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                                    Cadastrado ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span>Data de Nascimento:</span>
                                <strong className="text-text-primary dark:text-slate-200">
                                  {family.respBirth ? formatDate(family.respBirth) : 'Não informada'}
                                </strong>
                              </p>
                              {renderResidentBadges(family.responsible)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-text-muted">
                    <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Nenhum domicílio encontrado com os filtros selecionados.</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-bg-primary dark:bg-slate-800/40 border-b border-border dark:border-slate-800">
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted w-10">Nº</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Cidadão / CNS</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Nascimento / Idade</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Endereço & Contato</th>
                    {categoryFilter === 'Bolsa Família' ? (
                      <>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Responsável Familiar</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Benefício / Programa</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Acompanhamento de Saúde</th>
                      </>
                    ) : categoryFilter === 'Gestante' ? (
                      <>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">DUM / DPP</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Pré-Natal & Visitas</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Testes Rápidos</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">dTpa & Saúde Bucal</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Categorias</th>
                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Informações Clínicas / Agravos</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {categoryFilter === 'Bolsa Família' ? (
                    filteredPatients.map((p, idx) => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : '-';
                      return (
                        <tr key={p.id} className="hover:bg-bg-primary/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-teal-800 dark:text-teal-300">{p.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-text-primary dark:text-white text-xs">{p.birth_date ? formatDate(p.birth_date) : '-'}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{age}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs text-text-primary dark:text-white font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientAddress(p)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientContact(p)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {getPatientHouseholdResponsible(p)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                              <Gift className="w-3 h-3" />
                              Bolsa Família
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {getClinicalSummary(p)}
                          </td>
                        </tr>
                      );
                    })
                  ) : categoryFilter === 'Gestante' ? (
                    filteredPatients.map((p, idx) => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : '-';
                      const stats = getGestanteStats(p);
                      return (
                        <tr key={p.id} className="hover:bg-bg-primary/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-pink-700 dark:text-pink-300">{p.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-text-primary dark:text-white text-xs">
                              {p.birth_date ? formatDate(p.birth_date) : '-'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">{age}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs text-text-primary dark:text-white font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientAddress(p)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientContact(p)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <p className="font-semibold text-text-primary dark:text-white">
                              <span className="text-slate-400">DUM:</span> {stats.dum}
                            </p>
                            <p className="font-semibold text-pink-600 dark:text-pink-400 mt-0.5">
                              <span className="text-slate-400">DPP:</span> {stats.dpp}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              stats.consultas >= 6 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {stats.consultas} consultas PN
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ {stats.realizados.length > 0 ? stats.realizados.join(', ') : 'Nenhum'}
                            </p>
                            {stats.pendentes.length > 0 && (
                              <p className="text-[11px] text-red-500 dark:text-red-400 font-medium mt-0.5">
                                ⚠ Pendente: {stats.pendentes.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              dTpa: <span className={stats.vacinasTomadas.length > 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {stats.vacinasTomadas.length > 0 ? 'Em dia' : 'Pendente'}
                              </span>
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                              Bucal: {stats.saudeBucal}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    filteredPatients.map((p, idx) => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : '-';
                      return (
                        <tr key={p.id} className="hover:bg-bg-primary/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-teal-800 dark:text-teal-300">{p.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-text-primary dark:text-white text-xs">{p.birth_date ? formatDate(p.birth_date) : '-'}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{age}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs text-text-primary dark:text-white font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientAddress(p)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {getPatientContact(p)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {p.categories?.map((cat: string) => {
                                const catMap: Record<string, { primary: string; label: string }> = {
                                  'Gestante':           { primary: '#EC4899', label: 'Gestante' },
                                  'Criança':            { primary: '#3B82F6', label: 'Criança' },
                                  'Idoso':              { primary: '#F97316', label: 'Idoso' },
                                  'Adulto':             { primary: '#10B981', label: 'Adulto' },
                                  'AcamadoDomiciliado': { primary: '#64748B', label: 'Acamado' },
                                  'SaudeMental':        { primary: '#6366F1', label: 'S. Mental' },
                                };
                                const matched = catMap[cat];
                                if (!matched) return null;
                                return (
                                  <span key={cat}
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight text-white"
                                    style={{ backgroundColor: matched.primary }}
                                  >
                                    {matched.label}
                                  </span>
                                );
                              })}
                              {isPatientBolsaFamilia(p) && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  🎁 Bolsa Família
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xs">
                            {getClinicalSummary(p)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <BarChart3 className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-text-muted">Nenhum registro encontrado para este relatório com os filtros atuais.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
