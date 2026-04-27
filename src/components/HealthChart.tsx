import * as React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Card } from './Card';

interface HealthChartProps {
  data: {
    gestantes: number;
    criancas: number;
    idosos: number;
    diabeticos: number;
    hipertensos: number;
    adultos: number;
  };
}

export const HealthChart: React.FC<HealthChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Gestantes', value: data.gestantes, color: '#3B82F6' }, // blue-500
    { name: 'Crianças', value: data.criancas, color: '#10B981' }, // emerald-500
    { name: 'Adultos', value: data.adultos, color: '#6366F1' }, // indigo-500
    { name: 'Idosos', value: data.idosos, color: '#EF4444' }, // red-500
    { name: 'Diabéticos', value: data.diabeticos, color: '#8B5CF6' }, // purple-500
    { name: 'Hipertensos', value: data.hipertensos, color: '#F59E0B' }, // amber-500
  ];

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 text-center">Proporção por Grupo</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
