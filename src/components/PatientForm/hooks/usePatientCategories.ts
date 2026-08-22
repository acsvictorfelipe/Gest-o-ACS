import { useEffect } from 'react';
import { getAgeNumber, isChildAge } from '../../../lib/dateUtils';

export function usePatientCategories(birthDate: string, setFormData: (updater: any) => void, _isEdit: boolean) {
  useEffect(() => {
    if (!birthDate) return;

    const ageNum = getAgeNumber(birthDate);
    const isChild = isChildAge(birthDate);

    setFormData((prev: any) => {
      const currentCategories = Array.isArray(prev.categories) ? [...prev.categories] : [];
      let changed = false;

      // 1. Regra para Criança (0 a 24 meses exatos):
      if (isChild) {
        if (!currentCategories.includes('Criança')) {
          currentCategories.push('Criança');
          changed = true;
        }
        if (currentCategories.includes('Adulto')) {
          currentCategories.splice(currentCategories.indexOf('Adulto'), 1);
          changed = true;
        }
        if (currentCategories.includes('Idoso')) {
          currentCategories.splice(currentCategories.indexOf('Idoso'), 1);
          changed = true;
        }
      } 
      // 2. Regra ao atingir 24 meses e 1 dia ou mais (perde selo Criança e vira Adulto / Idoso):
      else {
        // Remove selo de Criança
        if (currentCategories.includes('Criança')) {
          currentCategories.splice(currentCategories.indexOf('Criança'), 1);
          changed = true;
        }

        // Se tem 60 anos ou mais: Idoso
        if (ageNum >= 60) {
          if (!currentCategories.includes('Idoso')) {
            currentCategories.push('Idoso');
            changed = true;
          }
          if (currentCategories.includes('Adulto')) {
            currentCategories.splice(currentCategories.indexOf('Adulto'), 1);
            changed = true;
          }
        } 
        // Se tem entre 24m+1d e 59 anos: Adulto
        else {
          if (!currentCategories.includes('Adulto')) {
            currentCategories.push('Adulto');
            changed = true;
          }
          if (currentCategories.includes('Idoso')) {
            currentCategories.splice(currentCategories.indexOf('Idoso'), 1);
            changed = true;
          }
        }
      }

      if (changed) {
        return { ...prev, categories: currentCategories };
      }
      return prev;
    });
  }, [birthDate, setFormData]);
}
