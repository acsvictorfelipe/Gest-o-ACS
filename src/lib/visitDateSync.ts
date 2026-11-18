import { replaceDateInClinicalData, recomputePatientLastVisitAt } from './dateUtils';

export interface PatientVisitDateChange {
  patientId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Sincroniza `patients.last_visit_at` e ocorrências em `patients.clinical_data`
 * após alteração de data ou exclusão de registros na tabela `visits`.
 */
export async function syncAffectedPatientsAfterVisitDateChange(
  supabaseClient: any,
  changes: PatientVisitDateChange[]
): Promise<{ updatedPatients: number; errors: string[] }> {
  const grouped = new Map<string, Array<{ fromDate?: string; toDate?: string }>>();

  for (const item of changes) {
    if (!item?.patientId) continue;
    const list = grouped.get(item.patientId) || [];
    list.push({ fromDate: item.fromDate, toDate: item.toDate });
    grouped.set(item.patientId, list);
  }

  let updatedPatients = 0;
  const errors: string[] = [];

  for (const [patientId, datePairs] of grouped.entries()) {
    try {
      const [{ data: patientRow, error: pErr }, { data: dbVisits, error: vErr }] = await Promise.all([
        supabaseClient
          .from('patients')
          .select('id, clinical_data, last_visit_at')
          .eq('id', patientId)
          .maybeSingle(),
        supabaseClient
          .from('visits')
          .select('date')
          .eq('patient_id', patientId),
      ]);

      if (pErr) throw pErr;
      if (vErr) throw vErr;
      if (!patientRow) continue;

      let nextClinical = patientRow.clinical_data;
      let clinicalChanged = false;

      for (const pair of datePairs) {
        if (pair.fromDate && pair.toDate && pair.fromDate.split('T')[0] !== pair.toDate.split('T')[0]) {
          const res = replaceDateInClinicalData(nextClinical, pair.fromDate, pair.toDate);
          if (res.changed) {
            nextClinical = res.updated;
            clinicalChanged = true;
          }
        }
      }

      const nextLastVisitAt = recomputePatientLastVisitAt(
        { ...patientRow, clinical_data: nextClinical },
        dbVisits || []
      );

      const updatePayload: Record<string, any> = {
        last_visit_at: nextLastVisitAt,
      };
      if (clinicalChanged) {
        updatePayload.clinical_data = nextClinical;
      }

      const { error: uErr } = await supabaseClient
        .from('patients')
        .update(updatePayload)
        .eq('id', patientId);

      if (uErr) throw uErr;
      updatedPatients += 1;
    } catch (err: any) {
      errors.push(`${patientId}: ${err?.message || String(err)}`);
    }
  }

  return { updatedPatients, errors };
}
