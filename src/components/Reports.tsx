import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  Search, 
  Filter, 
  FileDown, 
  Loader2,
  Baby,
  Stethoscope,
  Activity,
  HeartPulse,
  User
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Reports({ user }: { user: any }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user.microarea && user.role !== 'Administrador') return;
      setLoading(true);
      try {
        let query = supabase
          .from('patients')
          .select('*')
          .order('name', { ascending: true });

        if (user.role === 'Administrador') {
          // No filters for Admin
        } else if (user.role === 'Gestor') {
          query = query.eq('area_color', user.color);
        } else {
          query = query.eq('agent_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients for reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [user.microarea]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.cns?.includes(searchTerm);
    const matchesCategory = categoryFilter === 'Todas' || p.categories?.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const getClinicalSummary = (p: any) => {
    const clinical = p.clinical_data || {};
    let info = [];

    if (p.categories?.includes('Gestante')) {
      const g = clinical.gestante || {};
      if (g.dpp) info.push(`DPP: ${g.dpp}`);
      
      // Consultas
      const consultasCount = g.consultas?.filter((c: string) => c).length || 0;
      if (consultasCount > 0) info.push(`${consultasCount} Consultas`);
      
      // Testes Rápidos
      let tests = [];
      if (g.sifilis === 'Sim') tests.push('Sífilis');
      if (g.hiv === 'Sim') tests.push('HIV');
      if (g.hepatiteB === 'Sim') tests.push('HepB');
      if (tests.length > 0) info.push(`Testes: ${tests.join(',')}`);

      // Saúde Bucal
      if (g.saudeBucal) info.push(`Odonto: ${g.saudeBucal}`);
      
      if (g.diabetes === 'Sim') info.push('Diabetes');
      if (g.pressaoAlta === 'Sim') info.push('Hipertensão');
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
      if (i.diabetes === 'Sim') info.push('Diabetes');
      if (i.pressaoAlta === 'Sim') info.push('Hipertensão');
    }
    if (p.categories?.includes('Adulto')) {
      const ad = clinical.adulto || {};
      if (ad.diabetes === 'Sim') info.push('Diabetes');
      if (ad.pressaoAlta === 'Sim') info.push('Hipertensão');
    }

    return info.length > 0 ? info.join(' | ') : 'Sem dados clínicos';
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
    doc.text(`Filtro: ${categoryFilter} | Total: ${filteredPatients.length} pacientes`, 14, 36);

    const tableData = filteredPatients.map(p => [
      p.name,
      p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A',
      p.categories?.join(', ') || 'N/A',
      getClinicalSummary(p)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Nome', 'Nascimento', 'Categorias', 'Informações Clínicas']],
      body: tableData,
      headStyles: { fillColor: [0, 72, 141] },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    doc.save(`Relatorio_Microarea_${user.microarea}_${categoryFilter}.pdf`);
  };

  const categories = ['Todas', 'Gestante', 'Criança', 'AcamadoDomiciliado', 'Idoso', 'Adulto'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Relatórios Territoriais</h2>
          <p className="text-slate-500 mt-1 font-medium">Gere documentos PDF com os dados consolidados da sua microárea.</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={filteredPatients.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <FileDown className="w-5 h-5" />
          Gerar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Filtros de Relatório</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou CNS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cidadão</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nascimento</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Categorias</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Resumo Clínico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredPatients.length > 0 ? (
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
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
