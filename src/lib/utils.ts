import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function normalizeCategories(raw: string): string[] {
  if (!raw) return [];
  const categories: string[] = [];
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes('gestante') || normalized.includes('gravida') || normalized.includes('gestacao')) {
    categories.push('Gestante');
  }
  if (normalized.includes('crianca') || normalized.includes('bebe') || normalized.includes('infantil') || normalized.includes('pediatrico')) {
    categories.push('Criança');
  }
  if (normalized.includes('acamado') || normalized.includes('acamada')) {
    categories.push('Acamado');
  }
  if (normalized.includes('domiciliado') || normalized.includes('domiciliada')) {
    categories.push('Domiciliado');
  }
  if (normalized.includes('adulto') || normalized.includes('jovem')) {
    categories.push('Adulto');
  }
  if (normalized.includes('saude mental') || normalized.includes('psiquiatrico') || normalized.includes('psicologico')) {
    categories.push('SaudeMental');
  }
  if (normalized.includes('idoso') || normalized.includes('idosa') || normalized.includes('terceira idade') || normalized.includes('senil')) {
    categories.push('Idoso');
  }
  if (normalized.includes('hipertenso') || normalized.includes('hipertensao') || normalized.includes('pressao alta')) {
    categories.push('Hipertenso');
  }
  if (normalized.includes('diabetico') || normalized.includes('diabetica') || normalized.includes('diabetes')) {
    categories.push('Diabético');
  }

  return Array.from(new Set(categories));
}

