import { describe, it, expect } from 'vitest';
import {
  PATIENT_CATEGORIES,
  isPatientAcamado,
  isPatientDomiciliado,
  isPatientAcamadoOuDomiciliado,
  isPatientWoman,
  getPatientVisitInterval,
} from '../dateUtils';

describe('Patient Classification: Acamado, Domiciliado & Woman', () => {
  describe('Acamado vs Domiciliado distinction', () => {
    it('exposes separate ACAMADO and DOMICILIADO category constants', () => {
      expect(PATIENT_CATEGORIES.ACAMADO).toBe('Acamado');
      expect(PATIENT_CATEGORIES.DOMICILIADO).toBe('Domiciliado');
      expect(PATIENT_CATEGORIES.ACAMADO_LEGACY).toBe('AcamadoDomiciliado');
    });

    it('identifies Acamado exclusively when only Acamado is set', () => {
      const patient = { categories: ['Acamado'], clinical_data: {} };
      expect(isPatientAcamado(patient)).toBe(true);
      expect(isPatientDomiciliado(patient)).toBe(false);
      expect(isPatientAcamadoOuDomiciliado(patient)).toBe(true);
    });

    it('identifies Domiciliado exclusively when only Domiciliado is set', () => {
      const patient = { categories: ['Domiciliado'], clinical_data: {} };
      expect(isPatientAcamado(patient)).toBe(false);
      expect(isPatientDomiciliado(patient)).toBe(true);
      expect(isPatientAcamadoOuDomiciliado(patient)).toBe(true);
    });

    it('supports a patient who is both Acamado and Domiciliado', () => {
      const patient = {
        categories: ['Acamado', 'Domiciliado'],
        clinical_data: { acamadodomiciliado: { condicao: 'Acamado e Domiciliado' } },
      };
      expect(isPatientAcamado(patient)).toBe(true);
      expect(isPatientDomiciliado(patient)).toBe(true);
      expect(isPatientAcamadoOuDomiciliado(patient)).toBe(true);
    });

    it('treats legacy AcamadoDomiciliado without condicao as Acamado for backward compatibility', () => {
      const patient = { categories: ['AcamadoDomiciliado'], clinical_data: {} };
      expect(isPatientAcamado(patient)).toBe(true);
      expect(isPatientDomiciliado(patient)).toBe(false);
      expect(isPatientAcamadoOuDomiciliado(patient)).toBe(true);
    });

    it('routes legacy AcamadoDomiciliado with condicao="Domiciliado" strictly to Domiciliado', () => {
      const patient = {
        categories: ['AcamadoDomiciliado'],
        clinical_data: { acamadodomiciliado: { condicao: 'Domiciliado' } },
      };
      expect(isPatientAcamado(patient)).toBe(false);
      expect(isPatientDomiciliado(patient)).toBe(true);
      expect(isPatientAcamadoOuDomiciliado(patient)).toBe(true);
    });

    it('applies 60-day visit interval to both Acamado and Domiciliado', () => {
      expect(getPatientVisitInterval({ categories: ['Acamado'] })).toBe(60);
      expect(getPatientVisitInterval({ categories: ['Domiciliado'] })).toBe(60);
      expect(getPatientVisitInterval({ categories: ['AcamadoDomiciliado'] })).toBe(60);
      expect(getPatientVisitInterval({ categories: ['Adulto'] })).toBe(180);
    });
  });

  describe('isPatientWoman', () => {
    it('identifies female genders accurately regardless of casing/formatting', () => {
      expect(isPatientWoman({ gender: 'Feminino' })).toBe(true);
      expect(isPatientWoman({ gender: 'f' })).toBe(true);
      expect(isPatientWoman({ gender: 'Mulher' })).toBe(true);
      expect(isPatientWoman({ gender: 'Fem' })).toBe(true);
    });

    it('identifies Gestante patients as women even if gender field is missing', () => {
      expect(isPatientWoman({ categories: ['Gestante'] })).toBe(true);
    });

    it('returns false for male or unspecified patients', () => {
      expect(isPatientWoman({ gender: 'Masculino' })).toBe(false);
      expect(isPatientWoman({ gender: 'M' })).toBe(false);
      expect(isPatientWoman({})).toBe(false);
      expect(isPatientWoman(null)).toBe(false);
    });
  });
});
