import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, UserPlus, X, AlertCircle, Sparkles, Plus, Baby, Activity, CheckCircle2 } from 'lucide-react';
import { formatDate, replaceDateInClinicalData } from '../../lib/dateUtils';

interface PatientFormHeaderProps {
  id: string | undefined;
  isDirty: boolean;
  isReadOnly: boolean;
  formData: any;
  setFormData: (updater: any) => void;
  setIsDirty: (dirty: boolean) => void;
  downloadVCard: () => void;
  generatePatientPDF: () => void;
  confirm: any;
  hasExpiredPrescription: boolean;
  errors: any;
  onQuickVisit?: (category: 'geral' | 'gestante' | 'cronicos', customDate?: string) => void;
  onOpenHouseholdModal?: () => void;
  onClose?: () => void;
}

export function PatientFormHeader({
  id,
  isDirty,
  isReadOnly,
  formData,
  setFormData,
  setIsDirty,
  downloadVCard,
  generatePatientPDF,
  confirm,
  hasExpiredPrescription,
  errors,
  onQuickVisit,
  onOpenHouseholdModal,
  onClose
}: PatientFormHeaderProps) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [quickVisitDate, setQuickVisitDate] = React.useState(formData.visitDate || todayStr);

  React.useEffect(() => {
    if (formData.visitDate) {
      setQuickVisitDate(formData.visitDate);
    }
  }, [formData.visitDate]);

  const handleClose = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Descartar alterações?',
        message: 'Você possui alterações não salvas no prontuário. Deseja realmente sair sem salvar?'
      });
      if (!ok) return;
    }
    if (onClose) {
      onClose();
    } else {
      const targetH = formData.householdId;
      if (targetH) {
        navigate(`/domicilio/${targetH}`);
      } else {
        navigate('/pacientes');
      }
    }
  };

  return (
    <div className="space-y-6">
      {formData.clinicalData?.obito?.flg_obito && (
        <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 animate-pulse" />
          <div className="text-xs font-bold uppercase tracking-wider">
            Atenção: Este cidadão está registrado como FALECIDO (Óbito) em {formData.clinicalData.obito.data_obito ? formatDate(formData.clinicalData.obito.data_obito) : 'data não informada'}.
            {formData.clinicalData.obito.observacoes && ` Observação: ${formData.clinicalData.obito.observacoes}`}
          </div>
        </div>
      )}

      {hasExpiredPrescription && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 animate-pulse" />
          <div className="text-xs font-semibold uppercase tracking-wider">
            Atenção: Este paciente possui receita de medicamento vencida! Verifique e atualize os prazos na seção "Receitas".
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && (() => {
        const fieldLabels: Record<string, string> = {
          'name': 'Nome Completo',
          'birthDate': 'Data de Nascimento',
          'gender': 'Gênero',
          'address': 'Endereço',
          'number': 'Número',
          'cns': 'Cartão SUS (CNS)',
          'responsibleCns': 'CNS do Responsável',
          'clinicalData -> gestante -> dum': 'Gestante - DUM',
          'clinicalData -> gestante -> dpp': 'Gestante - DPP',
          'clinicalData -> gestante -> puerperioConsulta': 'Gestante - Consulta do Puerpério',
          'clinicalData -> gestante -> puerperioVisita': 'Gestante - Visita do Puerpério',
          'clinicalData -> gestante -> notes': 'Gestante - Observações/Anotações',
          'clinicalData -> crianca -> notes': 'Criança - Observações/Anotações',
          'clinicalData -> adulto -> notes': 'Adulto - Observações/Anotações',
          'clinicalData -> idoso -> notes': 'Idoso - Observações/Anotações',
        };

        const getErrorMessages = (errs: any): string[] => {
          const messages: string[] = [];
          const traverse = (obj: any, path: string = '') => {
            if (!obj || typeof obj !== 'object') return;
            if (typeof obj.message === 'string' && obj.message) {
              const friendlyField = fieldLabels[path] || path;
              messages.push(friendlyField ? `${friendlyField}: ${obj.message}` : obj.message);
              return;
            }
            for (const key of Object.keys(obj)) {
              const nextPath = path ? `${path} -> ${key}` : key;
              traverse(obj[key], nextPath);
            }
          };
          traverse(errs);
          return messages;
        };
        const uniqueErrors = Array.from(new Set(getErrorMessages(errors)));
        return (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs mb-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              Por favor, corrija os seguintes erros antes de salvar:
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 font-semibold">
              {uniqueErrors.length > 0 ? (
                uniqueErrors.map((message: string, index: number) => (
                  <li key={index}>{message}</li>
                ))
              ) : (
                <li>Existem campos obrigatórios ou inválidos não preenchidos no formulário.</li>
              )}
            </ul>
          </div>
        );
      })()}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <header className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white uppercase">
              {id ? 'Editar Cadastro' : 'Novo Cadastro'}
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-tight">
              Preencha as informações detalhadas do prontuário.
            </p>
          </header>
          
          <label className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/35 rounded-lg cursor-pointer transition-colors select-none text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase shrink-0">
            <input 
              type="checkbox"
              checked={formData.clinicalData?.sus_atualizado === 'Sim'}
              onChange={e => {
                setIsDirty(true);
                setFormData((prev: any) => ({
                  ...prev,
                  clinicalData: {
                    ...prev.clinicalData,
                    sus_atualizado: e.target.checked ? 'Sim' : 'Não'
                  }
                }));
              }}
              className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-800 focus:ring-offset-0"
            />
            <span>SUS Atualizado</span>
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {formData.householdId && (
            <button 
              type="button" 
              onClick={onOpenHouseholdModal}
              className="px-3 py-2 text-teal-700 dark:text-teal-300 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 rounded-xl flex items-center gap-1.5 text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95"
              title="Visualizar todos os moradores deste domicílio"
            >
              <Home className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Moradores</span>
            </button>
          )}
          {id && (
            <button 
              type="button" 
              onClick={() => downloadVCard()}
              className="p-2 text-slate-500 hover:text-primary dark:hover:text-teal-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
              title="Salvar nos contatos"
            >
              <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">Salvar Contato</span>
            </button>
          )}
          {id && (
            <button 
              type="button" 
              onClick={generatePatientPDF}
              className="p-2 text-slate-500 hover:text-primary transition-colors bg-slate-50 rounded-lg"
              title="Gerar Ficha PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button 
            type="button"
            onClick={handleClose} 
            className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-50 rounded-lg cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Barra de Ações Rápidas de Registro de Visitas por Categoria */}
      {!isReadOnly && id && (
        <div className="flex flex-wrap items-center gap-3 bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mr-1">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Registrar Visita:
            </span>
          </div>

          <input
            type="date"
            aria-label="Data da Visita"
            value={formData.visitDate || quickVisitDate}
            onChange={(e) => {
              const newDate = e.target.value;
              setQuickVisitDate(newDate);
              if (formData.visitDate && newDate) {
                setFormData((prev: any) => {
                  const res = replaceDateInClinicalData(prev.clinicalData, prev.visitDate, newDate);
                  return {
                    ...prev,
                    visitDate: newDate,
                    ...(res.changed ? { clinicalData: res.updated } : {})
                  };
                });
                setIsDirty(true);
              }
            }}
            className="bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
            title="Escolha ou altere a data da visita"
          />

          <button
            type="button"
            onClick={() => onQuickVisit?.('geral', formData.visitDate || quickVisitDate || todayStr)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Registrar Visita ACS Padrão na data selecionada"
          >
            <Plus className="w-4 h-4" />
            + Visita ACS (Geral)
          </button>

          {(formData.clinicalData?.chronic?.hipertensao === 'Sim' ||
            formData.clinicalData?.chronic?.diabetes === 'Sim' ||
            (Array.isArray(formData.categories) && formData.categories.some((c: string) => ['Hipertenso', 'Diabético'].includes(c)))) && (
            <button
              type="button"
              onClick={() => onQuickVisit?.('cronicos', formData.visitDate || quickVisitDate || todayStr)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm active:scale-95"
              title="Registrar Visita e atualizar 1ª/2ª visita em Hipertensão/Diabetes na data selecionada"
            >
              <Activity className="w-4 h-4" />
              + Visita ACS (Comorbidades)
            </button>
          )}

          {formData.visitDate && (
            <span className="ml-auto text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Visita ({formatDate(formData.visitDate)}) Preenchida! Salve o formulário
            </span>
          )}
        </div>
      )}
    </div>
  );
}
