import * as React from 'react';
import { fetchTableWithFilters } from '../lib/supabase';

export function useDashboardWeeklyChart(user: any) {
  const [weeklyChartData, setWeeklyChartData] = React.useState<{ name: string; visitas: number }[]>([]);

  const fetchWeeklyChart = React.useCallback(async () => {
    if (!user) return;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      let visitData: any[] = [];
      try {
        visitData = await fetchTableWithFilters<any>('visits', user, { select: 'date, created_at' });
      } catch (visitError) {
        console.warn('Visitas do gráfico carregadas com fallback de array vazio:', visitError);
        visitData = [];
      }

      // Build 7-day chart with real counts
      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const chartDays: { name: string; visitas: number; date: Date }[] = [];
      for (let d = 6; d >= 0; d--) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        day.setHours(0, 0, 0, 0);
        chartDays.push({ name: dayLabels[day.getDay()], visitas: 0, date: day });
      }

      (visitData || []).forEach((v: any) => {
        const rawDate = v.date || v.created_at;
        if (!rawDate) return;

        const dateStr = String(rawDate).substring(0, 10);

        if (dateStr < sevenDaysAgoStr) return;

        const vDate = new Date(dateStr + 'T00:00:00');
        const match = chartDays.find(cd =>
          cd.date.getFullYear() === vDate.getFullYear() &&
          cd.date.getMonth() === vDate.getMonth() &&
          cd.date.getDate() === vDate.getDate()
        );
        if (match) match.visitas++;
      });

      setWeeklyChartData(chartDays.map(d => ({ name: d.name, visitas: d.visitas })));
    } catch (error) {
      console.error('Error in fetchWeeklyChart:', error);
    }
  }, [user]);

  React.useEffect(() => {
    fetchWeeklyChart();
  }, [fetchWeeklyChart]);

  return {
    weeklyChartData,
    fetchWeeklyChart
  };
}
