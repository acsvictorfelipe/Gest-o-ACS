import React, { useState, useEffect } from 'react';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { Download, FileText, Loader2, Users, Heart, Activity, FileSpreadsheet } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import { useToast } from './Toast';

type ExportType = 'basic' | 'diabetes' | 'hypertension' | 'clinical_all';

export function ExportTool({ user }: { user: any }) {
  const { warning, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [selectedType, setSelectedType] = useState<ExportType>('basic');
  const [counts, setCounts] = useState<{ basic: number; diabetes: number; hypertension: number; clinical_all: number } | null>(null);
  const [fetchingCounts, setFetchingCounts] = useState(false);

  const getDiabetesData = (p: any) => {
    const clinical = p.clinical_data || {};
    return clinical.chronic?.diabetesData || 
           clinical.adulto?.diabetesData || 
           clinical.idoso?.diabetesData || 
           clinical.gestante?.diabetesData || 
           clinical.acamadodomiciliado?.diabetesData || {};
  };

  const getHypertensionData = (p: any) => {
    const clinical = p.clinical_data || {};
    return clinical.chronic?.hipertensaoData || 
           clinical.adulto?.hipertensaoData || 
           clinical.idoso?.hipertensaoData || 
           clinical.gestante?.hipertensaoData || 
           clinical.acamadodomiciliado?.hipertensaoData || {};
  };

  const isPatientDiabetic = (p: any) => {
    const clinical = p.clinical_data || {};
    return clinical.chronic?.diabetes === 'Sim' || 
           clinical.gestante?.diabetes === 'Sim' || 
           clinical.adulto?.diabetes === 'Sim' || 
           clinical.idoso?.diabetes === 'Sim' || 
           clinical.acamadodomiciliado?.diabetes === 'Sim';
  };

  const isPatientHypertensive = (p: any) => {
    const clinical = p.clinical_data || {};
    return clinical.chronic?.hipertensao === 'Sim' || 
           clinical.gestante?.hipertensao === 'Sim' || 
           clinical.adulto?.hipertensao === 'Sim' || 
           clinical.idoso?.hipertensao === 'Sim' || 
           clinical.acamadodomiciliado?.hipertensao === 'Sim';
  };

  useEffect(() => {
    async function loadCounts() {
      if (!user) return;
      setFetchingCounts(true);
      try {
        const data = await fetchTableWithFilters<any>('patients', user, {
          select: 'id, clinical_data, categories'
        });
        if (data) {
          const basicCount = data.length;
          const diabetesCount = data.filter(p => isPatientDiabetic(p)).length;
          const hypertensionCount = data.filter(p => isPatientHypertensive(p)).length;
          const clinicalAllCount = data.length;
          setCounts({
            basic: basicCount,
            diabetes: diabetesCount,
            hypertension: hypertensionCount,
            clinical_all: clinicalAllCount
          });
        }
      } catch (err) {
        console.error('Error fetching preview counts:', err);
      } finally {
        setFetchingCounts(false);
      }
    }
    loadCounts();
  }, [user]);

  const exportData = async () => {
    setLoading(true);
    try {
      const data = await fetchTableWithFilters<any>('patients', user, {
        select: '*, households(address, number, complement, microarea)'
      });

      if (!data || data.length === 0) {
        warning('Nenhum dado encontrado para exportação.');
        return;
      }

      // Filter patients based on selected type
      let filteredData = data;
      if (selectedType === 'diabetes') {
        filteredData = data.filter(p => isPatientDiabetic(p));
      } else if (selectedType === 'hypertension') {
        filteredData = data.filter(p => isPatientHypertensive(p));
      }

      if (filteredData.length === 0) {
        warning('Nenhum paciente atende aos critérios do filtro selecionado.');
        return;
      }

      setExportCount(filteredData.length);

      let headers: string[] = [];
      const csvRows: string[][] = [];

      // Helper function to escape CSV values safely
      const safeString = (str: any) => {
        if (str === null || str === undefined) return '';
        const cleaned = String(str).replace(/"/g, '""'); // Escape quotes
        if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n') || cleaned.includes(';')) {
          return `"${cleaned}"`;
        }
        return cleaned;
      };

      if (selectedType === 'basic') {
        headers = [
          'Nome do Paciente',
          'CNS',
          'Data de Nascimento',
          'Sexo',
          'Contato Primário',
          'Endereço',
          'Número',
          'Complemento',
          'Microárea'
        ];

        filteredData.forEach((p: any) => {
          const address = p.clinical_data?.address || p.households?.address || '';
          const number = p.clinical_data?.address_number || p.households?.number || '';
          const complement = p.clinical_data?.address_complement || p.households?.complement || '';
          const microarea = p.microarea || p.households?.microarea || '';
          const contact = p.clinical_data?.contact || '';

          csvRows.push([
            safeString(p.name),
            safeString(p.cns),
            safeString(p.birth_date ? formatDate(p.birth_date) : ''),
            safeString(p.gender || ''),
            safeString(contact),
            safeString(address),
            safeString(number),
            safeString(complement),
            safeString(microarea)
          ]);
        });

      } else if (selectedType === 'diabetes') {
        headers = [
          'Nome do Paciente',
          'CNS',
          'Data de Nascimento',
          'Microárea',
          'Contato',
          'Diabetes (Confirmado)',
          'Avaliação dos Pés',
          'Hemoglobina Glicada',
          'Última Visita ACS - 1',
          'Última Visita ACS - 2',
          'Logradouro',
          'Número',
          'Complemento'
        ];

        filteredData.forEach((p: any) => {
          const dData = getDiabetesData(p);
          const address = p.clinical_data?.address || p.households?.address || '';
          const number = p.clinical_data?.address_number || p.households?.number || '';
          const complement = p.clinical_data?.address_complement || p.households?.complement || '';
          const microarea = p.microarea || p.households?.microarea || '';
          const contact = p.clinical_data?.contact || '';

          csvRows.push([
            safeString(p.name),
            safeString(p.cns),
            safeString(p.birth_date ? formatDate(p.birth_date) : ''),
            safeString(microarea),
            safeString(contact),
            'Sim',
            safeString(dData.avaliacaoPes || 'Não'),
            safeString(dData.hemoglobinaGlicada || 'Não'),
            safeString(dData.visitaAcs1 ? formatDate(dData.visitaAcs1) : ''),
            safeString(dData.visitaAcs2 ? formatDate(dData.visitaAcs2) : ''),
            safeString(address),
            safeString(number),
            safeString(complement)
          ]);
        });

      } else if (selectedType === 'hypertension') {
        headers = [
          'Nome do Paciente',
          'CNS',
          'Data de Nascimento',
          'Microárea',
          'Contato',
          'Hipertensão (Confirmada)',
          'Consultas nos Últimos 6 Meses',
          'Última Visita ACS - 1',
          'Última Visita ACS - 2',
          'Logradouro',
          'Número',
          'Complemento'
        ];

        filteredData.forEach((p: any) => {
          const hData = getHypertensionData(p);
          const address = p.clinical_data?.address || p.households?.address || '';
          const number = p.clinical_data?.address_number || p.households?.number || '';
          const complement = p.clinical_data?.address_complement || p.households?.complement || '';
          const microarea = p.microarea || p.households?.microarea || '';
          const contact = p.clinical_data?.contact || '';

          csvRows.push([
            safeString(p.name),
            safeString(p.cns),
            safeString(p.birth_date ? formatDate(p.birth_date) : ''),
            safeString(microarea),
            safeString(contact),
            'Sim',
            safeString(hData.consultas6Meses || 'Não'),
            safeString(hData.visitaAcs1 ? formatDate(hData.visitaAcs1) : ''),
            safeString(hData.visitaAcs2 ? formatDate(hData.visitaAcs2) : ''),
            safeString(address),
            safeString(number),
            safeString(complement)
          ]);
        });

      } else if (selectedType === 'clinical_all') {
        headers = [
          'Nome do Paciente',
          'CNS',
          'Data de Nascimento',
          'Microárea',
          'Categorias',
          'Contato',
          'Diabetes',
          'Avaliação dos Pés',
          'Hemoglobina Glicada',
          'Hipertensão',
          'Consultas Hipertensão (6 meses)',
          'Asma ou DPOC',
          'Tabagista',
          'Alcoolista',
          'Saúde Mental',
          'Deficiência',
          'Acamado ou Domiciliado',
          'Gestante',
          'Consultas Pré-Natal (Gestante)',
          'Visitas ACS (Gestante)',
          'Criança',
          'Visitas ACS (Criança)',
          'Idoso',
          'Logradouro',
          'Número',
          'Complemento'
        ];

        filteredData.forEach((p: any) => {
          const clinical = p.clinical_data || {};
          const dData = getDiabetesData(p);
          const hData = getHypertensionData(p);

          const isDiabetic = isPatientDiabetic(p) ? 'Sim' : 'Não';
          const isHypertensive = isPatientHypertensive(p) ? 'Sim' : 'Não';
          
          const categories = p.categories || [];
          const isGestante = categories.includes('Gestante') ? 'Sim' : 'Não';
          const isCrianca = categories.includes('Criança') ? 'Sim' : 'Não';
          const isIdoso = categories.includes('Idoso') ? 'Sim' : 'Não';

          const validConsultasGestante = clinical.gestante?.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
          const validVisitasGestante = clinical.gestante?.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
          const validVisitasCrianca = clinical.crianca?.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;

          const address = clinical.address || p.households?.address || '';
          const number = clinical.address_number || p.households?.number || '';
          const complement = clinical.address_complement || p.households?.complement || '';
          const microarea = p.microarea || p.households?.microarea || '';
          const contact = clinical.contact || '';

          csvRows.push([
            safeString(p.name),
            safeString(p.cns),
            safeString(p.birth_date ? formatDate(p.birth_date) : ''),
            safeString(microarea),
            safeString(categories.join(' | ')),
            safeString(contact),
            isDiabetic,
            safeString(dData.avaliacaoPes || 'Não'),
            safeString(dData.hemoglobinaGlicada || 'Não'),
            isHypertensive,
            safeString(hData.consultas6Meses || 'Não'),
            safeString(clinical.chronic?.asmaDpoc || 'Não'),
            safeString(clinical.chronic?.tabagista || 'Não'),
            safeString(clinical.chronic?.alcoolista || 'Não'),
            safeString(clinical.chronic?.saudeMental || 'Não'),
            safeString(clinical.chronic?.deficiencia || 'Não'),
            safeString(clinical.chronic?.acamadoDomiciliado || 'Não'),
            isGestante,
            isGestante === 'Sim' ? String(validConsultasGestante) : 'N/A',
            isGestante === 'Sim' ? String(validVisitasGestante) : 'N/A',
            isCrianca,
            isCrianca === 'Sim' ? String(validVisitasCrianca) : 'N/A',
            isIdoso,
            safeString(address),
            safeString(number),
            safeString(complement)
          ]);
        });
      }

      // Construct CSV file with UTF-8 BOM for correct Excel encoding (Portuguese accents)
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `gestao_acs_exportacao_${selectedType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Export error:', err);
      toastError('Erro ao exportar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const options = [
    {
      id: 'basic' as ExportType,
      title: 'Cadastro Básico',
      description: 'Dados pessoais, telefone e endereço de todos os pacientes.',
      icon: Users,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 border-teal-100 dark:border-teal-900/30',
      activeColor: 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/50'
    },
    {
      id: 'diabetes' as ExportType,
      title: 'Pacientes com Diabetes',
      description: 'Filtrar diabéticos com dados de hemoglobina, avaliação dos pés e visitas ACS.',
      icon: Activity,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
      activeColor: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50'
    },
    {
      id: 'hypertension' as ExportType,
      title: 'Pacientes com Hipertensão',
      description: 'Filtrar hipertensos com consultas dos últimos 6 meses e acompanhamento ACS.',
      icon: Heart,
      color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-red-100 dark:border-red-900/30',
      activeColor: 'ring-2 ring-red-500 border-red-500 bg-red-50/50'
    },
    {
      id: 'clinical_all' as ExportType,
      title: 'Relatório Clínico Geral',
      description: 'Dados completos e unificados de todos os cidadãos (Crônicos, Gestantes, Crianças, Idosos).',
      icon: FileSpreadsheet,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
      activeColor: 'ring-2 ring-purple-500 border-purple-500 bg-purple-50/50'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Exportação de Dados
          </h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            Selecione um filtro ou relatório estruturado abaixo para fazer o download em CSV para o Excel.
          </p>
        </header>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = selectedType === option.id;
          return (
            <div
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                isActive 
                  ? `${option.activeColor} border-slate-400 dark:border-slate-500` 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${option.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase leading-snug">
                  {option.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {option.description}
                </p>
                {fetchingCounts ? (
                  <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-1" />
                ) : counts !== null ? (
                  <span className="inline-block text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 mt-1">
                    {counts[option.id]} {counts[option.id] === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4">
        <div className="max-w-md">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-300">
            Você está exportando: <span className="text-teal-600 dark:text-teal-400 uppercase font-black">{options.find(o => o.id === selectedType)?.title}</span>
          </p>
          {fetchingCounts ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 animate-pulse font-bold uppercase">
              Carregando contagem de pacientes...
            </p>
          ) : counts !== null ? (
            <p className="text-sm font-black text-slate-900 dark:text-white mt-1.5 uppercase">
              {counts[selectedType]} {counts[selectedType] === 1 ? 'paciente será incluído' : 'pacientes serão incluídos'} no arquivo
            </p>
          ) : null}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            O arquivo gerado incluirá uma marca de codificação (BOM) para garantir que caracteres especiais (como acentos e cedilhas) apareçam perfeitamente formatados no Microsoft Excel.
          </p>
        </div>

        <button
          onClick={exportData}
          disabled={loading}
          className="px-8 py-3.5 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando Relatório...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Exportar para Planilha
            </>
          )}
        </button>

        {exportCount > 0 && !loading && (
          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 rounded-lg inline-block mt-2">
            Sucesso! Exportação de {exportCount} paciente(s) concluída com sucesso!
          </p>
        )}
      </div>
    </div>
  );
}
