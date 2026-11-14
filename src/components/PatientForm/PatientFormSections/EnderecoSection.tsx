import React, { useState, useEffect, useRef } from 'react';
import { Home, MessageCircle, Phone, Gift, Users } from 'lucide-react';
import { useToast } from '../../Toast';

interface EnderecoSectionProps {
  formData: any;
  setFormData: (updater: any) => void;
  isReadOnly?: boolean;
  streets?: string[];
  onOpenHouseholdModal?: () => void;
}

export function EnderecoSection({ formData, setFormData, isReadOnly, streets = [], onOpenHouseholdModal }: EnderecoSectionProps) {
  const [showStreets, setShowStreets] = useState(false);
  const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { warning } = useToast();

  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      warning("Número de telefone incompleto.");
      return;
    }
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };

  useEffect(() => {
    if (formData.address) {
      const filtered = streets.filter(s => 
        s.toLowerCase().includes(formData.address.toLowerCase())
      );
      setFilteredStreets(filtered);
    } else {
      setFilteredStreets(streets);
    }
  }, [formData.address, streets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStreets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-3.5 sm:p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Home className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-tight">Endereço e Contato</h3>
          </div>
          {formData.householdId && onOpenHouseholdModal && (
            <button
              type="button"
              onClick={onOpenHouseholdModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold border border-teal-200 dark:border-teal-800 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Abrir lista de familiares residentes no mesmo domicílio"
            >
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Ver Familiares no Domicílio</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
          <div className="md:col-span-8 relative" ref={dropdownRef}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Logradouro / Rua</label>
            <div className="relative mt-1.5">
              <input 
                type="text" 
                disabled={isReadOnly}
                value={formData.address || ''}
                onFocus={() => !isReadOnly && setShowStreets(true)}
                onChange={e => {
                  setFormData((prev: any) => ({ ...prev, address: e.target.value }));
                  setShowStreets(true);
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
                placeholder="Ex: Rua das Flores"
              />
              {showStreets && filteredStreets.length > 0 && !isReadOnly && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                  {filteredStreets.map((street, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setFormData((prev: any) => ({ ...prev, address: street }));
                        setShowStreets(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors border-b border-border/50 last:border-0 font-bold text-slate-900 dark:text-slate-100"
                    >
                      {street}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Número</label>
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.number || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, number: e.target.value }))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 mt-1.5" 
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Compl.</label>
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.complement || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, complement: e.target.value }))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 mt-1.5" 
            />
          </div>
          
          <div className="md:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Contato / WhatsApp</label>
              {formData.contact && (
                <button 
                  type="button"
                  onClick={() => handleWhatsApp(formData.contact)}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                >
                  <MessageCircle className="w-3 h-3" />
                  Abrir
                </button>
              )}
            </div>
            <div className="relative mt-1.5">
              <input 
                type="text" 
                disabled={isReadOnly}
                value={formData.contact || ''}
                onChange={e => setFormData((prev: any) => ({ ...prev, contact: e.target.value }))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
                placeholder="(00) 00000-0000"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-bold" />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Telefone Recado / WhatsApp</label>
              {formData.contact2 && (
                <button 
                  type="button"
                  onClick={() => handleWhatsApp(formData.contact2)}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                >
                  <MessageCircle className="w-3 h-3" />
                  Abrir
                </button>
              )}
            </div>
            <div className="relative mt-1.5">
              <input 
                type="text" 
                disabled={isReadOnly}
                value={formData.contact2 || ''}
                onChange={e => setFormData((prev: any) => ({ ...prev, contact2: e.target.value }))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" 
                placeholder="(00) 00000-0000"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-bold" />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Nome para Recado</label>
            <input 
              type="text" 
              disabled={isReadOnly}
              value={formData.messageContact || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, messageContact: e.target.value }))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 mt-1.5" 
              placeholder="Ex: Esposo, Mãe..."
            />
          </div>
        </div>
      </section>

      {/* Seção de Benefícios Sociais */}
      <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Gift className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-tight">Benefícios Sociais</h3>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] text-text-muted font-medium">
            Selecione abaixo os programas governamentais e benefícios sociais dos quais o cidadão é beneficiário:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Bolsa Família', 'BPC-LOAS'].map(benefit => (
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
