import React from 'react';
import { CheckCircle2, Baby, Smile, Bed, User, HeartPulse, Activity } from 'lucide-react';

interface CategoriesSectionProps {
  formData: any;
  setFormData: (updater: any) => void;
  isReadOnly?: boolean;
}

export function CategoriesSection({ formData, setFormData, isReadOnly }: CategoriesSectionProps) {
  const categoriesList = [
    { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
    { id: 'Criança', icon: Smile, color: 'border-green-500 text-green-500' },
    { id: 'AcamadoDomiciliado', icon: Bed, label: 'Acamado / Domiciliado', color: 'border-teal-500 text-teal-500' },
    { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
    { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
    { id: 'SaudeMental', icon: Activity, label: 'Saúde Mental', color: 'border-purple-500 text-purple-500' },
  ];

  const toggleCategory = (cat: string) => {
    setFormData((prev: any) => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter((c: string) => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  return (
    <section className="bg-bg-primary dark:bg-slate-800/50 rounded-xl p-3.5 sm:p-6 border border-border dark:border-slate-800 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle2 className="w-4 h-4" />
        <h3 className="text-xs font-semibold uppercase tracking-widest">Acompanhamentos Específicos</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {categoriesList.map((cat) => {
          const isSelected = formData.categories.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              disabled={isReadOnly}
              onClick={() => toggleCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                isSelected 
                  ? `${cat.color} bg-bg-secondary dark:bg-slate-900 shadow-sm font-semibold border-current scale-[1.02]` 
                  : 'border-border dark:border-slate-700 bg-bg-secondary dark:bg-slate-800 text-text-muted hover:border-slate-300'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <cat.icon className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-tight">{cat.label || cat.id}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
