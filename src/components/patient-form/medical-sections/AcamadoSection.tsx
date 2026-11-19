import React from 'react';
import { Activity } from 'lucide-react';

interface AcamadoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function AcamadoSection({ formData, setFormData, isReadOnly }: AcamadoSectionProps) {
  const cats: string[] = Array.isArray(formData.categories) ? formData.categories : [];
  const hasLegacy = cats.includes('AcamadoDomiciliado');
  const hasAcamado = cats.includes('Acamado');
  const hasDomiciliado = cats.includes('Domiciliado');

  if (!hasLegacy && !hasAcamado && !hasDomiciliado) return null;

  const currentCondicao =
    formData.clinicalData?.acamadodomiciliado?.condicao ||
    (hasAcamado && hasDomiciliado
      ? 'Acamado e Domiciliado'
      : hasDomiciliado
      ? 'Domiciliado'
      : 'Acamado');

  const sectionTitle =
    currentCondicao === 'Acamado e Domiciliado'
      ? 'Categoria: Acamado e Domiciliado'
      : currentCondicao === 'Domiciliado'
      ? 'Categoria: Domiciliado (Restrito ao Domicílio)'
      : 'Categoria: Acamado (Restrito ao Leito)';

  const handleCondicaoChange = (newCond: string) => {
    setFormData((prev: any) => {
      const cleanedCats = (Array.isArray(prev.categories) ? prev.categories : []).filter(
        (c: string) => c !== 'AcamadoDomiciliado' && c !== 'Acamado' && c !== 'Domiciliado'
      );
      if (newCond === 'Acamado' || newCond === 'Acamado e Domiciliado') {
        cleanedCats.push('Acamado');
      }
      if (newCond === 'Domiciliado' || newCond === 'Acamado e Domiciliado') {
        cleanedCats.push('Domiciliado');
      }

      return {
        ...prev,
        categories: cleanedCats,
        clinicalData: {
          ...prev.clinicalData,
          acamadodomiciliado: {
            ...(prev.clinicalData?.acamadodomiciliado || {}),
            condicao: newCond
          }
        }
      };
    });
  };

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-teal-500 animate-in fade-in slide-in-from-top-2 duration-300 mb-8">
      <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400 mb-6 font-headline flex items-center gap-2">
        <Activity className="w-6 h-6" />
        {sectionTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Situação / Classificação</label>
          <select
            disabled={isReadOnly}
            value={currentCondicao}
            onChange={e => handleCondicaoChange(e.target.value)}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm font-semibold"
          >
            <option value="Acamado">Acamado (Restrito ao leito)</option>
            <option value="Domiciliado">Domiciliado (Não acamado, restrito ao lar)</option>
            <option value="Acamado e Domiciliado">Acamado e Domiciliado</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Grau de Dependência</label>
          <select 
            value={formData.clinicalData?.acamadodomiciliado?.dependencia || 'Total'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), dependencia: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Total</option>
            <option>Parcial</option>
            <option>Mínima</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Faz uso de curativos?</label>
          <select 
            value={formData.clinicalData?.acamadodomiciliado?.curativos || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), curativos: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Cuidador Presente</label>
          <select 
            value={formData.clinicalData?.acamadodomiciliado?.cuidador || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), cuidador: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Faz uso de fralda?</label>
          <select 
            value={formData.clinicalData?.acamadodomiciliado?.usoFralda || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), usoFralda: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {formData.clinicalData?.acamadodomiciliado?.usoFralda === 'Sim' && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Tamanho da Fralda</label>
            <select 
              value={formData.clinicalData?.acamadodomiciliado?.tamanhoFralda || ''}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), tamanhoFralda: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            >
              <option value="">Selecione...</option>
              <option>Infantil P</option>
              <option>Infantil M</option>
              <option>Infantil G</option>
              <option>Infantil GG</option>
              <option>Adulto P</option>
              <option>Adulto M</option>
              <option>Adulto G</option>
              <option>Adulto GG</option>
              <option>Adulto EXG</option>
            </select>
          </div>
        )}
        


        <div className="md:col-span-3">
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Observações</label>
          <textarea 
            value={formData.clinicalData?.acamadodomiciliado?.observacoes || ''}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                acamadodomiciliado: { ...(prev.clinicalData?.acamadodomiciliado || {}), observacoes: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm min-h-[100px]"
            placeholder="Descreva condições específicas..."
          />
        </div>
      </div>
    </section>
  );
}

