import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCategories(categories: string[]): string[] {
  if (!categories || !Array.isArray(categories)) return [];
  return categories.map(cat => {
    switch (cat) {
      case 'Idosos': return 'Idoso';
      case 'Acamados': return 'Acamado';
      case 'Gestantes': return 'Gestante';
      case 'Crianças (0-2 anos)': return 'Criança (0-2 anos)';
      case 'Hipertensos': return 'Hipertenso';
      case 'Diabéticos': return 'Diabético';
      default: return cat;
    }
  });
}
