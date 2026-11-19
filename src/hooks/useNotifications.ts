import { useMemo } from 'react';
import {
  getPatientLastVisitAt,
  getVisitStatus,
  getAgeInMonths,
  isChildAge,
  VACCINE_SCHEDULE,
  getPatientVisitInterval,
  isPatientAcamadoOuDomiciliado
} from '../lib/dateUtils';

export type NotificationType =
  | 'visit_overdue'
  | 'visit_expiring'
  | 'vaccine_late'
  | 'prescription_expiring'
  | 'gestante_pending'
  | 'baby_no_visit';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  patientId: string;
  patientName: string;
  message: string;
  detail: string;
  daysInfo: number;
  category: string;
  actionRoute: string;
}

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function useNotifications(allPatients: any[]) {
  const notifications = useMemo<AppNotification[]>(() => {
    if (!allPatients || allPatients.length === 0) return [];

    const result: AppNotification[] = [];

    const activePatients = allPatients.filter(
      (p) => !p.clinical_data?.obito?.flg_obito
    );

    for (const p of activePatients) {
      const clinical = p.clinical_data || {};
      const categories: string[] = p.categories || [];
      const mainCategory = categories[0] || 'Cidadão';
      const lastVisitStr = getPatientLastVisitAt(p);
      const visitStatus = getVisitStatus(lastVisitStr, p);
      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;

      const isGestante = categories.includes('Gestante');
      const isChronic = clinical.chronic?.diabetes === 'Sim' || 
                        clinical.chronic?.hipertensao === 'Sim' || 
                        clinical.adulto?.diabetes === 'Sim' || 
                        clinical.adulto?.hipertensao === 'Sim' || 
                        clinical.idoso?.diabetes === 'Sim' || 
                        clinical.idoso?.hipertensao === 'Sim';

      // ── 1. Visita Atrasada (overdue) ──────────────────────────
      if (visitStatus.status === 'overdue') {
        const daysOverdue = Math.abs(visitStatus.daysRemaining);
        const priority: NotificationPriority =
          daysOverdue > 15 ? 'critical' : 'high';

        let msg = `Visita atrasada há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`;
        let detail = `Intervalo: ${visitStatus.interval} dias • Última visita há ${visitStatus.daysSinceVisit} dias`;

        if (isGestante) {
          msg = `Visita da gestante em atraso há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`;
          detail = `Passou de 60 dias da última visita (Meta: mín. 3 visitas ACS no pré-natal)`;
        } else if (isChronic) {
          msg = `Visita semestral pendente há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`;
          detail = `Hipertensão / Diabetes (Meta: 2 visitas anuais • D+180)`;
        }

        result.push({
          id: `visit_overdue_${p.id}`,
          type: 'visit_overdue',
          priority,
          patientId: p.id,
          patientName: p.name,
          message: msg,
          detail,
          daysInfo: daysOverdue,
          category: mainCategory,
          actionRoute: `/editar-paciente/${p.id}`,
        });
      }

      // ── 2. Visita Próxima de Expirar (expiring) ───────────────
      if (visitStatus.status === 'expiring') {
        let msg = `Visita expira em ${visitStatus.daysRemaining} dia${visitStatus.daysRemaining !== 1 ? 's' : ''}`;
        let detail = `Intervalo: ${visitStatus.interval} dias • Última visita há ${visitStatus.daysSinceVisit} dias`;

        if (isGestante) {
          msg = `Visita da gestante expira em ${visitStatus.daysRemaining} dia${visitStatus.daysRemaining !== 1 ? 's' : ''}`;
          detail = `Última visita há ${visitStatus.daysSinceVisit} dias (Limite: 60 dias)`;
        } else if (isChronic) {
          msg = `Visita semestral expira em ${visitStatus.daysRemaining} dia${visitStatus.daysRemaining !== 1 ? 's' : ''}`;
          detail = `Hipertensão / Diabetes (Meta: 2 visitas anuais • D+180)`;
        } else if (categories.includes('Criança') && ageInMonths >= 5 && ageInMonths < 6) {
          msg = `Visita do 6º Mês recomendada`;
          detail = `Criança completando 6 meses de vida (Marco de puericultura)`;
        }

        result.push({
          id: `visit_expiring_${p.id}`,
          type: 'visit_expiring',
          priority: visitStatus.daysRemaining <= 5 ? 'high' : 'medium',
          patientId: p.id,
          patientName: p.name,
          message: msg,
          detail,
          daysInfo: visitStatus.daysRemaining,
          category: mainCategory,
          actionRoute: `/editar-paciente/${p.id}`,
        });
      }

      // ── 3. Visita Nunca Registrada ────────────────────────────
      if (visitStatus.status === 'never') {
        let msg = 'Nenhuma visita registrada';
        let detail = `Intervalo exigido: ${visitStatus.interval} dias`;

        if (categories.includes('Criança') && ageInMonths <= 1) {
          msg = 'Visita do 1º Mês (30 dias) pendente';
          detail = 'Primeira visita de acompanhamento do recém-nascido';
        } else if (isGestante) {
          msg = 'Primeira visita da gestante pendente';
          detail = 'Cadastrada sem visita ACS registrada no pré-natal';
        }

        result.push({
          id: `visit_overdue_${p.id}`,
          type: 'visit_overdue',
          priority: 'critical',
          patientId: p.id,
          patientName: p.name,
          message: msg,
          detail,
          daysInfo: 999,
          category: mainCategory,
          actionRoute: `/editar-paciente/${p.id}`,
        });
      }

      // ── 4. Vacinas Atrasadas (criança ≤24 meses) ─────────────
      if (categories.includes('Criança') && isChildAge(p.birth_date)) {
        const vacinas = clinical.crianca?.vacinas || {};
        const pendingVaccines: string[] = [];
        VACCINE_SCHEDULE.forEach((group) => {
          if (group.age <= ageInMonths) {
            group.vaccines.forEach((v) => {
              if (vacinas[v.id] !== 'Sim') {
                pendingVaccines.push(v.label);
              }
            });
          }
        });

        if (pendingVaccines.length > 0) {
          result.push({
            id: `vaccine_late_${p.id}`,
            type: 'vaccine_late',
            priority: pendingVaccines.length >= 3 ? 'critical' : 'high',
            patientId: p.id,
            patientName: p.name,
            message: `${pendingVaccines.length} vacina${pendingVaccines.length !== 1 ? 's' : ''} pendente${pendingVaccines.length !== 1 ? 's' : ''}`,
            detail: pendingVaccines.slice(0, 4).join(', ') + (pendingVaccines.length > 4 ? ` +${pendingVaccines.length - 4}` : ''),
            daysInfo: pendingVaccines.length,
            category: 'Criança',
            actionRoute: `/editar-paciente/${p.id}`,
          });
        }
      }

      // ── 5. Receitas Vencendo (Saúde Mental / Acamado / Domiciliado) ────────
      const isMentalOrAcamado =
        categories.includes('SaudeMental') ||
        categories.includes('Saúde Mental') ||
        isPatientAcamadoOuDomiciliado(p);

      if (isMentalOrAcamado) {
        const recipes = clinical.receitas || [];
        if (recipes.length > 0) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          for (const rec of recipes) {
            if (!rec.dataVencimento) continue;
            const dateVencimento = new Date(rec.dataVencimento + 'T00:00:00');
            if (isNaN(dateVencimento.getTime())) continue;

            const diffMs = dateVencimento.getTime() - hoje.getTime();
            const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry <= 15) {
              const isExpired = daysUntilExpiry < 0;
              result.push({
                id: `prescription_${p.id}_${rec.dataVencimento}`,
                type: 'prescription_expiring',
                priority: isExpired ? 'critical' : daysUntilExpiry <= 5 ? 'high' : 'medium',
                patientId: p.id,
                patientName: p.name,
                message: isExpired
                  ? `Receita vencida há ${Math.abs(daysUntilExpiry)} dia${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''}`
                  : `Receita vence em ${daysUntilExpiry} dia${daysUntilExpiry !== 1 ? 's' : ''}`,
                detail: rec.medicamento || 'Medicamento controlado',
                daysInfo: isExpired ? Math.abs(daysUntilExpiry) : daysUntilExpiry,
                category: mainCategory,
                actionRoute: `/editar-paciente/${p.id}`,
              });
            }
          }
        }
      }

      // ── 6. (Alertas de Gestantes concentrados exclusivamente em: sem visita nenhuma ou >60 dias) ──

      // ── 7. Bebê ≤6 meses: Marcos de 1º e 6º Mês ───────────────
      if (categories.includes('Criança') && ageInMonths <= 6) {
        const is30dHandled = Boolean(clinical.crianca?.visita30dias) || 
                             Boolean(clinical.crianca?.visita30diasNaoRealizada) ||
                             Boolean(lastVisitStr);
        const is6mHandled = Boolean(clinical.crianca?.visita6meses) || 
                            Boolean(clinical.crianca?.visita6mesesNaoRealizada);

        if (!is30dHandled && ageInMonths <= 1) {
          const alreadyInList = result.some(n => n.patientId === p.id && n.type === 'baby_no_visit');
          if (!alreadyInList) {
            result.push({
              id: `baby_30d_${p.id}`,
              type: 'baby_no_visit',
              priority: 'high',
              patientId: p.id,
              patientName: p.name,
              message: 'Visita do 1º Mês (30 dias) pendente',
              detail: 'Primeira visita de acompanhamento do recém-nascido',
              daysInfo: 30,
              category: 'Criança',
              actionRoute: `/editar-paciente/${p.id}`,
            });
          }
        } else if (!is6mHandled && ageInMonths >= 5 && ageInMonths <= 6) {
          const alreadyInList = result.some(n => n.patientId === p.id && (n.type === 'visit_expiring' || n.type === 'baby_no_visit'));
          if (!alreadyInList) {
            result.push({
              id: `baby_6m_${p.id}`,
              type: 'visit_expiring',
              priority: 'medium',
              patientId: p.id,
              patientName: p.name,
              message: 'Visita do 6º Mês recomendada',
              detail: `Bebê com ${ageInMonths} meses (Marco de puericultura)`,
              daysInfo: 15,
              category: 'Criança',
              actionRoute: `/editar-paciente/${p.id}`,
            });
          }
        }
      }
    }

    // Ordenar: critical → high → medium → low, desempate por daysInfo
    result.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.type.includes('expiring') && b.type.includes('expiring')) {
        return a.daysInfo - b.daysInfo;
      }
      return b.daysInfo - a.daysInfo;
    });

    return result;
  }, [allPatients]);

  const counts = useMemo(() => {
    const c = {
      total: notifications.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byType: {
        visit_overdue: 0,
        visit_expiring: 0,
        vaccine_late: 0,
        prescription_expiring: 0,
        gestante_pending: 0,
        baby_no_visit: 0,
      } as Record<NotificationType, number>,
    };
    notifications.forEach((n) => {
      c[n.priority]++;
      c.byType[n.type]++;
    });
    return c;
  }, [notifications]);

  return { notifications, counts };
}
