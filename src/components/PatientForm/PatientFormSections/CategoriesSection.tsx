import React from 'react';
import { CheckCircle2, Baby, Smile, Bed, Home, User, HeartPulse, Activity } from 'lucide-react';

interface CategoriesSectionProps {
  formData: any;
  setFormData: (updater: any) => void;
  isReadOnly?: boolean;
}

export function CategoriesSection({ formData, setFormData, isReadOnly }: CategoriesSectionProps) {
  const categoriesList = [
    { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
    { id: 'Criança', icon: Smile, color: 'border-green-500 text-green-500' },
    { id: 'Acamado', icon: Bed, label: 'Acamado', color: 'border-slate-600 text-slate-700 dark:text-slate-300' },
    { id: 'Domiciliado', icon: Home, label: 'Domiciliado', color: 'border-sky-500 text-sky-600 dark:text-sky-400' },
    { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
    { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
    { id: 'SaudeMental', icon: Activity, label: 'Saúde Mental', color: 'border-purple-500 text-purple-500' },
  ];

  const isCategorySelected = (catId: string) => {
    const cats: string[] = Array.isArray(formData.categories) ? formData.categories : [];
    if (cats.includes(catId)) return true;
    const cond = formData.clinicalData?.acamadodomiciliado?.condicao;
    if (catId === 'Acamado' && cats.includes('AcamadoDomiciliado') && cond !== 'Domiciliado') return true;
    if (catId === 'Domiciliado' && cats.includes('AcamadoDomiciliado') && (cond === 'Domiciliado' || cond === 'Acamado e Domiciliado')) return true;
    return false;
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev: any) => {
      let currentCats: string[] = Array.isArray(prev.categories) ? [...prev.categories] : [];
      const currentCond = prev.clinicalData?.acamadodomiciliado?.condicao;

      // Expand legacy 'AcamadoDomiciliado' before toggling so user can uncheck or separate cleanly
      if (currentCats.includes('AcamadoDomiciliado')) {
        currentCats = currentCats.filter((c: string) => c !== 'AcamadoDomiciliado');
        if (currentCond === 'Domiciliado') {
          if (!currentCats.includes('Domiciliado')) currentCats.push('Domiciliado');
        } else if (currentCond === 'Acamado e Domiciliado') {
          if (!currentCats.includes('Acamado')) currentCats.push('Acamado');
          if (!currentCats.includes('Domiciliado')) currentCats.push('Domiciliado');
        } else {
          if (!currentCats.includes('Acamado')) currentCats.push('Acamado');
        }
      }

      const nextCats = currentCats.includes(cat)
        ? currentCats.filter((c: string) => c !== cat)
        : [...currentCats, cat];

      if (cat === 'Acamado' || cat === 'Domiciliado') {
        const hasAcamado = nextCats.includes('Acamado');
        const hasDomiciliado = nextCats.includes('Domiciliado');
        let nextCond = prev.clinicalData?.acamadodomiciliado?.condicao || 'Acamado';
        if (hasAcamado && hasDomiciliado) nextCond = 'Acamado e Domiciliado';
        else if (hasAcamado) nextCond = 'Acamado';
        else if (hasDomiciliado) nextCond = 'Domiciliado';

        return {
          ...prev,
          categories: nextCats,
          clinicalData: {
            ...prev.clinicalData,
            acamadodomiciliado: {
              ...(prev.clinicalData?.acamadodomiciliado || {}),
              condicao: nextCond
            }
          }
        };
      }

      return {
        ...prev,
        categories: nextCats
      };
    });
  };

  return (
    <section className="bg-bg-primary dark:bg-slate-800/50 rounded-xl p-3.5 sm:p-6 border border-border dark:border-slate-800 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle2 className="w-4 h-4" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Acompanhamentos Específicos</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {categoriesList.map((cat) => {
          const isSelected = isCategorySelected(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              disabled={isReadOnly}
              onClick={() => toggleCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                isSelected 
                  ? `${cat.color} bg-white dark:bg-slate-900 shadow-sm font-bold border-current scale-[1.02]` 
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400 font-bold'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <cat.icon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">{cat.label || cat.id}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
