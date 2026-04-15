import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FileText, Trash2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { usePatientForm } from '../hooks/usePatientForm';
import { generatePatientPDF } from '../lib/patientPdf';

import { IdentificationSection } from './patient-form/IdentificationSection';
import { VisitSection } from './patient-form/VisitSection';
import { CategoriesSection } from './patient-form/CategoriesSection';
import { ChronicSection } from './patient-form/ChronicSection';
import { RastreamentoSection, SaudeMentalSection } from './patient-form/RastreamentoSection';
import { AcamadoSection } from './patient-form/AcamadoSection';
import { CriancaSection } from './patient-form/CriancaSection';
import { GestanteSection } from './patient-form/GestanteSection';
import { AdultoIdosoSection } from './patient-form/AdultoIdosoSection';

export function PatientForm({ user }: { user: any }) {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const {
    id,
    formData,
    setFormData,
    loading,
    deleting,
    handleSubmit,
    handleDelete
  } = usePatientForm(user);

  const addDateToList = (category: string, list: string) => {
    setFormData(prev => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        [category]: {
          ...prev.clinicalData[category as keyof typeof prev.clinicalData] as any,
          [list]: [...(prev.clinicalData[category as keyof typeof prev.clinicalData] as any)?.[list] || [], '']
        }
      }
    }));
  };

  const removeDateFromList = (category: string, list: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        [category]: {
          ...prev.clinicalData[category as keyof typeof prev.clinicalData] as any,
          [list]: ((prev.clinicalData[category as keyof typeof prev.clinicalData] as any)?.[list] || []).filter((_: any, i: number) => i !== index)
        }
      }
    }));
  };

  const updateDateInList = (category: string, list: string, index: number, value: any) => {
    setFormData(prev => {
      const newList = [...((prev.clinicalData[category as keyof typeof prev.clinicalData] as any)?.[list] || [])];
      newList[index] = value;
      return {
        ...prev,
        clinicalData: {
          ...prev.clinicalData,
          [category]: {
            ...prev.clinicalData[category as keyof typeof prev.clinicalData] as any,
            [list]: newList
          }
        }
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500 relative">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-on-surface font-headline mb-4">
          {id ? 'Editar Ficha Individual' : 'Nova Ficha Individual'}
        </h2>
        <p className="text-slate-500 font-medium">
          Preencha os dados esus e acompanhamentos do paciente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <IdentificationSection formData={formData} setFormData={setFormData} />
        
        <VisitSection id={id} formData={formData} setFormData={setFormData} />

        <RastreamentoSection formData={formData} setFormData={setFormData} />

        <CategoriesSection formData={formData} setFormData={setFormData} />

        <SaudeMentalSection formData={formData} setFormData={setFormData} />

        {formData.categories.some(c => ['AcamadoDomiciliado', 'Gestante', 'Adulto', 'Idoso'].includes(c)) && (
          <ChronicSection formData={formData} setFormData={setFormData} />
        )}

        <div className="space-y-8">
          <AcamadoSection formData={formData} setFormData={setFormData} />
          
          <GestanteSection 
            formData={formData} 
            setFormData={setFormData}
            addDateToList={addDateToList}
            updateDateInList={updateDateInList}
            removeDateFromList={removeDateFromList}
          />
          
          <CriancaSection 
            formData={formData} 
            setFormData={setFormData} 
            addDateToList={addDateToList}
            updateDateInList={updateDateInList}
          />
          
          {formData.categories.map(catId => (
            <AdultoIdosoSection key={catId} catId={catId} formData={formData} setFormData={setFormData} />
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 pb-20">
          {id && (
            <button 
              type="button"
              onClick={() => generatePatientPDF(formData)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
            >
              <FileText className="w-5 h-5" />
              Gerar PDF
            </button>
          )}
          {id && (
            <button 
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="mr-auto flex items-center gap-2 px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
              Excluir Cadastro
            </button>
          )}
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="px-8 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {id ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-on-surface font-headline">Excluir Cadastro?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação é irreversível. Todos os dados deste paciente e seu histórico de visitas serão removidos permanentemente.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => { handleDelete(); setDeleteConfirm(false); }}
                  disabled={deleting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
