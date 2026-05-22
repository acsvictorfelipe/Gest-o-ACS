import React from 'react';
import { User, Gift } from 'lucide-react';
import { calculateAge } from '../../lib/dateUtils';

interface PersonalInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function PersonalInfo({ formData, setFormData, isReadOnly }: PersonalInfoProps) {
  return (
    <div className="space-y-6">
      {/* Seção de Identificação Geral */}
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
              onChange={e => setFormData({ ...formData, responsibleCns: e.target.value.replace(/\s+/g, '') })}
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
              onChange={e => setFormData({ ...formData, cns: e.target.value.replace(/\s+/g, '') })}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Gênero</label>
            <select 
              required
              disabled={isReadOnly}
              value={formData.gender || ''}
              onChange={e => setFormData({ ...formData, gender: e.target.value })}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="" disabled>Selecione</option>
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
        </div>
      </section>

      {/* Seção de Benefícios Sociais */}
      <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Gift className="w-4 h-4" />
          <h3 className="text-sm font-semibold uppercase tracking-tight">Benefícios Sociais</h3>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] text-text-muted font-medium">
            Selecione abaixo os programas governamentais e benefícios sociais dos quais o cidadão é beneficiário:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Bolsa Família', 'BPC', 'Outros'].map(benefit => (
              <label 
                key={benefit} 
                className="flex items-center justify-between p-3.5 bg-bg-primary dark:bg-slate-800 rounded-xl border border-border dark:border-slate-800 hover:border-green-500/30 hover:bg-green-50/5 dark:hover:bg-green-950/5 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={formData.clinicalData?.socialBenefits?.includes(benefit) || false}
                    onChange={e => {
                      const current = formData.clinicalData?.socialBenefits || [];
                      const next = e.target.checked 
                        ? [...current, benefit] 
                        : current.filter((b: string) => b !== benefit);
                      setFormData((prev: any) => ({
                        ...prev,
                        clinicalData: {
                          ...prev.clinicalData,
                          socialBenefits: next
                        }
                      }));
                    }}
                    className="w-4 h-4 rounded border-border dark:border-slate-700 text-green-600 focus:ring-green-500/25 disabled:opacity-50"
                  />
                  <span className="text-[11px] font-bold text-text-secondary dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors uppercase tracking-wider">
                    {benefit}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

