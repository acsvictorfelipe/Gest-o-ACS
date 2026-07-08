import { useEffect } from 'react';
import { getAgeNumber, getAgeInMonths } from '../../../lib/dateUtils';

export function usePatientCategories(birthDate: string, setFormData: (updater: any) => void) {
  useEffect(() => {
    if (!birthDate) return;
    
    const ageNum = getAgeNumber(birthDate);
    const ageInMonths = getAgeInMonths(birthDate);
    
    setFormData((prev: any) => {
      const currentCategories = [...prev.categories];
      let changed = false;

      // Rule for Idoso (60+ years)
      if (ageNum >= 60) {
        if (!currentCategories.includes('Idoso')) {
          currentCategories.push('Idoso');
          changed = true;
        }
      } else {
        if (currentCategories.includes('Idoso')) {
          const index = currentCategories.indexOf('Idoso');
          if (index > -1) {
            currentCategories.splice(index, 1);
            changed = true;
          }
        }
      }

      // Rule for Criança (0-24 months)
      if (ageInMonths <= 24) {
        if (!currentCategories.includes('Criança')) {
          currentCategories.push('Criança');
          changed = true;
        }
        if (currentCategories.includes('Adulto')) {
          currentCategories.splice(currentCategories.indexOf('Adulto'), 1);
          changed = true;
        }
      } 
      // Rule for Adulto (24 months to 60 years)
      else if (ageNum < 60) {
        if (!currentCategories.includes('Adulto')) {
          currentCategories.push('Adulto');
          changed = true;
        }
        if (currentCategories.includes('Criança')) {
          currentCategories.splice(currentCategories.indexOf('Criança'), 1);
          changed = true;
        }
      }

      if (changed) {
        return { ...prev, categories: currentCategories };
      }
      return prev;
    });
  }, [birthDate, setFormData]);
}
