import React from 'react';
import { Copy, AlertTriangle } from 'lucide-react';
import { calculateAge } from '../../lib/dateUtils';
import { PatientFormData } from '../../types/patient';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export function IdentificationSection({ formData, setFormData }: Props) {
  return (
    <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-8 bg-primary rounded-full"></div>
        <h3 className="text-xl font-bold text-primary font-headline">Identificação Geral</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            {formData.isFamilyResponsible ? 'Seu CNS (Responsável)' : 'CNS do Responsável Familiar (Opcional)'}
          </label>
          <input 
            type="text" 
            value={(formData.isFamilyResponsible ? formData.cns : formData.responsibleCns) || ''}
            onChange={e => setFormData(prev => ({...prev, responsibleCns: e.target.value}))}
            disabled={formData.isFamilyResponsible}
            className={`w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 ${formData.isFamilyResponsible ? 'opacity-50 cursor-not-allowed' : ''}`} 
            placeholder="000 0000 0000 0000" 
          />
          {!formData.isFamilyResponsible && (
            <p className="text-[9px] text-slate-400 mt-1 italic">Use o CNS para vincular este cidadão a uma família existente.</p>
          )}
          {!formData.isFamilyResponsible && !formData.responsibleCns && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-[9px] font-bold text-amber-700 uppercase">Responsável Pendente: O domicílio não será gerado.</span>
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resp. Familiar?</label>
          <select 
            value={formData.isFamilyResponsible ? 'Sim' : 'Não'}
            onChange={e => setFormData(prev => ({...prev, isFamilyResponsible: e.target.value === 'Sim'}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div className="md:col-span-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
            <button 
              type="button"
              onClick={() => navigator.clipboard.writeText(formData.name)}
              className="p-1 text-slate-300 hover:text-primary transition-colors"
              title="Copiar Nome"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <input 
            type="text" 
            value={formData.name || ''}
            onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
            placeholder="Nome do paciente" 
          />
        </div>
        <div className="md:col-span-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">SUS do Cidadão</label>
          <input 
            type="text" 
            value={formData.cns || ''}
            onChange={e => setFormData(prev => ({...prev, cns: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
            placeholder="000 0000 0000 0000" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Gênero</label>
          <select 
            value={formData.gender || 'Feminino'}
            onChange={e => setFormData(prev => ({...prev, gender: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option>Feminino</option>
            <option>Masculino</option>
            <option>Outro</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Data de Nascimento</label>
            <button 
              type="button"
              onClick={() => navigator.clipboard.writeText(formData.birthDate)}
              className="p-1 text-slate-300 hover:text-primary transition-colors"
              title="Copiar Data"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <input 
            type="date" 
            value={formData.birthDate || ''}
            onChange={e => setFormData(prev => ({...prev, birthDate: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Idade (Automática)</label>
          <input 
            disabled
            type="text" 
            value={calculateAge(formData.birthDate) || ''}
            className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm text-slate-500" 
          />
        </div>

        {/* Endereço e Contato integrados na mesma seção lógica */}
        <div className="md:col-span-5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Endereço</label>
          <input 
            type="text" 
            value={formData.address || ''}
            onChange={e => setFormData(prev => ({...prev, address: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nº</label>
          <input 
            type="text" 
            value={formData.number || ''}
            onChange={e => setFormData(prev => ({...prev, number: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Complemento</label>
          <input 
            type="text" 
            value={formData.complement || ''}
            onChange={e => setFormData(prev => ({...prev, complement: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Contato</label>
            {formData.contact && (
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(formData.contact);
                  alert('Contato copiado!');
                }}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Copiar Contato"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
          <input 
            type="text" 
            value={formData.contact || ''}
            onChange={e => setFormData(prev => ({...prev, contact: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Recado</label>
            {formData.messageContact && (
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(formData.messageContact);
                  alert('Contato de recado copiado!');
                }}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Copiar Contato de Recado"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
          <input 
            type="text" 
            value={formData.messageContact || ''}
            onChange={e => setFormData(prev => ({...prev, messageContact: e.target.value}))}
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
      </div>
    </section>
  );
}
