import React from 'react';
import { Megaphone, Plus, X as CloseIcon, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, Campaign } from '../../types';
import { formatDate } from '../../lib/dateUtils';

interface CampanhasTabProps {
  currentUser: AppUser | null;
  campaigns: Campaign[];
  campaignForm: any;
  setCampaignForm: (cf: any) => void;
  showNewCampaignModal: boolean;
  setShowNewCampaignModal: (show: boolean) => void;
  handleCreateCampaign: (e: React.FormEvent) => Promise<void>;
  handleToggleCampaign: (id: string, active: boolean, title: string) => Promise<void>;
}

export function CampanhasTab({
  currentUser,
  campaigns,
  campaignForm,
  setCampaignForm,
  showNewCampaignModal,
  setShowNewCampaignModal,
  handleCreateCampaign,
  handleToggleCampaign
}: CampanhasTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Diretrizes de Saúde Ativas</h3>
        {currentUser?.role === 'Administrador' && (
          <button 
            onClick={() => {
              setCampaignForm({ title: '', content: '', target: 'Todos' });
              setShowNewCampaignModal(true);
            }} 
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Diretriz
          </button>
        )}
      </div>

      {/* Campaign Modal overlay */}
      <AnimatePresence>
        {showNewCampaignModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowNewCampaignModal(false)}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-primary transition-colors"
              >
                <CloseIcon className="w-4.5 h-4.5" />
              </button>

              <h4 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-teal-600" />
                Publicar Diretriz de Saúde
              </h4>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Título da Diretriz</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Campanha Contra a Influenza - Priorizar Idosos"
                    value={campaignForm.title} 
                    onChange={e => setCampaignForm({...campaignForm, title: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Conteúdo / Orientações para o ACS</label>
                  <textarea 
                    required 
                    rows={4}
                    placeholder="Descreva as instruções detalhadas que os agentes de saúde comunitária devem priorizar em suas visitas de campo nesta semana..."
                    value={campaignForm.content} 
                    onChange={e => setCampaignForm({...campaignForm, content: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-600/10 flex items-center justify-center gap-1.5 mt-4"
                >
                  <Check className="w-4 h-4" />
                  Publicar para toda a Equipe
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Campaign lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map(camp => (
          <div key={camp.id} className={`p-5 rounded-3xl border flex flex-col justify-between gap-3 shadow-sm bg-bg-secondary ${
            camp.active ? 'border-teal-500/25 shadow-teal-500/5' : 'border-border/60 opacity-60'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                  camp.active ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {camp.active ? 'Em Destaque' : 'Arquivado'}
                </span>
                <span className="text-[9px] font-bold text-text-muted">{formatDate(camp.created_at || '')}</span>
              </div>
              <h4 className="text-[13px] font-black text-text-primary uppercase tracking-tight leading-tight">{camp.title}</h4>
              <p className="text-[11px] text-text-secondary leading-normal whitespace-pre-line">{camp.content}</p>
            </div>

            {currentUser?.role === 'Administrador' && (
              <div className="flex justify-end pt-3 border-t border-border/40">
                <button 
                  onClick={() => handleToggleCampaign(camp.id, camp.active, camp.title)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                    camp.active 
                      ? 'border-border text-text-secondary hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20' 
                      : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {camp.active ? 'Arquivar' : 'Ativar'}
                </button>
              </div>
            )}
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="md:col-span-2 text-center py-12 text-text-muted font-bold text-xs uppercase">
            Nenhuma diretriz ou campanha cadastrada.
          </div>
        )}
      </div>
    </div>
  );
}
