import React from 'react';
import { Home } from 'lucide-react';

interface AddressInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function AddressInfo({ formData, setFormData }: AddressInfoProps) {
  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Home className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-tight">Endereço e Contato</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
        <div className="md:col-span-8 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Logradouro / Rua</label>
          <input 
            type="text" 
            value={formData.address || ''}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Número</label>
          <input 
            type="text" 
            value={formData.number || ''}
            onChange={e => setFormData({ ...formData, number: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Compl.</label>
          <input 
            type="text" 
            value={formData.complement || ''}
            onChange={e => setFormData({ ...formData, complement: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Telefone / WhatsApp</label>
          <input 
            type="text" 
            value={formData.contact || ''}
            onChange={e => setFormData({ ...formData, contact: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Nome para Recado</label>
          <input 
            type="text" 
            value={formData.messageContact || ''}
            onChange={e => setFormData({ ...formData, messageContact: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
          />
        </div>
      </div>
    </section>
  );
}

