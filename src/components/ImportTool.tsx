import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import {
  FileUp, CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  Download, Table, X, ChevronRight, FileText, RefreshCw, Info, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'done';

export function ImportTool({ user }: { user: any }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; error: number; messages: string[] } | null>(null);

  // Required and optional field definitions
  const FIELDS = [
    { key: 'nome', label: 'Nome do Paciente', required: true },
    { key: 'cns', label: 'CNS / SUS', required: true },
    { key: 'dn', label: 'Data de Nascimento (DD/MM/AAAA)', required: false },
    { key: 'genero', label: 'Gênero', required: false },
    { key: 'responsavel', label: 'É Responsável Familiar? (Sim/Não)', required: false },
    { key: 'cns_responsavel', label: 'CNS do Responsável', required: false },
    { key: 'endereco', label: 'Endereço / Logradouro', required: false },
    { key: 'numero', label: 'Número da Casa', required: false },
    { key: 'complemento', label: 'Complemento', required: false },
    { key: 'categoria', label: 'Categoria (Adulto, Idoso, Criança...)', required: false },
    { key: 'diabetes', label: 'Tem Diabetes? (Sim/Não)', required: false },
    { key: 'hipertensao', label: 'Tem Hipertensão? (Sim/Não)', required: false },
    { key: 'contato', label: 'Telefone / Contato', required: false },
    { key: 'data_visita', label: 'Data da Última Visita', required: false },
    { key: 'beneficios', label: 'Benefícios Sociais', required: false },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return null;
    const cleaned = dateStr.trim();
    // try DD/MM/YYYY
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // try YYYY-MM-DD already
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    return null;
  };

  const normalizeSimNao = (val: any) => {
    if (!val) return 'Não';
    const s = String(val).toLowerCase().trim();
    return (s === 'sim' || s === 's' || s === 'true' || s === '1' || s === 'yes') ? 'Sim' : 'Não';
  };

  const getVal = (row: any, key: string) => {
    const mapped = columnMap[key];
    if (!mapped || mapped === '__none__') return '';
    return row[mapped] ?? '';
  };

  // Auto-detect column mapping from CSV headers
  const autoDetect = (hdrs: string[]) => {
    const map: Record<string, string> = {};
    const lower = hdrs.map(h => h.toLowerCase().trim());

    const matchers: Record<string, string[]> = {
      nome: ['nome do paciente', 'nome', 'paciente', 'nome completo'],
      cns: ['cns', 'sus', 'c.n.s.', 'cartão sus', 'cartao sus'],
      dn: ['dn', 'data de nascimento', 'nascimento', 'data nascimento', 'dt nascimento'],
      genero: ['gênero', 'genero', 'sexo'],
      responsavel: ['respfamiliar?', 'responsável?', 'responsavel?', 'é responsável?', 'responsavel familiar', 'resp familiar'],
      cns_responsavel: ['respfamiliar_cns', 'cns responsável', 'cns responsavel', 'cns do responsável', 'cns_responsavel'],
      endereco: ['endereço', 'endereco', 'logradouro', 'rua', 'endereço/logradouro'],
      numero: ['numerocasa', 'número', 'numero', 'nº', 'num', 'n°'],
      complemento: ['complemento', 'apto', 'casa', 'bloco'],
      categoria: ['categoria', 'categorias', 'grupo'],
      diabetes: ['tem diabete?', 'diabetes', 'diabético', 'diabetico', 'tem diabetes?'],
      hipertensao: ['tem hipertensão?', 'tem pressão alta?', 'hipertensão', 'hipertensao', 'pressão alta', 'pressao alta', 'ha'],
      contato: ['contato', 'telefone', 'fone', 'celular', 'tel'],
      data_visita: ['data da visita', 'visita', 'última visita', 'ultima visita'],
      beneficios: ['benefícios sociais', 'benefícios', 'beneficios', 'beneficio'],
    };

    for (const [field, variants] of Object.entries(matchers)) {
      for (const variant of variants) {
        const idx = lower.indexOf(variant);
        if (idx !== -1) { map[field] = hdrs[idx]; break; }
      }
    }
    return map;
  };

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hdrs = result.meta.fields || [];
        const rows = result.data as any[];
        setHeaders(hdrs);
        setParsedData(rows);
        setColumnMap(autoDetect(hdrs));
        setStep('preview');
      },
      error: (err) => alert('Erro ao ler arquivo: ' + err.message),
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) parseFile(file);
    else alert('Por favor, use um arquivo .csv');
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        const cns = String(getVal(row, 'cns')).trim().replace(/\D/g, '');
        const name = String(getVal(row, 'nome')).trim().toUpperCase();
        if (!cns || !name) { errorCount++; messages.push(`Linha ${i + 2}: CNS ou Nome ausente.`); continue; }

        const isResp = normalizeSimNao(getVal(row, 'responsavel')) === 'Sim';
        const rawRespCns = String(getVal(row, 'cns_responsavel')).trim().replace(/\D/g, '');
        const respCns = rawRespCns || (isResp ? cns : ''); // Só usa CNS próprio como respCns se for responsável
        const address = String(getVal(row, 'endereco')).trim(); // Sem fallback — endereço vazio impede criação de domicílio
        const number = String(getVal(row, 'numero')).trim();
        const complement = String(getVal(row, 'complemento')).trim();

        // Household — só cria domicílio se o paciente for o responsável familiar
        let householdId: string | null = null;
        const { data: existingH } = await supabase.from('households')
          .select('id').eq('responsible_cns', respCns).maybeSingle();

        if (existingH) {
          // Domicílio já existe — vincula e atualiza se for o responsável
          householdId = existingH.id;
          if (isResp) {
            await supabase.from('households')
              .update({ responsible_name: name, address, number, complement })
              .eq('id', householdId);
          }
        } else if (isResp && address) {
          // Só cria o domicílio se este paciente for o responsável E tiver endereço
          const { data: newH, error: hErr } = await supabase.from('households').insert([{
            address, number, complement,
            microarea: user.microarea || '000',
            area_color: user.color || '#00488d',
            agent_id: user.id,
            responsible_cns: respCns,
            responsible_name: name,
          }]).select().single();
          if (hErr) throw hErr;
          householdId = newH.id;
        }
        // Se não for responsável e não existe domicílio, householdId permanece null

        // Categories — categorização automática por idade + campo categoria
        const rawCat = String(getVal(row, 'categoria')).toLowerCase();
        const dn = formatDate(String(getVal(row, 'dn')));

        // Calcular idade em anos e meses a partir da data de nascimento
        let ageInYears = 0;
        let ageInMonths = 0;
        if (dn) {
          const birthDate = new Date(dn + 'T00:00:00');
          const now = new Date();
          ageInYears = now.getFullYear() - birthDate.getFullYear();
          ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
          // Ajuste se ainda não fez o aniversário esse mês
          if (now.getDate() < birthDate.getDate()) ageInMonths--;
          if (ageInMonths < 0) ageInMonths = 0;
          ageInYears = Math.floor(ageInMonths / 12);
        }

        const categories: string[] = [];

        // Categorias manuais (do campo categoria do CSV)
        if (rawCat.includes('gestante')) categories.push('Gestante');
        if (rawCat.includes('acamado')) categories.push('AcamadoDomiciliado');
        if (rawCat.includes('saúde mental') || rawCat.includes('saude mental')) categories.push('SaudeMental');

        // Categorização automática por idade (mesma regra do PatientForm)
        if (dn) {
          if (ageInMonths <= 24) {
            // Criança com até 24 meses
            if (!categories.includes('Criança')) categories.push('Criança');
          } else if (ageInYears >= 60) {
            // Idoso com 60 anos ou mais
            if (!categories.includes('Idoso')) categories.push('Idoso');
          } else {
            // Adulto entre 24 meses e 60 anos
            if (!categories.includes('Adulto')) categories.push('Adulto');
          }
        } else {
          // Sem data de nascimento: respeita o campo categoria do CSV
          if (rawCat.includes('criança') || rawCat.includes('crianca')) categories.push('Criança');
          else if (rawCat.includes('idoso')) categories.push('Idoso');
          else if (rawCat.includes('adulto')) categories.push('Adulto');
          else categories.push('Adulto'); // fallback
        }

        const hasDiabetes = normalizeSimNao(getVal(row, 'diabetes'));
        const hasHipertensao = normalizeSimNao(getVal(row, 'hipertensao'));
        const rawBenefits = String(getVal(row, 'beneficios'));
        const socialBenefits: string[] = [];
        if (rawBenefits.toLowerCase().includes('bolsa')) socialBenefits.push('Bolsa Família');
        if (rawBenefits.toLowerCase().includes('bpc')) socialBenefits.push('BPC');
        if (rawBenefits.toLowerCase().includes('loas')) socialBenefits.push('LOAS');

        const clinical_data = {
          contact: String(getVal(row, 'contato')).trim(),
          responsible_cns: respCns,
          socialBenefits,
          chronic: { diabetes: hasDiabetes, hipertensao: hasHipertensao },
          adulto: { diabetes: hasDiabetes, hipertensao: hasHipertensao },
          idoso: { diabetes: hasDiabetes, hipertensao: hasHipertensao },
        };

        const { error: pErr } = await supabase.from('patients').insert([{
          name, cns,
          is_family_responsible: isResp,
          birth_date: dn,
          gender: String(getVal(row, 'genero')).trim() || null,
          household_id: householdId,
          categories,
          microarea: user.microarea || '000',
          area_color: user.color || '#00488d',
          agent_id: user.id,
          last_visit_at: formatDate(String(getVal(row, 'data_visita'))) || new Date().toISOString(),
          clinical_data,
        }]);

        if (pErr) throw pErr;
        successCount++;
      } catch (err: any) {
        errorCount++;
        messages.push(`Linha ${i + 2} (${String(getVal(row, 'nome') || '?')}): ${err.message}`);
      }
      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setResults({ success: successCount, error: errorCount, messages });
    setStep('done');
  };

  const downloadTemplate = () => {
    const headers = ['Nome do Paciente', 'CNS', 'É Responsável Familiar? (Sim/Não)', 'CNS do Responsável', 'Endereço', 'Número', 'Complemento', 'Data de Nascimento', 'Gênero', 'Categoria', 'Tem Diabetes?', 'Tem Hipertensão?', 'Telefone / Contato', 'Data da Última Visita', 'Benefícios Sociais'];
    const example = ['MARIA DA SILVA', '706123456789000', 'Sim', '706123456789000', 'RUA DAS FLORES', '123', 'CASA', '15/05/1980', 'Feminino', 'Adulto', 'Não', 'Sim', '(11) 99999-9999', '09/04/2026', 'Bolsa Família'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo_importacao_acs.csv';
    a.click();
  };

  const reset = () => { setStep('upload'); setParsedData([]); setHeaders([]); setColumnMap({}); setResults(null); setProgress(0); };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Importação de Dados</h2>
            <p className="text-sm text-slate-500 mt-0.5">Importe pacientes a partir de uma planilha CSV</p>
          </div>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl font-semibold text-sm text-teal-600 hover:bg-teal-50 transition-all shadow-sm">
          <Download className="w-4 h-4" /> Baixar Modelo
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(['upload', 'preview', 'importing', 'done'] as ImportStep[]).map((s, i) => {
          const labels = ['Upload', 'Pré-visualização', 'Importando', 'Concluído'];
          const active = step === s;
          const past = ['upload', 'preview', 'importing', 'done'].indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${active ? 'bg-teal-600 text-white' : past ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {past ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50'}`}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragging ? 'bg-teal-500' : 'bg-slate-100'}`}>
                <FileUp className={`w-10 h-10 ${isDragging ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">Arraste o arquivo CSV aqui</p>
                <p className="text-sm text-slate-500 mt-1">ou clique para selecionar o arquivo</p>
              </div>
              <span className="px-4 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-xl">Selecionar Arquivo</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-bold">Dicas rápidas:</p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs">
                <li>Baixe o <strong>modelo CSV</strong> para ver o formato esperado</li>
                <li>As colunas serão detectadas automaticamente — você pode ajustá-las antes de importar</li>
                <li>Datas devem estar no formato <strong>DD/MM/AAAA</strong></li>
                <li>CNS deve conter apenas números (15 dígitos)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview & Mapping */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800 text-sm">{parsedData.length} registros encontrados</p>
                <p className="text-xs text-emerald-600">{headers.length} colunas detectadas</p>
              </div>
            </div>
            <button onClick={reset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column Mapping */}
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <Table className="w-4 h-4 text-teal-600" /> Mapeamento de Colunas
            </h3>
            <p className="text-xs text-slate-500">Verifique se cada campo do sistema foi vinculado à coluna correta da sua planilha.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <p className="text-xs font-semibold text-slate-600 leading-tight">{field.label}</p>
                    {field.required && <span className="text-[10px] text-red-500 font-bold">Obrigatório</span>}
                  </div>
                  <select
                    value={columnMap[field.key] || '__none__'}
                    onChange={(e) => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={`flex-1 text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${columnMap[field.key] && columnMap[field.key] !== '__none__' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
                  >
                    <option value="__none__">— Não mapear —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-sm text-text-primary">Primeiras 5 linhas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>{headers.slice(0, 8).map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {headers.slice(0, 8).map(h => <td key={h} className="px-4 py-2 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{row[h] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 border border-border rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Trocar Arquivo
            </button>
            <button onClick={handleImport} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-600/20">
              <FileUp className="w-4 h-4" /> Iniciar Importação ({parsedData.length} registros)
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="bg-white border border-border rounded-3xl p-12 flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">Importando registros...</p>
            <p className="text-sm text-slate-500 mt-1">{Math.round(progress * parsedData.length / 100)} de {parsedData.length} processados</p>
          </div>
          <div className="w-full max-w-md">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-right text-xs text-slate-400 mt-1 font-semibold">{progress}%</p>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && results && (
        <div className="space-y-4">
          <div className={`rounded-3xl p-8 border ${results.error === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-4 mb-6">
              {results.error === 0
                ? <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                : <AlertCircle className="w-10 h-10 text-orange-600" />}
              <div>
                <h3 className="text-xl font-bold">{results.error === 0 ? 'Importação concluída com sucesso!' : 'Importação concluída com alguns erros'}</h3>
                <p className="text-sm opacity-70 mt-0.5">{parsedData.length} registros processados</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Importados</p>
                <p className="text-4xl font-black text-emerald-700">{results.success}</p>
              </div>
              <div className="bg-white/60 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Erros</p>
                <p className="text-4xl font-black text-red-600">{results.error}</p>
              </div>
            </div>
          </div>

          {results.messages.length > 0 && (
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold uppercase text-slate-500">Log de erros</p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {results.messages.map((m, i) => (
                  <div key={i} className="px-5 py-2.5 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-mono">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 border border-border rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Nova Importação
            </button>
            <button onClick={() => navigate('/pacientes')} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20">
              Ver Pacientes Importados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
