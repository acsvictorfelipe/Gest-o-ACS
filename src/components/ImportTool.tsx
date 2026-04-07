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
  Info
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
            const cns = row['Cns'] || row['cns'];
            const name = row['Nome do Paciente'] || row['nome'];
            if (!cns || !name) continue;

            const respCns = row['RespFamiliar_CNS'] || cns;
            const address = row['Endereço'] || 'Endereço não informado';
            const number = row['NumeroCasa'] || '';
            const complement = row['Complemento'] || '';
            const isResp = row['RespFamiliar?'] === 'Sim';

            // 1. Handle Household
            let householdId = null;
            const { data: existingH } = await supabase
              .from('households')
              .select('id')
              .eq('responsible_cns', respCns)
              .maybeSingle();

            if (existingH) {
              householdId = existingH.id;
              // If this row is the responsible, update the name (in case it was a placeholder)
              if (isResp) {
                await supabase.from('households').update({ responsible_name: name }).eq('id', householdId);
              }
            } else {
              // If not responsible and household doesn't exist, don't create it automatically
              if (isResp) {
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
                    responsible_name: name
                  }])
                  .select()
                  .single();
                
                if (hError) throw hError;
                householdId = newH.id;
              } else {
                // Patient without household (responsible not found)
                householdId = null;
              }
            }

            // 2. Map Categories
            const rawCat = row['Categoria'] || '';
            const categories = [];
            if (rawCat.includes('Gestante')) categories.push('Gestante');
            if (rawCat.includes('Criança')) categories.push('Criança');
            if (rawCat.includes('Acamado')) categories.push('AcamadoDomiciliado');
            if (rawCat.includes('Adulto')) categories.push('Adulto');
            if (row['Idade'] && parseInt(row['Idade']) >= 60) categories.push('Idoso');
            
            // 3. Map Clinical Data
            const clinicalData: any = {
              chronic: {
                diabetes: row['Tem Diabete?'] || 'Não',
                hipertensao: row['Tem Hipertensão?'] || row['Tem Pressão Alta?'] || 'Não',
                diabetesData: { avaliacaoPes: 'Não', hemoglobinaGlicada: 'Não', visitaAcs1: '', visitaAcs2: '' },
                hipertensaoData: { avaliacaoPes: 'Não', visitaAcs1: '', visitaAcs2: '' }
              },
              gestante: {
                dum: formatDate(row['DUM']),
                dpp: formatDate(row['DPP']),
                consultas: [
                  formatDate(row['1 Consulta']),
                  formatDate(row['2 Consulta']),
                  formatDate(row['3 Consulta']),
                  formatDate(row['4 Consulta']),
                  formatDate(row['5 Consulta']),
                  formatDate(row['6 Consulta']),
                  formatDate(row['7 Consulta']),
                  formatDate(row['8 Consulta']),
                  formatDate(row['9 Consulta'])
                ].filter(d => d),
                hiv: row['HIV'] || 'NÃO REALIZADO',
                hepatiteB: row['Hepatite B'] || 'NÃO REALIZADO',
                hepatiteC: row['Hepatite C'] || 'NÃO REALIZADO',
                sifilis: row['Sifilis'] || 'NÃO REALIZADO',
                dtpa: row['dTpa'] || 'Não',
                diabetes: row['Tem Diabete?'] || 'Não',
                hipertensao: row['Tem Hipertensão?'] || row['Tem Pressão Alta?'] || 'Não'
              },
              crianca: {
                visita30dias: formatDate(row['Visita30dias']),
                visita6meses: formatDate(row['Visita6Meses']),
                vacinas: {
                  penta2m: formatDate(row['Penta2Meses']),
                  penta4m: formatDate(row['Penta4Meses']),
                  penta6m: formatDate(row['Penta6Meses']),
                  vip2m: formatDate(row['VIP2meses']),
                  vip4m: formatDate(row['VIP4meses']),
                  vip6m: formatDate(row['VIP6meses'])
                }
              },
              acamadodomiciliado: {
                dependencia: row['Grau de Dependência'] || 'Parcial',
                curativos: row['CurativosdeFeridasAbertas'] || 'Não',
                cuidador: row['Cuidador Presente'] || 'Não',
                diabetes: row['Tem Diabete?'] || 'Não',
                hipertensao: row['Tem Hipertensão?'] || row['Tem Pressão Alta?'] || 'Não'
              },
              adulto: {
                diabetes: row['Tem Diabete?'] || 'Não',
                hipertensao: row['Tem Hipertensão?'] || row['Tem Pressão Alta?'] || 'Não'
              },
              idoso: {
                diabetes: row['Tem Diabete?'] || 'Não',
                hipertensao: row['Tem Hipertensão?'] || row['Tem Pressão Alta?'] || 'Não'
              }
            };

            // 4. Insert Patient
            const { error: pError } = await supabase
              .from('patients')
              .insert([{
                name,
                cns,
                responsible_cns: respCns,
                is_family_responsible: isResp,
                birth_date: formatDate(row['DN']),
                gender: row['Gênero'] || 'Feminino',
                visit_date: formatDate(row['Data da Visita']) || new Date().toISOString().split('T')[0],
                contact: row['Contato'] || '',
                message_contact: row['Recado'] || '',
                household_id: householdId,
                categories,
                microarea: user.microarea || '000',
                area_color: user.color || '#00488d',
                agent_id: user.id,
                last_visit_at: formatDate(row['Data da Visita']) || new Date().toISOString(),
                clinical_data: clinicalData
              }]);

            if (pError) throw pError;
            successCount++;
          } catch (err: any) {
            errorCount++;
            messages.push(`Erro no paciente ${row['Nome do Paciente']}: ${err.message}`);
          }
        }

        setResults({ success: successCount, error: errorCount, messages });
        setLoading(false);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
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

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-6 rounded-2xl flex gap-4">
        <Info className="w-6 h-6 text-blue-600 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
          <p className="font-bold">Instruções de Importação:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Cole o conteúdo da sua planilha no formato CSV (separado por vírgulas).</li>
            <li>O sistema identificará automaticamente os domicílios pelo CNS do Responsável Familiar.</li>
            <li>Datas devem estar no formato DD/MM/YYYY.</li>
            <li>Certifique-se de que os cabeçalhos correspondem ao modelo enviado.</li>
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
