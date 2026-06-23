import * as React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPatientLastVisitAt } from '../lib/dateUtils';

interface MonitoringChartsProps {
  patients: any[];
  stats: any;
}

export const MonitoringCharts: React.FC<MonitoringChartsProps> = ({ patients, stats }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Line chart data: Visits in the last 7 days
  const lineData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(new Date()), 6 - i);
      const count = patients.filter(p => {
        const realVisitAt = getPatientLastVisitAt(p);
        if (!realVisitAt) return false;
        return isSameDay(new Date(realVisitAt), date);
      }).length;
      
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        visitas: count
      };
    });
    return last7Days;
  }, [patients]);

  // Pie chart data: Categories distribution
  const pieData = [
    { name: 'Gestantes', value: stats.gestantes, color: '#ec4899' },
    { name: 'Crianças', value: stats.criancasTotal, color: '#10b981' },
    { name: 'Idosos', value: stats.idosos, color: '#6366f1' },
    { name: 'Hipertensos', value: stats.hipertensos, color: '#f59e0b' },
    { name: 'Diabéticos', value: stats.diabeticos, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <div className="bg-bg-secondary dark:bg-slate-900/50 p-4 rounded-2xl border border-border dark:border-slate-800 shadow-sm overflow-hidden">
        <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Fluxo de Visitas (7 Dias)</h5>
        <div className="h-[200px] w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="visitas" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-bg-secondary dark:bg-slate-900/50 p-4 rounded-2xl border border-border dark:border-slate-800 shadow-sm overflow-hidden">
        <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Distribuição por Grupo</h5>
        <div className="h-[200px] w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
