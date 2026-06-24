import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  Activity
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UI_CONFIG } from '../constants';

import { calculateAge, getAgeInMonths, VACCINE_SCHEDULE, formatDate } from '../lib/dateUtils';

export function Reports({ user }: { user: any }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
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
      if (!user.microarea && user.role !== 'Administrador') return;
      setLoading(true);
      try {
        // Fetch Patients in chunks
        let allPatients: any[] = [];
        let pFrom = 0;
        let pTo = 999;
        let pHasMore = true;

        while (pHasMore && allPatients.length < 10000) {
          let pQuery = supabase
            .from('patients')
            .select('*')
            .order('name', { ascending: true })
            .range(pFrom, pTo);

          if (user.role === 'Administrador') {
          } else if (user.role === 'Gestor') {
            pQuery = pQuery.eq('area_color', user.color);
          } else {
            pQuery = pQuery.eq('agent_id', user.id);
          }

          const { data, error } = await pQuery;
          if (error) throw error;
          if (data && data.length > 0) {
            allPatients = [...allPatients, ...data];
            if (data.length < 1000) pHasMore = false;
            else { pFrom += 1000; pTo += 1000; }
          } else pHasMore = false;
        }

        // Fetch Households in chunks
        let allHouseholds: any[] = [];
        let hFrom = 0;
        let hTo = 999;
        let hHasMore = true;

        while (hHasMore && allHouseholds.length < 5000) {
          let hQuery = supabase
            .from('households')
            .select('*, patients(id)')
            .order('address', { ascending: true })
            .range(hFrom, hTo);

          if (user.role === 'Administrador') {
          } else if (user.role === 'Gestor') {
            hQuery = hQuery.eq('area_color', user.color);
          } else {
            hQuery = hQuery.eq('agent_id', user.id);
          }

          const { data, error } = await hQuery;
          if (error) throw error;
          if (data && data.length > 0) {
            allHouseholds = [...allHouseholds, ...data];
            if (data.length < 1000) hHasMore = false;
            else { hFrom += 1000; hTo += 1000; }
          } else hHasMore = false;
        }

        setPatients(allPatients);
        setHouseholds(allHouseholds);
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
        let allVisits: any[] = [];
        let vFrom = 0;
        let vTo = 999;
        let vHasMore = true;

        while (vHasMore) {
          let query = supabase
            .from('visits')
            .select(`
              *,
              patients (
                id,
                name,
                cns,
                birth_date,
                categories,
                clinical_data
              )
            `)
            .order('date', { ascending: true })
            .range(vFrom, vTo);

          if (user.role === 'Administrador') {
            // No filters
          } else if (user.role === 'Gestor') {
            query = query.eq('area_color', user.color);
          } else {
            query = query.eq('agent_id', user.id);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            allVisits = [...allVisits, ...data];
            if (data.length < 1000) {
              vHasMore = false;
            } else {
              vFrom += 1000;
              vTo += 1000;
            }
          } else {
            vHasMore = false;
          }
        }

        // Filter by selected year and month
        const filtered = allVisits.filter(v => {
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

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.cns?.includes(searchTerm);
    
    if (categoryFilter === 'Beneficiários') {
      const benefits = p.clinical_data?.socialBenefits || [];
      return matchesSearch && benefits.length > 0;
    }

    const matchesCategory = categoryFilter === 'Todas' || p.categories?.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const filteredHouseholds = households.filter(h => {
    const matchesSearch = h.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStreet = !streetFilter || h.address?.toLowerCase().includes(streetFilter.toLowerCase());
    
    const isPlaceholder = h.responsible_name === 'Responsável Importado' || 
                          h.responsible_name === 'Responsável não cadastrado' ||
                          !h.responsible_name;
    
    return matchesSearch && matchesStreet && !isPlaceholder;
  });

  const getClinicalSummary = (p: any) => {
    const clinical = p.clinical_data || {};
    let info = [];

    const isDiabetico = clinical.chronic?.diabetes === 'Sim' || 
                        clinical.gestante?.diabetes === 'Sim' || 
                        clinical.acamadodomiciliado?.diabetes === 'Sim' || 
                        clinical.idoso?.diabetes === 'Sim' || 
                        clinical.adulto?.diabetes === 'Sim';
    
    const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || 
                         clinical.gestante?.hipertensao === 'Sim' || 
                         clinical.gestante?.pressaoAlta === 'Sim' || 
                         clinical.acamadodomiciliado?.hipertensao === 'Sim' || 
                         clinical.acamadodomiciliado?.pressaoAlta === 'Sim' || 
                         clinical.idoso?.hipertensao === 'Sim' || 
                         clinical.idoso?.pressaoAlta === 'Sim' || 
                         clinical.adulto?.hipertensao === 'Sim' || 
                         clinical.adulto?.pressaoAlta === 'Sim';

    if (isDiabetico) info.push('Diabetes');
    if (isHipertenso) info.push('Hipertensão');

    if (p.categories?.includes('Gestante')) {
      const g = clinical.gestante || {};
      if (g.dpp) info.push(`DPP: ${g.dpp}`);
      
      // Consultas
      const consultasCount = g.consultas?.filter((c: string) => c).length || 0;
      if (consultasCount > 0) info.push(`${consultasCount} Consultas`);
      
      // Testes Rápidos
      let tests = [];
      if (g.sifilis && g.sifilis !== 'NÃO REALIZADO') tests.push('Sífilis');
      if (g.hiv && g.hiv !== 'NÃO REALIZADO') tests.push('HIV');
      if (g.hepatiteB && g.hepatiteB !== 'NÃO REALIZADO') tests.push('HepB');
      if (g.hepatiteC && g.hepatiteC !== 'NÃO REALIZADO') tests.push('HepC');
      if (tests.length > 0) info.push(`Testes: ${tests.join(',')}`);

      if (g.dtpa === 'Sim') info.push('dTpa OK');
    }
    if (p.categories?.includes('Criança')) {
      const c = clinical.crianca || {};
      
      // Consultas
      const consultasCount = c.consultas?.filter((c: string) => c).length || 0;
      if (consultasCount > 0) info.push(`${consultasCount} Consultas`);

      // Vacinas (check if any are filled)
      if (c.vacinas) {
        const filledVacinas = Object.values(c.vacinas).filter(v => v).length;
        if (filledVacinas > 0) info.push(`${filledVacinas} Vacinas`);
        else info.push('Vacinas Pendentes');
      }
    }
    if (p.categories?.includes('AcamadoDomiciliado')) {
      const a = clinical.acamadodomiciliado || {};
      info.push(`Dep: ${a.dependencia || ''}`);
      if (a.curativos === 'Sim') info.push('Curativos');
      if (a.usoFralda === 'Sim') {
        info.push(`Fralda: ${a.tamanhoFralda || 'S/T'}`);
      }
    }
    if (p.categories?.includes('Idoso')) {
      const i = clinical.idoso || {};
      // No extra info needed here as chronic is handled above
    }
    if (p.categories?.includes('Adulto')) {
      const ad = clinical.adulto || {};
      // No extra info needed here as chronic is handled above
    }

    if (p.categories?.includes('SaudeMental')) {
      const sm = clinical.saudeMental || {};
      if (sm.notes) info.push(`S.Mental: ${sm.notes}`);
    }

    if (clinical.socialBenefits && clinical.socialBenefits.length > 0) {
      info.push(`Benefícios: ${clinical.socialBenefits.join(', ')}`);
    }

    return info.length > 0 ? info.join(' | ') : 'Sem dados clínicos';
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
      dum: g.dum ? formatDate(g.dum) : '',
      dpp: g.dpp ? formatDate(g.dpp) : '',
      saudeBucal: g.saudeBucal ? formatDate(g.saudeBucal) : ''
    };
  };

  const getCriancaStats = (p: any) => {
    const c = p.clinical_data?.crianca || {};
    const consultas = c.consultas?.filter((v: string) => v).length || 0;
    
    const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
    const vacinas = c.vacinas || {};
    const tomadasKeys = Object.entries(vacinas)
      .filter(([_, v]) => v === 'Sim' || (typeof v === 'string' && v.length > 5)) // Handle 'Sim' or legacy date strings
      .map(([k, _]) => k);
    
    const vaccineLabels: Record<string, string> = {
      bcg: 'BCG',
      hepB_nascer: 'Hep B (Nascer)',
      penta1: 'Penta 1ª',
      penta2: 'Penta 2ª',
      penta3: 'Penta 3ª',
      vip1: 'VIP 1ª',
      vip2: 'VIP 2ª',
      vip3: 'VIP 3ª',
      vipR: 'VIP (R)',
      pneumo10_1: 'Pneumo 10 1ª',
      pneumo10_2: 'Pneumo 10 2ª',
      pneumo10_3: 'Pneumo 10 3ª',
      rotavirus1: 'Rotavírus 1ª',
      rotavirus2: 'Rotavírus 2ª',
      menC1: 'MenC 1ª',
      menC2: 'MenC 2ª',
      menC3: 'MenC 3ª',
      fa: 'Febre Amarela',
      scr1: 'SCR 1ª',
      dtp: 'DTP',
      hepA: 'Hep A',
      scrv: 'SCRV',
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
    };

    const tomadas = tomadasKeys.map(k => vaccineLabels[k] || k);
    
    // Get vaccines that should have been taken by now based on age
    const dueVaccines = VACCINE_SCHEDULE
      .filter(group => group.age <= ageInMonths)
      .flatMap(group => group.vaccines);
      
    const pendentes = dueVaccines
      .filter(v => vacinas[v.id] !== 'Sim')
      .map(v => v.label);
    
    return { consultas, tomadas, pendentes };
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    if (categoryFilter === 'Produção Mensal') {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const compStr = `${monthNames[selectedMonth - 1]} / ${selectedYear}`;

      // Reset header styling for professional look
      doc.setFontSize(16);
      doc.setTextColor(13, 148, 136); // Teal primary color
      doc.text('Consolidação Mensal de Produção - ACS', 14, 20);
      
      const colorNames: Record<string, string> = {
        '#00488d': 'Azul',
        '#eab308': 'Amarelo',
        '#64748b': 'Cinza',
        '#db2777': 'Rosa',
        '#78350f': 'Marrom'
      };
      const userColorLabel = user.color ? (colorNames[user.color.toLowerCase()] || user.color) : 'N/A';

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Agente de Saúde: ${user.name} | Microárea: ${user.microarea} | Área: ${userColorLabel}`, 14, 28);
      doc.text(`Competência: ${compStr} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

      // Calculations
      const vRealizadas = visits.filter(v => v.outcome === 'Realizada' || !v.outcome).length;
      const vAusentes = visits.filter(v => v.outcome === 'Ausente').length;
      const vRecusadas = visits.filter(v => v.outcome === 'Recusada').length;

      const vGestantes = visits.filter(v => v.patients?.categories?.includes('Gestante')).length;
      const vCriancas = visits.filter(v => v.patients?.categories?.includes('Criança')).length;
      const vIdosos = visits.filter(v => v.patients?.categories?.includes('Idoso')).length;
      const vAcamados = visits.filter(v => v.patients?.categories?.includes('AcamadoDomiciliado')).length;
      const vMental = visits.filter(v => v.patients?.categories?.includes('SaudeMental')).length;

      const vDiabeticos = visits.filter(v => {
        const clinical = v.patients?.clinical_data || {};
        return clinical.chronic?.diabetes === 'Sim' || clinical.gestante?.diabetes === 'Sim' || clinical.acamadodomiciliado?.diabetes === 'Sim' || clinical.idoso?.diabetes === 'Sim' || clinical.adulto?.diabetes === 'Sim';
      }).length;

      const vHipertensos = visits.filter(v => {
        const clinical = v.patients?.clinical_data || {};
        return clinical.chronic?.hipertensao === 'Sim' || clinical.gestante?.hipertensao === 'Sim' || clinical.acamadodomiciliado?.hipertensao === 'Sim' || clinical.idoso?.hipertensao === 'Sim' || clinical.adulto?.hipertensao === 'Sim';
      }).length;

      // Summary Table
      const summaryData = [
        ['Total de Visitas Domiciliares Realizadas', vRealizadas],
        ['Total de Visitas Domiciliares Ausentes', vAusentes],
        ['Total de Visitas Domiciliares Recusadas', vRecusadas],
        ['Visitas de Acompanhamento a Gestantes', vGestantes],
        ['Visitas de Acompanhamento a Crianças (0 a 12 anos)', vCriancas],
        ['Visitas de Acompanhamento a Hipertensos', vHipertensos],
        ['Visitas de Acompanhamento a Diabéticos', vDiabeticos],
        ['Visitas de Acompanhamento a Idosos', vIdosos],
        ['Visitas de Acompanhamento a Acamados/Domiciliados', vAcamados],
        ['Visitas de Acompanhamento a Saúde Mental', vMental]
      ];

      doc.setFontSize(12);
      doc.setTextColor(0, 72, 141);
      doc.text('I. QUADRO RESUMO DE PRODUÇÃO', 14, 44);

      autoTable(doc, {
        startY: 48,
        head: [['Atividade / Indicador de Produção', 'Quantidade Consolidada']],
        body: summaryData,
        headStyles: { fillColor: [13, 148, 136] }, // Teal header
        styles: { fontSize: 9, cellPadding: 3.5 },
        alternateRowStyles: { fillColor: [244, 252, 251] }
      });

      let nextY = (doc as any).lastAutoTable.finalY + 10;

      // Detailed Table
      doc.setFontSize(12);
      doc.setTextColor(0, 72, 141);
      doc.text('II. RELAÇÃO NOMINAL DE VISITAS REALIZADAS', 14, nextY);
      nextY += 4;

      const detailData = visits.map((v, idx) => {
        const formattedDate = formatDate(v.date);
        return [
          idx + 1,
          formattedDate,
          v.patients?.name || 'Paciente não localizado',
          v.patients?.cns ? v.patients.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS',
          v.type || 'Rotina',
          v.outcome || 'Realizada'
        ];
      });

      autoTable(doc, {
        startY: nextY,
        head: [['Nº', 'Data', 'Nome do Cidadão', 'CNS', 'Tipo de Atendimento', 'Desfecho']],
        body: detailData,
        headStyles: { fillColor: [59, 130, 246] }, // Blue header
        styles: { fontSize: 8, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`Consolidado_Producao_${user.microarea}_${selectedMonth}_${selectedYear}.pdf`);
      return;
    }

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 72, 141); // Primary Blue
    doc.text('Relatório Territorial de Saúde', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Agente: ${user.name} | Microárea: ${user.microarea} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Filtro: ${categoryFilter} | Total: ${categoryFilter === 'Domicílios' ? filteredHouseholds.length : filteredPatients.length} registros`, 14, 36);

    const gestantes = filteredPatients.filter(p => p.categories?.includes('Gestante'));
    const criancas = filteredPatients.filter(p => p.categories?.includes('Criança'));

    if (categoryFilter === 'Domicílios') {
      const householdData = filteredHouseholds.map(h => [
        h.address,
        h.number,
        h.complement || '',
        h.responsible_name,
        h.patients?.length || 0
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Endereço', 'Nº', 'Comp.', 'Responsável', 'Moradores']],
        body: householdData,
        headStyles: { fillColor: [0, 72, 141] },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
    } else if (categoryFilter === 'Gestante') {
      const gestanteData = gestantes.map(p => {
        const stats = getGestanteStats(p);
        return [
          p.name,
          p.birth_date ? formatDate(p.birth_date) : '',
          stats.dum,
          stats.dpp,
          stats.consultas,
          stats.realizados.join(', ') || 'Nenhum',
          stats.pendentes.join(', ') || 'Nenhum',
          stats.vacinasTomadas.join(', ') || 'Nenhuma',
          stats.saudeBucal
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Nome', 'Nascimento', 'DUM', 'DPP', 'Consultas', 'Testes Realizados', 'Testes Pendentes', 'Vacinas', 'Saúde Bucal']],
        body: gestanteData,
        headStyles: { fillColor: [0, 72, 141] },
        styles: { fontSize: 6, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
    } else if (categoryFilter === 'Criança') {
      const criancaData = criancas.map(p => {
        const stats = getCriancaStats(p);
        return [
          p.name,
          p.birth_date ? formatDate(p.birth_date) : '',
          stats.consultas,
          stats.tomadas.join(', ') || 'Nenhuma',
          stats.pendentes.join(', ') || 'Nenhuma'
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Nome', 'Nascimento', 'Consultas', 'Vacinas Tomadas', 'Vacinas Pendentes']],
        body: criancaData,
        headStyles: { fillColor: [0, 72, 141] },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
    } else if (categoryFilter === 'Beneficiários') {
      const beneficiarioData = filteredPatients.map(p => [
        p.name,
        p.birth_date ? formatDate(p.birth_date) : '',
        p.clinical_data?.socialBenefits?.join(', ') || 'Nenhum',
        p.categories?.join(', ') || ''
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Nome', 'Nascimento', 'Benefícios', 'Categorias']],
        body: beneficiarioData,
        headStyles: { fillColor: [0, 72, 141] },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
    } else {
      const mainTableData = filteredPatients.map(p => [
        p.name,
        p.birth_date ? formatDate(p.birth_date) : '',
        p.categories?.join(', ') || '',
        getClinicalSummary(p)
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Nome', 'Nascimento', 'Categorias', 'Informações Clínicas']],
        body: mainTableData,
        headStyles: { fillColor: [0, 72, 141] },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      if (categoryFilter === 'Todas') {
        if (gestantes.length > 0) {
          if (currentY > 250) { doc.addPage(); currentY = 20; }
          doc.setFontSize(14);
          doc.setTextColor(0, 72, 141);
          doc.text('Acompanhamento de Gestantes', 14, currentY);
          currentY += 5;

          const gestanteData = gestantes.map(p => {
            const stats = getGestanteStats(p);
            return [
              p.name,
              p.birth_date ? formatDate(p.birth_date) : '',
              stats.dum,
              stats.dpp,
              stats.consultas,
              stats.realizados.join(', ') || 'Nenhum',
              stats.pendentes.join(', ') || 'Nenhum',
              stats.vacinasTomadas.join(', ') || 'Nenhuma',
              stats.saudeBucal
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Nome', 'Nascimento', 'DUM', 'DPP', 'Consultas', 'Testes Realizados', 'Testes Pendentes', 'Vacinas', 'Saúde Bucal']],
            body: gestanteData,
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 6, cellPadding: 1.5 }
          });
          currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        if (criancas.length > 0) {
          if (currentY > 250) { doc.addPage(); currentY = 20; }
          doc.setFontSize(14);
          doc.setTextColor(0, 72, 141);
          doc.text('Acompanhamento de Crianças', 14, currentY);
          currentY += 5;

          const criancaData = criancas.map(p => {
            const stats = getCriancaStats(p);
            return [
              p.name,
              p.birth_date ? formatDate(p.birth_date) : '',
              stats.consultas,
              stats.tomadas.join(', ') || 'Nenhuma',
              stats.pendentes.join(', ') || 'Nenhuma'
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Nome', 'Nascimento', 'Consultas', 'Vacinas Tomadas', 'Vacinas Pendentes']],
            body: criancaData,
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 7, cellPadding: 2 }
          });
        }
      }
    }

    doc.save(`Relatorio_Microarea_${user.microarea}_${categoryFilter}.pdf`);
  };

  const categories = ['Todas', 'Gestante', 'Criança', 'AcamadoDomiciliado', 'Idoso', 'Adulto', 'SaudeMental', 'Beneficiários', 'Domicílios', 'Produção Mensal'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white">Relatórios</h2>
          <p className="text-sm text-text-secondary font-medium tracking-tight">Gere documentos consolidados da sua microárea.</p>
        </header>
        <button 
          onClick={generatePDF}
          disabled={categoryFilter === 'Produção Mensal' ? visits.length === 0 || fetchingVisits : categoryFilter === 'Domicílios' ? filteredHouseholds.length === 0 : filteredPatients.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          Gerar PDF
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase transition-all tracking-tight whitespace-nowrap ${
                categoryFilter === cat 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 text-text-secondary dark:text-text-muted hover:bg-bg-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {categoryFilter === 'Produção Mensal' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 px-3.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
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
                  className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 px-3.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="relative group col-span-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder={categoryFilter === 'Domicílios' ? "Pesquisar endereço ou responsável..." : "Pesquisar nome ou CNS..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
              />
            </div>
          )}

          {categoryFilter === 'Domicílios' && (
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Filtrar por rua..."
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">Carregando dados...</p>
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
                  {visits.filter(v => v.patients?.categories?.includes('Criança')).length}
                </span>
              </div>
            </div>

            {/* Main Visitas List Table Card */}
            <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="text-sm font-bold text-text-primary dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  Detalhamento Nominal das Visitas
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
        <div className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary dark:text-white uppercase tracking-tight">
              {categoryFilter === 'Domicílios' ? 'Lista de Domicílios' : 'Lista de Cidadãos'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-bg-primary dark:bg-slate-800/30 border-b border-border dark:border-slate-800">
                  {categoryFilter === 'Beneficiários' ? (
                    <>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Cidadão</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nascimento</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Benefícios</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Monitoramento</th>
                    </>
                  ) : categoryFilter === 'Domicílios' ? (
                    <>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Endereço</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nº / Comp.</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Responsável</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted text-right">Moradores</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Cidadão</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nascimento</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Categorias</th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Resumo Clínico</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {categoryFilter === 'Beneficiários' ? (
                  filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-text-primary dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-text-secondary font-medium">{p.birth_date ? formatDate(p.birth_date) : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p.clinical_data?.socialBenefits?.map((benefit: string) => (
                            <span key={benefit} className="text-[9px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">{benefit}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                                className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight border"
                                style={{ 
                                  backgroundColor: matched.primary,
                                  color: '#fff'
                                }}
                              >
                                {matched.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : categoryFilter === 'Domicílios' ? (
                  filteredHouseholds.map((h) => (
                    <tr key={h.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-text-primary dark:text-white">{h.address}</td>
                      <td className="px-6 py-4 text-text-secondary font-medium">{h.number} {h.complement ? `- ${h.complement}` : ''}</td>
                      <td className="px-6 py-4 font-semibold text-text-primary dark:text-white">{h.responsible_name}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded uppercase">
                          {h.patients?.length || 0} Pessoas
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-text-primary dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-text-secondary font-medium">{p.birth_date ? formatDate(p.birth_date) : '-'}</td>
                      <td className="px-6 py-4">
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
                                className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight border"
                                style={{ 
                                  backgroundColor: matched.primary,
                                  color: '#fff'
                                }}
                              >
                                {matched.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary italic font-medium leading-relaxed truncate max-w-sm">
                        {getClinicalSummary(p)}
                      </td>
                    </tr>
                  ))
                )}
                {(categoryFilter === 'Domicílios' ? filteredHouseholds.length : filteredPatients.length) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-slate-200" />
                        <p className="text-sm font-medium text-text-muted">Nenhum dado encontrado para os filtros atuais.</p>
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

