import { describe, it, expect } from 'vitest';
import { replaceDateInClinicalData, recomputePatientLastVisitAt } from '../dateUtils';

describe('visit date rescheduling helpers', () => {
  it('replaces matching visit dates across clinical_data sections without altering unrelated dates', () => {
    const clinical = {
      visitasGerais: [
        { date: '2026-11-18', type: 'Rotina', summary: 'Visita' },
        { date: '2026-10-10', type: 'Rotina', summary: 'Anterior' }
      ],
      gestante: {
        visitasAcs: ['2026-10-01', '2026-11-18']
      },
      chronic: {
        hipertensaoData: {
          visitaAcs1: '2026-11-18',
          visitaAcs2: '2027-05-17'
        },
        diabetesData: {
          visitaAcs1: '2026-09-15',
          visitaAcs2: '2026-11-18'
        }
      }
    };

    const { updated, changed } = replaceDateInClinicalData(clinical, '2026-11-18', '2026-11-16');

    expect(changed).toBe(true);
    expect(updated.visitasGerais[0].date).toBe('2026-11-16');
    expect(updated.visitasGerais[1].date).toBe('2026-10-10');
    expect(updated.gestante.visitasAcs).toEqual(['2026-10-01', '2026-11-16']);
    expect(updated.chronic.hipertensaoData.visitaAcs1).toBe('2026-11-16');
    expect(updated.chronic.hipertensaoData.visitaAcs2).toBe('2027-05-17');
    expect(updated.chronic.diabetesData.visitaAcs1).toBe('2026-09-15');
    expect(updated.chronic.diabetesData.visitaAcs2).toBe('2026-11-16');
  });

  it('recomputes last_visit_at accurately even when a stale future date was stored on patient.last_visit_at', () => {
    const patient = {
      last_visit_at: '2026-11-18T12:00:00.000Z',
      clinical_data: {
        visitasGerais: [{ date: '2026-11-16', type: 'Rotina' }]
      }
    };

    const recomputed = recomputePatientLastVisitAt(patient, [{ date: '2026-11-16' }, { date: '2026-10-01' }]);
    expect(recomputed?.startsWith('2026-11-16')).toBe(true);
  });

  it('returns null when no visit dates remain after deletion', () => {
    const patient = {
      last_visit_at: '2026-11-18T12:00:00.000Z',
      clinical_data: {}
    };

    expect(recomputePatientLastVisitAt(patient, [])).toBeNull();
  });
});
