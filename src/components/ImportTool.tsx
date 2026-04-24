import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Database,
  Info,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImportTool({ user }: { user: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<{ success: number, error: number, messages: string[] } | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setResults(null);

    const normalizeSimNao = (val: any) => {
      if (!val) return 'Não';
      const s = String(val).toLowerCase().trim();
      if (s === 'sim' || s === 's' || s === 'true' || s === '1') return 'Sim';
      return 'Não';
    };

    const getColumnValue = (row: any, variations: string[]) => {
      const keys = Object.keys(row);
      for (const variation of variations) {
        const foundKey = keys.find(k => k.toLowerCase().trim() === variation.toLowerCase().trim());
        if (foundKey !== undefined) return row[foundKey];
      }
      return null;
    };

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let errorCount = 0;
        const messages: string[] = [];

        for (const row of rows) {
          try {
            const cns = getColumnValue(row, ['Cns', 'CNS', 'C.N.S.']);
            const name = getColumnValue(row, ['Nome do Paciente', 'Nome', 'Paciente', 'nome']);
            if (!cns || !name) continue;

            const respCns = getColumnValue(row, ['RespFamiliar_CNS', 'CNS Responsável', 'CNS Responsavel', 'cns_responsavel', 'Responsável CNS']) || cns;
            const address = getColumnValue(row, ['Endereço', 'Endereco', 'Logradouro', 'Rua']) || 'Endereço não informado';
            const number = getColumnValue(row, ['NumeroCasa', 'Número', 'Numero', 'Nº', 'N', 'nº']) || '';
            const complement = getColumnValue(row, ['Complemento', 'Apto', 'Casa']) || '';
            const isResp = normalizeSimNao(getColumnValue(row, ['RespFamiliar?', 'Responsável?', 'Responsavel?', 'É Responsável?', 'Responsavel Familiar'])) === 'Sim';

            // 1. Handle Household
            let householdId = null;
            const { data: existingH } = await supabase
              .from('households')
              .select('id, responsible_name')
              .eq('responsible_cns', respCns)
              .maybeSingle();

            if (existingH) {
              householdId = existingH.id;
              // Update household info if this is the responsible or if it was a placeholder
              const updates: any = {};
              if (isResp) updates.responsible_name = name;
              if (address && address !== 'Endereço não informado') updates.address = address;
              if (number) updates.number = number;
              if (complement) updates.complement = complement;

              if (Object.keys(updates).length > 0) {
                await supabase.from('households').update(updates).eq('id', householdId);
              }
            } else {
              // Create household even if not responsible, using current row's address info
              const { data: newH, error: hError } = await supabase
                .from('households')
                .insert([{
                  address,
                  number,
                  complement,
                  microarea: user.microarea || '000',
                  area_color: user.color || '#00488d',
                  agent_id: user.id,
                  responsible_cns: respCns,
                  responsible_name: isResp ? name : 'Responsável não cadastrado'
                }])
                .select()
                .single();
              
              if (hError) throw hError;
              householdId = newH.id;
            }

            // 2. Map Categories
            const rawCat = getColumnValue(row, ['Categoria', 'Categorias', 'categoria']) || '';
            const categories = [];
            if (rawCat.includes('Gestante')) categories.push('Gestante');
            if (rawCat.includes('Criança')) categories.push('Criança');
            if (rawCat.includes('Acamado')) categories.push('AcamadoDomiciliado');
            if (rawCat.includes('Adulto')) categories.push('Adulto');
            if (rawCat.includes('Saúde Mental') || rawCat.includes('Saude Mental')) categories.push('SaudeMental');
            
            const idade = parseInt(getColumnValue(row, ['Idade', 'idade']) || '0');
            if (idade >= 60) categories.push('Idoso');
            
            // 3. Map Clinical Data
            const hasDiabetes = normalizeSimNao(getColumnValue(row, ['Tem Diabete?', 'Diabetes', 'Diabético', 'Diabetico']));
            const hasHipertensao = normalizeSimNao(getColumnValue(row, ['Tem Hipertensão?', 'Tem Pressão Alta?', 'Hipertensão', 'Hipertensao', 'Pressão Alta', 'Pressao Alta']));
            const hasConsultas6m = normalizeSimNao(getColumnValue(row, ['Consultas nos últimos 6 meses', 'Consultas 6 Meses', 'Consultas6Meses']));

            const dum = formatDate(getColumnValue(row, ['DUM', 'dum']));
            let dpp = formatDate(getColumnValue(row, ['DPP', 'dpp']));

            if (dum && !dpp && categories.includes('Gestante')) {
              const parts = dum.split('-');
              if (parts.length === 3) {
                const dumDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                if (!isNaN(dumDate.getTime())) {
                  const dppDate = new Date(dumDate);
                  dppDate.setDate(dppDate.getDate() + 7);
                  dppDate.setMonth(dppDate.getMonth() + 9);
                  const y = dppDate.getFullYear();
                  const m = String(dppDate.getMonth() + 1).padStart(2, '0');
                  const d = String(dppDate.getDate()).padStart(2, '0');
                  dpp = `${y}-${m}-${d}`;
                }
              }
            }

            const socialBenefits = [];
            const rawBenefits = getColumnValue(row, ['Benefícios Sociais', 'Benefícios', 'Beneficios']) || '';
            if (rawBenefits) {
              if (rawBenefits.includes('Bolsa Família') || rawBenefits.includes('Bolsa Familia')) socialBenefits.push('Bolsa Família');
              if (rawBenefits.includes('LOAS')) socialBenefits.push('LOAS');
              if (rawBenefits.includes('BPC')) socialBenefits.push('BPC');
            } else {
              if (normalizeSimNao(getColumnValue(row, ['Bolsa Família', 'Bolsa Familia'])) === 'Sim') socialBenefits.push('Bolsa Família');
              if (normalizeSimNao(getColumnValue(row, ['LOAS'])) === 'Sim') socialBenefits.push('LOAS');
              if (normalizeSimNao(getColumnValue(row, ['BPC'])) === 'Sim') socialBenefits.push('BPC');
            }

            const clinicalData: any = {
              visitasGerais: [] as { date: string, summary: string }[],
              socialBenefits,
              saudeMental: {
                notes: getColumnValue(row, ['Saúde Mental Notas', 'Saude Mental Notas', 'Notas Saúde Mental']) || ''
              },
              chronic: {
                diabetes: hasDiabetes,
                hipertensao: hasHipertensao,
                diabetesData: { avaliacaoPes: 'Não', hemoglobinaGlicada: 'Não', visitaAcs1: '', visitaAcs2: '' },
                hipertensaoData: { consultas6Meses: hasConsultas6m, visitaAcs1: '', visitaAcs2: '' }
              },
              gestante: {
                dum,
                dpp,
                consultas: [
                  formatDate(getColumnValue(row, ['1 Consulta'])),
                  formatDate(getColumnValue(row, ['2 Consulta'])),
                  formatDate(getColumnValue(row, ['3 Consulta'])),
                  formatDate(getColumnValue(row, ['4 Consulta'])),
                  formatDate(getColumnValue(row, ['5 Consulta'])),
                  formatDate(getColumnValue(row, ['6 Consulta'])),
                  formatDate(getColumnValue(row, ['7 Consulta'])),
                  formatDate(getColumnValue(row, ['8 Consulta'])),
                  formatDate(getColumnValue(row, ['9 Consulta']))
                ].filter(d => d),
                hiv: getColumnValue(row, ['HIV', 'hiv']) || 'NÃO REALIZADO',
                hepatiteB: getColumnValue(row, ['Hepatite B', 'HepatiteB']) || 'NÃO REALIZADO',
                hepatiteC: getColumnValue(row, ['Hepatite C', 'HepatiteC']) || 'NÃO REALIZADO',
                sifilis: getColumnValue(row, ['Sifilis', 'Sífilis']) || 'NÃO REALIZADO',
                dtpa: normalizeSimNao(getColumnValue(row, ['dTpa', 'dtpa'])),
                diabetes: hasDiabetes,
                hipertensao: hasHipertensao,
                hipertensaoData: { consultas6Meses: hasConsultas6m, visitaAcs1: '', visitaAcs2: '' }
              },
              crianca: {
                visita30dias: formatDate(getColumnValue(row, ['Visita30dias', 'Visita 30 dias'])),
                visita6meses: formatDate(getColumnValue(row, ['Visita6Meses', 'Visita 6 meses'])),
                vacinas: {
                  bcg: normalizeSimNao(getColumnValue(row, ['BCG', 'bcg'])),
                  penta1: normalizeSimNao(getColumnValue(row, ['Penta1', 'Penta 1'])),
                  penta2: normalizeSimNao(getColumnValue(row, ['Penta2', 'Penta 2'])),
                  penta3: normalizeSimNao(getColumnValue(row, ['Penta3', 'Penta 3'])),
                  vip1: normalizeSimNao(getColumnValue(row, ['VIP1', 'VIP 1'])),
                  vip2: normalizeSimNao(getColumnValue(row, ['VIP2', 'VIP 2'])),
                  vip3: normalizeSimNao(getColumnValue(row, ['VIP3', 'VIP 3'])),
                  // Legacy mapping
                  penta2m: formatDate(getColumnValue(row, ['Penta2Meses'])),
                  penta4m: formatDate(getColumnValue(row, ['Penta4Meses'])),
                  penta6m: formatDate(getColumnValue(row, ['Penta6Meses'])),
                  vip2m: formatDate(getColumnValue(row, ['VIP2meses'])),
                  vip4m: formatDate(getColumnValue(row, ['VIP4meses'])),
                  vip6m: formatDate(getColumnValue(row, ['VIP6meses']))
                }
              },
              acamadodomiciliado: {
                dependencia: getColumnValue(row, ['Grau de Dependência', 'Dependência', 'Dependencia']) || 'Parcial',
                curativos: normalizeSimNao(getColumnValue(row, ['CurativosdeFeridasAbertas', 'Curativos'])),
                cuidador: normalizeSimNao(getColumnValue(row, ['Cuidador Presente', 'Cuidador'])),
                diabetes: hasDiabetes,
                hipertensao: hasHipertensao,
                hipertensaoData: { consultas6Meses: hasConsultas6m, visitaAcs1: '', visitaAcs2: '' }
              },
              adulto: {
                diabetes: hasDiabetes,
                hipertensao: hasHipertensao,
                hipertensaoData: { consultas6Meses: hasConsultas6m, visitaAcs1: '', visitaAcs2: '' },
                notes: getColumnValue(row, ['Observações', 'Notas', 'Observacoes']) || ''
              },
              idoso: {
                diabetes: hasDiabetes,
                hipertensao: hasHipertensao,
                hipertensaoData: { consultas6Meses: hasConsultas6m, visitaAcs1: '', visitaAcs2: '' },
                vacinaInfluenza: normalizeSimNao(getColumnValue(row, ['Vacina Influenza', 'Influenza']))
              }
            };

            // 4. Map clinical fields not in main table
            const finalClinicalData = {
              ...clinicalData,
              contact: getColumnValue(row, ['Contato', 'Telefone']) || '',
              message_contact: getColumnValue(row, ['Recado']) || '',
              responsible_cns: respCns
            };

            // 5. Insert Patient
            const { error: pError } = await supabase
              .from('patients')
              .insert([{
                name,
                cns,
                is_family_responsible: isResp,
                birth_date: formatDate(getColumnValue(row, ['DN', 'Data de Nascimento', 'Nascimento'])),
                gender: getColumnValue(row, ['Gênero', 'Genero', 'Sexo']) || 'Feminino',
                household_id: householdId,
                categories,
                microarea: user.microarea || '000',
                area_color: user.color || '#00488d',
                agent_id: user.id,
                last_visit_at: formatDate(getColumnValue(row, ['Data da Visita', 'Visita'])) || new Date().toISOString(),
                clinical_data: finalClinicalData
              }]);

            if (pError) throw pError;
            successCount++;
          } catch (err: any) {
            errorCount++;
            messages.push(`Erro no paciente ${getColumnValue(row, ['Nome do Paciente', 'Nome']) || 'Desconhecido'}: ${err.message}`);
          }
        }

        setResults({ success: successCount, error: errorCount, messages });
        setLoading(false);
      }
    });
  };

  const downloadExample = () => {
    const headers = [
      'Nome do Paciente', 'Cns', 'RespFamiliar?', 'RespFamiliar_CNS', 'Endereço', 'NumeroCasa', 'Complemento',
      'DN', 'Gênero', 'Categoria', 'Idade', 'Tem Diabete?', 'Tem Hipertensão?', 'Consultas nos últimos 6 meses',
      'Benefícios Sociais', 'Contato', 'Recado', 'Data da Visita', 'DUM', 'DPP', '1 Consulta', '2 Consulta',
      '3 Consulta', '4 Consulta', '5 Consulta', '6 Consulta', '7 Consulta', '8 Consulta', '9 Consulta',
      'HIV', 'Hepatite B', 'Hepatite C', 'Sifilis', 'dTpa', 'Visita30dias', 'Visita6Meses', 'BCG', 'Penta1',
      'Penta2', 'Penta3', 'VIP1', 'VIP2', 'VIP3', 'Grau de Dependência', 'CurativosdeFeridasAbertas',
      'Cuidador Presente', 'Observações', 'Saúde Mental Notas'
    ];
    
    const exampleRow = [
      'João da Silva', '123456789012345', 'Sim', '123456789012345', 'Rua das Flores', '123', 'Apto 1',
      '15/05/1980', 'Masculino', 'Adulto', '43', 'Não', 'Sim', 'Sim', 'Bolsa Família', '(11) 99999-9999',
      'Falar com Maria', '09/04/2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', 'Paciente estável', ''
    ];

    const csvContent = [headers, exampleRow].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_acs.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-500" />
            </button>
            <div>
              <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Importação de Dados</h2>
              <p className="text-slate-500 mt-1 font-medium">Migre sua base de dados atual para o novo sistema.</p>
            </div>
          </div>
          <button 
            onClick={downloadExample}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-primary border-2 border-primary/10 hover:border-primary/30 rounded-2xl font-bold text-sm transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </button>
        </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-6 rounded-2xl flex gap-4">
        <Info className="w-6 h-6 text-blue-600 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
          <p className="font-bold">Instruções de Importação:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Utilize o botão <strong>"Baixar Modelo CSV"</strong> para obter uma planilha exemplo.</li>
            <li>O sistema aceita campos em branco; preencha apenas o que for necessário.</li>
            <li>O sistema identificará automaticamente os domicílios pelo CNS do Responsável Familiar.</li>
            <li>Datas devem estar no formato DD/MM/YYYY.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Conteúdo CSV
          </label>
          <textarea 
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Cole aqui o conteúdo CSV da sua planilha..."
            className="w-full h-80 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-xs font-mono focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </div>

        {results && (
          <div className={`p-6 rounded-2xl space-y-4 ${results.error === 0 ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-orange-50 text-orange-800 border border-orange-100'}`}>
            <div className="flex items-center gap-3">
              {results.error === 0 ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-orange-600" />}
              <h4 className="font-bold">Importação Concluída</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/50 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold opacity-60">Sucesso</p>
                <p className="text-2xl font-black">{results.success}</p>
              </div>
              <div className="bg-white/50 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold opacity-60">Erros</p>
                <p className="text-2xl font-black">{results.error}</p>
              </div>
            </div>
            {results.messages.length > 0 && (
              <div className="mt-4 p-4 bg-white/50 rounded-xl max-h-40 overflow-y-auto text-xs font-mono">
                {results.messages.map((m, i) => <p key={i} className="py-1 border-b border-black/5 last:border-0">{m}</p>)}
              </div>
            )}
          </div>
        )}

        <button 
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Processando Importação...
            </>
          ) : (
            <>
              <FileUp className="w-6 h-6" />
              Iniciar Importação
            </>
          )}
        </button>
      </div>
    </div>
  );
}
