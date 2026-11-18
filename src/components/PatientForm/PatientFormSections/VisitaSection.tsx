import React, { useState } from 'react';
import { Sparkles, X, Plus, FileText, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { VISIT_TEMPLATES, VISIT_CATEGORIES, getTemplateForType, isDefaultVisitTemplate, VisitTemplate } from '../../../constants/visitTemplates';
import { replaceDateInClinicalData } from '../../../lib/dateUtils';

interface VisitaSectionProps {
  formData: any;
  setFormData: (updater: any) => void;
  isReadOnly?: boolean;
}

export function VisitaSection({ formData, setFormData, isReadOnly }: VisitaSectionProps) {
  const [showTemplates, setShowTemplates] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCancelTodayVisit = () => {
    setFormData((prev: any) => ({
      ...prev,
      visitDate: '',
      visitType: 'Rotina',
      visitSummary: ''
    }));
  };

  const handleSelectType = (selectedType: string) => {
    const template = getTemplateForType(selectedType);
    setFormData((prev: any) => {
      // Auto-preenche o texto padrão caso o campo esteja vazio ou contenha apenas outro modelo padrão não editado
      const currentSummary = prev.visitSummary || '';
      const shouldAutoFill = (!currentSummary.trim() || isDefaultVisitTemplate(currentSummary)) && template;

      return {
        ...prev,
        visitType: selectedType,
        visitSummary: shouldAutoFill ? template.defaultText : currentSummary
      };
    });
  };

  const handleApplyTemplate = (template: VisitTemplate) => {
    setFormData((prev: any) => ({
      ...prev,
      visitType: template.type,
      visitSummary: template.defaultText
    }));
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredTemplates = activeCategory === 'Todas'
    ? VISIT_TEMPLATES
    : VISIT_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-4">
      {formData.visitDate && (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-teal-500/5 via-primary/5 to-emerald-500/5 dark:from-teal-950/20 dark:via-slate-900 dark:to-emerald-950/20 rounded-2xl border border-primary/20 shadow-sm space-y-5 animate-in fade-in duration-300" id="secao-visita">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Registrar Visita ACS</h4>
                <p className="text-[10px] text-text-muted font-semibold">Registro e evolução clínica domiciliar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelTodayVisit}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cancelar registro da visita de hoje"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Fields: Date & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                Data da Visita
              </label>
              <input
                type="date"
                disabled={isReadOnly}
                value={formData.visitDate}
                onChange={e => {
                  const newDate = e.target.value;
                  setFormData((prev: any) => {
                    if (prev.visitDate && newDate) {
                      const res = replaceDateInClinicalData(prev.clinicalData, prev.visitDate, newDate);
                      return {
                        ...prev,
                        visitDate: newDate,
                        ...(res.changed ? { clinicalData: res.updated } : {})
                      };
                    }
                    return { ...prev, visitDate: newDate };
                  });
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                  Tipo de Visita
                </label>
                {getTemplateForType(formData.visitType) && (
                  <button
                    type="button"
                    onClick={() => {
                      const t = getTemplateForType(formData.visitType);
                      if (t) handleApplyTemplate(t);
                    }}
                    className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Inserir texto deste tipo
                  </button>
                )}
              </div>

              <select
                disabled={isReadOnly}
                value={formData.visitType}
                onChange={e => handleSelectType(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 shadow-xs"
              >
                <optgroup label="Geral & Cadastro" className="font-bold text-slate-800 dark:text-slate-200">
                  <option value="Rotina">Rotina</option>
                  <option value="Acompanhamento">Acompanhamento</option>
                  <option value="Atualização de Cadastro">Atualização de Cadastro</option>
                  <option value="Urgência">Urgência</option>
                  <option value="Ausente">Ausente (Cidadão Ausente)</option>
                </optgroup>

                <optgroup label="Gestante & Puerpério" className="font-bold text-pink-700 dark:text-pink-300">
                  <option value="Visita Gestante">Visita Gestante</option>
                  <option value="Fechamento Pré-Natal">Fechamento Pré-Natal</option>
                  <option value="Fechamento Pré-Natal e 1ª Consulta RN">Fechamento Pré-Natal e 1ª Consulta RN</option>
                  <option value="Pós-Parto">Pós-Parto</option>
                  <option value="Recém-Nascido">Recém-Nascido</option>
                </optgroup>

                <optgroup label="Equipe Multiprofissional" className="font-bold text-indigo-700 dark:text-indigo-300">
                  <option value="Médico / Enfermeira">Médico / Enfermeira</option>
                </optgroup>

                <optgroup label="Exames & Procedimentos" className="font-bold text-amber-700 dark:text-amber-300">
                  <option value="Coleta de Exames">Coleta de Exames</option>
                </optgroup>

                <optgroup label="Busca Ativa" className="font-bold text-emerald-700 dark:text-emerald-300">
                  <option value="Busca Ativa">Busca Ativa</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Sugestões de Texto / Modelos de Evolução */}
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3.5 border border-border dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTemplates(!showTemplates)}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Modelos de Evolução por Categoria
                </span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[9px] font-black">
                  {VISIT_TEMPLATES.length} modelos
                </span>
              </div>
              <button type="button" className="text-text-muted hover:text-text-primary p-1">
                {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTemplates && (
              <div className="space-y-3 pt-2 border-t border-border/50 dark:border-slate-700/60 animate-in fade-in duration-200">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {['Todas', ...VISIT_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                  {filteredTemplates.map((template) => {
                    const isApplied = formData.visitSummary === template.defaultText;
                    return (
                      <div
                        key={template.id}
                        onClick={() => !isReadOnly && handleApplyTemplate(template)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 group ${
                          isApplied
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 shadow-xs'
                            : 'bg-bg-primary dark:bg-slate-800 border-border dark:border-slate-700/70 hover:border-teal-400 hover:bg-teal-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
                            {template.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {template.category.split('&')[0]}
                          </span>
                        </div>

                        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
                          {template.defaultText}
                        </p>

                        <div className="flex items-center justify-between text-[9px] pt-1 border-t border-border/40 font-bold">
                          <span className="text-teal-600 dark:text-teal-400">Tipo: {template.type}</span>
                          <span className="text-teal-700 dark:text-teal-300 flex items-center gap-1 group-hover:underline">
                            {copiedId === template.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                Aplicado!
                              </>
                            ) : (
                              'Clique para aplicar'
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Textarea Anotações da Visita */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wider block">
                  Anotações da Visita / Conduta Clínica
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  ✏️ Você pode editar e personalizar o texto livremente abaixo (alterar datas, horários, nomes) antes de salvar.
                </span>
              </div>
              {formData.visitSummary && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, visitSummary: '' }))}
                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Limpar texto
                </button>
              )}
            </div>
            <textarea
              disabled={isReadOnly}
              value={formData.visitSummary || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, visitSummary: e.target.value }))}
              rows={4}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 shadow-inner placeholder:font-normal placeholder:text-slate-400 leading-relaxed"
              placeholder="Descreva a conduta ou selecione um dos modelos acima para preencher automaticamente (você poderá editar qualquer parte do texto)."
            />
          </div>
        </div>
      )}
    </div>
  );
}
