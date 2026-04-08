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

import { calculateAge, getAgeInMonths, VACCINE_SCHEDULE, formatDate } from '../lib/dateUtils';

export function Reports({ user }: { user: any }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [streetFilter, setStreetFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user.microarea && user.role !== 'Administrador') return;
      setLoading(true);
      try {
        // Fetch Patients
        let pQuery = supabase
          .from('patients')
          .select('*')
          .order('name', { ascending: true });

        // Fetch Households
        let hQuery = supabase
          .from('households')
          .select('*, patients(id)')
          .order('address', { ascending: true });

        if (user.role === 'Administrador') {
          // No filters
        } else if (user.role === 'Gestor') {
          pQuery = pQuery.eq('area_color', user.color);
          hQuery = hQuery.eq('area_color', user.color);
        } else {
          pQuery = pQuery.eq('agent_id', user.id);
          hQuery = hQuery.eq('agent_id', user.id);
        }

        const [pRes, hRes] = await Promise.all([
          pQuery.range(0, 4999),
          hQuery.range(0, 4999)
        ]);

        if (pRes.error) throw pRes.error;
        if (hRes.error) throw hRes.error;

        setPatients(pRes.data || []);
        setHouseholds(hRes.data || []);
      } catch (error) {
        console.error("Error fetching data for reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.microarea, user.id, user.role, user.color]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.cns?.includes(searchTerm);
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
      info.push(`Dep: ${a.dependencia || 'N/A'}`);
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
      dum: g.dum ? new Date(g.dum).toLocaleDateString('pt-BR') : 'N/A',
      dpp: g.dpp ? new Date(g.dpp).toLocaleDateString('pt-BR') : 'N/A',
      saudeBucal: g.saudeBucal ? new Date(g.saudeBucal).toLocaleDateString('pt-BR') : 'Não Realizada'
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
        h.complement || '-',
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
          p.birth_date ? formatDate(p.birth_date) : 'N/A',
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
          p.birth_date ? calculateAge(p.birth_date) : 'N/A',
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
    } else {
      const mainTableData = filteredPatients.map(p => [
        p.name,
        p.birth_date ? calculateAge(p.birth_date) : 'N/A',
        p.categories?.join(', ') || 'N/A',
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
              p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A',
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
              p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A',
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

  const categories = ['Todas', 'Gestante', 'Criança', 'AcamadoDomiciliado', 'Idoso', 'Adulto', 'Domicílios'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Relatórios Territoriais</h2>
          <p className="text-slate-500 mt-1 font-medium">Gere documentos PDF com os dados consolidados da sua microárea.</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={categoryFilter === 'Domicílios' ? filteredHouseholds.length === 0 : filteredPatients.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <FileDown className="w-5 h-5" />
          Gerar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Filter className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={categoryFilter === 'Domicílios' ? "Pesquisar endereço ou responsável..." : "Pesquisar nome ou CNS..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            />
          </div>

          {categoryFilter === 'Domicílios' && (
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Filtrar por rua..."
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              />
            </div>
          )}

          <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide ${categoryFilter === 'Domicílios' ? 'md:col-span-1' : 'md:col-span-1'}`}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                  categoryFilter === cat 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Carregando dados para o relatório...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-5 h-5" />
            <h3 className="text-lg font-bold font-headline">
              {categoryFilter === 'Domicílios' ? 'Lista de Domicílios' : 'Lista Geral de Pacientes'}
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  {categoryFilter === 'Domicílios' ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Endereço</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nº / Comp.</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Responsável</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Moradores</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cidadão</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nascimento</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Categorias</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Resumo Clínico</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {categoryFilter === 'Domicílios' ? (
                  filteredHouseholds.length > 0 ? (
                    filteredHouseholds.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-on-surface">{h.address}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {h.number} {h.complement ? ` - ${h.complement}` : ''}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-on-surface">{h.responsible_name}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-primary/5 text-primary text-xs font-bold rounded-full">
                            {h.patients?.length || 0} pessoas
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500 font-medium">
                        Nenhum domicílio encontrado.
                      </td>
                    </tr>
                  )
                ) : (
                  filteredPatients.length > 0 ? (
                    filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-on-surface">{p.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{p.cns}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1">
                            {p.categories?.map((cat: string) => (
                              <span key={cat} className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">
                            {getClinicalSummary(p)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500 font-medium">
                        Nenhum paciente encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
