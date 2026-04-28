import React from 'react';
import { User } from 'lucide-react';
import { calculateAge } from '../../lib/dateUtils';

interface PersonalInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function PersonalInfo({ formData, setFormData, isReadOnly }: PersonalInfoProps) {
  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <User className="w-4 h-4" />
        <h3 className="text-sm font-semibold uppercase tracking-tight">Identificação Geral</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            {formData.isFamilyResponsible ? 'Seu CNS (Responsável)' : 'CNS do Responsável'}
          </label>
          <input 
            type="text" 
            value={(formData.isFamilyResponsible ? formData.cns : formData.responsibleCns) || ''}
            onChange={e => setFormData({ ...formData, responsibleCns: e.target.value })}
            disabled={formData.isFamilyResponsible || isReadOnly}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-50" 
            placeholder="000 0000 0000 0000" 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Responsável?</label>
          <select 
            disabled={isReadOnly}
            value={formData.isFamilyResponsible ? 'Sim' : 'Não'}
            onChange={e => setFormData({ ...formData, isFamilyResponsible: e.target.value === 'Sim' })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nome Completo</label>
          <input 
            type="text" 
            disabled={isReadOnly}
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
          />
        </div>
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">SUS / CNS</label>
          <input 
            type="text" 
            disabled={isReadOnly}
            value={formData.cns || ''}
            onChange={e => setFormData({ ...formData, cns: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Gênero</label>
          <select 
            disabled={isReadOnly}
            value={formData.gender || 'Feminino'}
            onChange={e => setFormData({ ...formData, gender: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <option>Feminino</option>
            <option>Masculino</option>
            <option>Outro</option>
          </select>
        </div>
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nascimento</label>
          <input 
            type="date" 
            disabled={isReadOnly}
            value={formData.birthDate || ''}
            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
          />
        </div>
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Idade</label>
          <input 
            disabled
            type="text" 
            value={calculateAge(formData.birthDate) || ''}
            className="w-full bg-bg-primary dark:bg-slate-800/50 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm text-text-secondary font-medium" 
          />
        </div>

        <div id="secao-visita" className="md:col-span-12 pt-4 border-t border-border dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Data da Visita Atual</label>
              <input 
                type="date" 
                disabled={isReadOnly}
                value={formData.visitDate || ''}
                onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Tipo de Visita</label>
              <select 
                disabled={isReadOnly}
                value={formData.visitType}
                onChange={e => setFormData({ ...formData, visitType: e.target.value })}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option>Rotina</option>
                <option>Acompanhamento</option>
                <option>Urgência</option>
                <option>Pós-Parto</option>
                <option>Recém-Nascido</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Benefícios</label>
              <div className="flex items-center gap-3 bg-bg-primary dark:bg-slate-800 h-[38px] px-3 rounded-lg border border-border dark:border-slate-800">
                {['Bolsa Família', 'BPC', 'Outros'].map(benefit => (
                  <label key={benefit} className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={formData.clinicalData?.socialBenefits?.includes(benefit)}
                      onChange={e => {
                        const current = formData.clinicalData?.socialBenefits || [];
                        const next = e.target.checked ? [...current, benefit] : current.filter((b: string) => b !== benefit);
                        setFormData((prev: any) => ({ ...prev, clinicalData: { ...prev.clinicalData, socialBenefits: next } }));
                      }}
                      className="w-4 h-4 rounded border-border text-primary disabled:opacity-50"
                    />
                    <span className="text-[9px] font-semibold text-text-muted uppercase">{benefit === 'Bolsa Família' ? 'BF' : benefit}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

