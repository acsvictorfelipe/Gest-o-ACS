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
  Droplets
} from 'lucide-react';
import { UI_CONFIG } from '../constants';

import { 
  calculateAge, 
  getAgeInMonths, 
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
          select: '*, patients(id)',
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

  const filteredHouseholds = useMemo(() => {
    return households.filter(h => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            h.responsible_name?.toLowerCase().includes(term) || 
                            h.address?.toLowerCase().includes(term);
      const matchesStreet = !streetFilter || h.address?.toLowerCase().includes(streetFilter.toLowerCase());
      
      const isPlaceholder = h.responsible_name === 'Responsável Importado' || 
                            h.responsible_name === 'Responsável não cadastrado' ||
                            !h.responsible_name;
      
      return matchesSearch && matchesStreet && !isPlaceholder;
    });
  }, [households, searchTerm, streetFilter]);

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
          p.birth_date ? `${formatDate(p.birth_date)} (${age}a)` : '-',
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
          grupo = ageInM <= 84 ? `👶 Criança (${age}a - Puericultura/Vacina)` : `🧒 Criança/Adolescente (${age}a)`;
        } else if (Number(age) >= 60) {
          grupo = '👵 Idoso';
        }

        const benefits = p.clinical_data?.socialBenefits?.join(', ') || 'Bolsa Família';

        return [
          idx + 1,
          p.name || 'Sem nome',
          p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          p.birth_date ? `${formatDate(p.birth_date)} (${age} anos)` : '-',
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
          p.birth_date ? `${formatDate(p.birth_date)} (${age}a)` : '-',
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
          p.birth_date ? `${formatDate(p.birth_date)} (${age}a / ${stats.ageInMonths}m)` : '-',
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
          p.birth_date ? `${formatDate(p.birth_date)} (${age}a)` : '-',
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
          p.birth_date ? `${formatDate(p.birth_date)} (${age}a)` : '-',
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

    // 8. RELATÓRIO DE DOMICÍLIOS
    if (categoryFilter === 'Domicílios') {
      const doc = new jsPDFModule({ orientation: 'portrait' });

      doc.setFontSize(16);
      doc.setTextColor(0, 72, 141);
      doc.text('RELATÓRIO TERRITORIAL DE DOMICÍLIOS E FAMÍLIAS', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Agente: ${user.name} | Microárea: ${user.microarea || '-'} | Total de Domicílios: ${filteredHouseholds.length} | Emitido em: ${emitDateStr}`, 14, 22);

      const tableData = filteredHouseholds.map((h, idx) => [
        idx + 1,
        h.address || 'Sem logradouro',
        h.number || 'S/N',
        h.complement || '-',
        h.responsible_name || 'Não informado',
        `${h.patients?.length || 0} moradores`
      ]);

      autoTable(doc, {
        startY: 27,
        head: [['Nº', 'Logradouro / Endereço', 'Número', 'Complemento', 'Responsável Familiar', 'Moradores']],
        body: tableData,
        headStyles: { fillColor: [0, 72, 141], fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`Relatorio_Domicilios_MA_${user.microarea || 'Geral'}.pdf`);
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
        p.birth_date ? `${formatDate(p.birth_date)} (${age}a)` : '-',
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
                placeholder="Filtrar por rua específica..."
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-teal-600/20 transition-all text-text-primary dark:text-white"
              />
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
          <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-text-primary dark:text-white uppercase tracking-wider">
                {categoryFilter === 'Geral' ? '📋 Relatório Geral Completo de Cidadãos' :
                 categoryFilter === 'Bolsa Família' ? '🎁 Relação de Beneficiários do Bolsa Família' :
                 categoryFilter === 'Domicílios' ? '🏠 Cadastro de Domicílios e Famílias' :
                 `👥 Relatório de Pacientes - ${categoryFilter}`}
              </h3>
            </div>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-3 py-1 rounded-full border border-teal-100 dark:border-teal-900/30">
              {categoryFilter === 'Domicílios' ? `${filteredHouseholds.length} Domicílios` : `${filteredPatients.length} Pacientes`}
            </span>
          </div>

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
                  ) : categoryFilter === 'Domicílios' ? (
                    <>
                      <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Responsável do Domicílio</th>
                      <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Total Moradores</th>
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
                {categoryFilter === 'Domicílios' ? (
                  filteredHouseholds.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-text-primary dark:text-white">{h.address}</td>
                      <td className="px-4 py-3.5 text-text-secondary font-medium">{h.number} {h.complement ? `- ${h.complement}` : ''}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{h.responsible_name || 'Titular não cadastrado'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold rounded-lg border border-teal-100 dark:border-teal-900/30">
                          {h.patients?.length || 0} Moradores
                        </span>
                      </td>
                    </tr>
                  ))
                ) : categoryFilter === 'Bolsa Família' ? (
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
                          <p className="text-[11px] text-slate-500 font-medium">{age} anos</p>
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
                          <p className="text-[11px] text-slate-500 font-medium">{age} anos</p>
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

                {(categoryFilter === 'Domicílios' ? filteredHouseholds.length : filteredPatients.length) === 0 && (
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
        </div>
      )}
    </div>
  );
}
