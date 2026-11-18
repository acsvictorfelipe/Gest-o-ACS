import { describe, it, expect } from 'vitest';
import { patientFormSchema, initialDefaultValues } from '../patientSchema';

describe('patientFormSchema', () => {
  it('preserves all gestante clinical fields including avaliacaoBucal', () => {
    const input = {
      ...initialDefaultValues,
      name: 'Maria da Silva',
      birthDate: '1995-05-10',
      gender: 'Feminino',
      address: 'Rua Principal',
      number: '123',
      categories: ['Adulto', 'Gestante'],
      clinicalData: {
        ...initialDefaultValues.clinicalData,
        gestante: {
          ...initialDefaultValues.clinicalData.gestante,
          dum: '2026-01-15',
          dpp: '2026-10-22',
          consultas: ['2026-02-10', '2026-03-15'],
          visitasAcs: ['2026-02-20'],
          dtpa: 'Sim',
          avaliacaoBucal: 'Sim',
          consulta_odontologica: 'Sim',
          sifilis: 'NÃO REAGENTE',
          hiv: 'NÃO REAGENTE',
          puerperioConsulta: '2026-11-10',
          planejamentoFamiliar: 'Sim',
          notes: 'Pré-natal em acompanhamento regular'
        }
      }
    };

    const parsed = patientFormSchema.parse(input);

    expect(parsed.clinicalData.gestante.avaliacaoBucal).toBe('Sim');
    expect(parsed.clinicalData.gestante.consulta_odontologica).toBe('Sim');
    expect(parsed.clinicalData.gestante.dtpa).toBe('Sim');
    expect(parsed.clinicalData.gestante.sifilis).toBe('NÃO REAGENTE');
    expect(parsed.clinicalData.gestante.hiv).toBe('NÃO REAGENTE');
    expect(parsed.clinicalData.gestante.planejamentoFamiliar).toBe('Sim');
    expect(parsed.clinicalData.gestante.consultas).toEqual(['2026-02-10', '2026-03-15']);
    expect(parsed.clinicalData.gestante.visitasAcs).toEqual(['2026-02-20']);
    expect(parsed.clinicalData.gestante.puerperioConsulta).toBe('2026-11-10');
    expect(parsed.clinicalData.gestante.notes).toBe('Pré-natal em acompanhamento regular');
  });

  it('preserves idoso notes and extra clinical keys via passthrough', () => {
    const input = {
      ...initialDefaultValues,
      name: 'José Santos',
      birthDate: '1950-01-01',
      gender: 'Masculino',
      address: 'Av Brasil',
      number: '45',
      categories: ['Idoso'],
      clinicalData: {
        ...initialDefaultValues.clinicalData,
        idoso: {
          ...initialDefaultValues.clinicalData.idoso,
          notes: 'Acompanhamento semestral em dia'
        },
        customLegacyFlag: true
      }
    };

    const parsed = patientFormSchema.parse(input);

    expect(parsed.clinicalData.idoso.notes).toBe('Acompanhamento semestral em dia');
    expect((parsed.clinicalData as any).customLegacyFlag).toBe(true);
  });
});
