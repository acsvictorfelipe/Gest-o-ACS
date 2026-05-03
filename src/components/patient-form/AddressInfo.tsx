import React from 'react';
import { Home, MessageCircle, Phone } from 'lucide-react';

interface AddressInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
  streets?: string[];
}

export function AddressInfo({ formData, setFormData, isReadOnly, streets = [] }: AddressInfoProps) {
  const [showStreets, setShowStreets] = React.useState(false);
  const [filteredStreets, setFilteredStreets] = React.useState<string[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      alert("Número de telefone incompleto.");
      return;
    }
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };

  React.useEffect(() => {
    if (formData.address) {
      const filtered = streets.filter(s => 
        s.toLowerCase().includes(formData.address.toLowerCase())
      );
      setFilteredStreets(filtered);
    } else {
      setFilteredStreets(streets);
    }
  }, [formData.address, streets]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStreets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Home className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-tight">Endereço e Contato</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
        <div className="md:col-span-8 space-y-1.5 relative" ref={dropdownRef}>
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Logradouro / Rua</label>
          <div className="relative">
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.address || ''}
              onFocus={() => !isReadOnly && setShowStreets(true)}
              onChange={e => {
                setFormData({ ...formData, address: e.target.value });
                setShowStreets(true);
              }}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
              placeholder="Ex: Rua das Flores"
            />
            {showStreets && filteredStreets.length > 0 && !isReadOnly && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                {filteredStreets.map((street, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, address: street });
                      setShowStreets(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors border-b border-border/50 last:border-0 font-medium dark:text-white"
                  >
                    {street}
                  </button>
                ))}
              </div>
            )}
          </div>
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
