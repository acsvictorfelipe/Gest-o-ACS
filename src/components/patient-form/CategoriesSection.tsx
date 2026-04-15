import React from 'react';
import { Baby, Smile, Bed, User, HeartPulse, Activity } from 'lucide-react';
import { PatientFormData } from '../../types/patient';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

const categoriesDef = [
  { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
  { id: 'Criança', icon: Smile, color: 'border-green-500 text-green-500' },
  { id: 'AcamadoDomiciliado', icon: Bed, label: 'Acamado / Domiciliado', color: 'border-teal-500 text-teal-500' },
  { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
  { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
  { id: 'SaudeMental', icon: Activity, label: 'Saúde Mental', color: 'border-purple-500 text-purple-500' },
];

export function CategoriesSection({ formData, setFormData }: Props) {
  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  return (
    <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-8 bg-primary rounded-full"></div>
        <h3 className="text-xl font-bold text-primary font-headline">Condições e Acompanhamentos</h3>
      </div>
      
      <p className="text-sm text-slate-500 mb-6 font-medium">Selecione as condições aplicáveis para abrir as fichas específicas (Você pode selecionar várias):</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categoriesDef.map(cat => {
          const isSelected = formData.categories.includes(cat.id);
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                isSelected 
                  ? `${cat.color} bg-white shadow-md scale-105` 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:border-slate-200'
              }`}
            >
              <div className={`p-3 rounded-full ${isSelected ? 'bg-current opacity-10' : 'bg-white dark:bg-slate-700 shadow-sm'}`}>
                <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest text-center ${isSelected ? '' : 'text-slate-500'}`}>
                {cat.label || cat.id}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
