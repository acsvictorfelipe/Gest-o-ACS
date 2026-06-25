import React, { useState } from 'react';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { Download, FileText, Loader2, Users } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

export function ExportTool({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  const exportData = async () => {
    setLoading(true);
    try {
      const data = await fetchTableWithFilters<any>('patients', user, {
        select: '*, households(address, number, complement, microarea)'
      });

      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado para exportação.');
        return;
      }

      setExportCount(data.length);

      const headers = [
        'Nome do Paciente',
        'CNS',
        'Data de Nascimento',
        'Endereço',
        'Número',
        'Complemento',
        'Bairro / Microárea'
      ];

      const csvRows = [headers.join(',')];

      data.forEach((p: any) => {
        // Find best address source (prefer clinical_data, fallback to household, then fallback to empty)
        const address = p.clinical_data?.address || p.households?.address || '';
        const number = p.clinical_data?.address_number || p.households?.number || '';
        const complement = p.clinical_data?.address_complement || p.households?.complement || '';
        const microarea = p.microarea || p.households?.microarea || '';
        
        // Ensure strings don't break CSV formatting by enclosing them in quotes if they contain commas
        const safeString = (str: string) => {
          if (!str) return '';
          const cleaned = String(str).replace(/"/g, '""'); // Escape quotes
          if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
            return `"${cleaned}"`;
          }
          return cleaned;
        };

        const row = [
          safeString(p.name),
          safeString(p.cns),
          safeString(p.birth_date ? formatDate(p.birth_date) : ''),
          safeString(address),
          safeString(number),
          safeString(complement),
          safeString(microarea)
        ];

        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `pacientes_exportacao_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Export erro:', err);
      alert('Erro ao exportar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Exportação de Dados
          </h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            Baixe uma planilha CSV contendo apenas dados pessoais e de endereço.
          </p>
        </header>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-teal-600 dark:text-teal-400" />
        </div>
        
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">Exportar Pacientes Ativos</h3>
          <p className="text-sm text-text-secondary dark:text-text-muted">
            Um arquivo compatível com Excel será gerado contendo os seguintes campos: Nome, CNS, Data de Nascimento, Endereço, Número, Complemento e Microárea.
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
              Gerando Arquivo...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Baixar Planilha CSV
            </>
          )}
        </button>

        {exportCount > 0 && !loading && (
          <p className="text-sm font-semibold text-emerald-600 mt-4 bg-emerald-50 px-4 py-2 rounded-lg inline-block">
            Exportação de {exportCount} paciente(s) concluída com sucesso!
          </p>
        )}
      </div>
    </div>
  );
}
