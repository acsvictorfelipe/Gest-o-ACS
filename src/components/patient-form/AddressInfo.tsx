import React from 'react';
import { Home, MessageCircle, Phone } from 'lucide-react';

interface AddressInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function AddressInfo({ formData, setFormData, isReadOnly }: AddressInfoProps) {
  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    // Remove all non-numeric characters
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      alert("Número de telefone incompleto.");
      return;
    }
    // Add country code 55 if not present
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };

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
            disabled={isReadOnly}
            value={formData.address || ''}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
            placeholder="Ex: Rua das Flores, 123"
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Número</label>
          <input 
            type="text" 
            disabled={isReadOnly}
            value={formData.number || ''}
            onChange={e => setFormData({ ...formData, number: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Compl.</label>
          <input 
            type="text" 
            disabled={isReadOnly}
            value={formData.complement || ''}
            onChange={e => setFormData({ ...formData, complement: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
          />
        </div>
        
        <div className="md:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Contato / WhatsApp</label>
            {formData.contact && (
              <button 
                type="button"
                onClick={() => handleWhatsApp(formData.contact)}
                className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
              >
                <MessageCircle className="w-3 h-3" />
                Abrir
              </button>
            )}
          </div>
          <div className="relative">
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.contact || ''}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
              placeholder="(00) 00000-0000"
            />
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
          </div>
        </div>

        <div className="md:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Telefone Recado / WhatsApp</label>
            {formData.contact2 && (
              <button 
                type="button"
                onClick={() => handleWhatsApp(formData.contact2)}
                className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
              >
                <MessageCircle className="w-3 h-3" />
                Abrir
              </button>
            )}
          </div>
          <div className="relative">
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.contact2 || ''}
              onChange={e => setFormData({ ...formData, contact2: e.target.value })}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
              placeholder="(00) 00000-0000"
            />
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
          </div>
        </div>

        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Nome para Recado</label>
          <input 
            type="text" 
            disabled={isReadOnly}
            value={formData.messageContact || ''}
            onChange={e => setFormData({ ...formData, messageContact: e.target.value })}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
            placeholder="Ex: Esposo, Mãe..."
          />
        </div>
      </div>
    </section>
  );
}
