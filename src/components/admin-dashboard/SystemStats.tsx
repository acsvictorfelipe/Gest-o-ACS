import * as React from 'react';
import { Users, UserCheck, MapPin, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface SystemStatsProps {
  activeAgentsCount: number;
  totalGestoresCount: number;
  patientsCount: number;
  householdsCount: number;
  totalVisitsCount: number;
  visitLogsCount: number;
}

export function SystemStats({
  activeAgentsCount,
  totalGestoresCount,
  patientsCount,
  householdsCount,
  totalVisitsCount,
  visitLogsCount
}: SystemStatsProps) {
  const statsConfig = [
    {
      title: "Agentes Ativos",
      value: activeAgentsCount,
      subtech: `${totalGestoresCount} Gestores / Admins`,
      icon: Users,
      color: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
    },
    {
      title: "Cidadãos Assistidos",
      value: patientsCount,
      subtech: `Total na rede municipal`,
      icon: UserCheck,
      color: "border-sky-500/20 text-sky-600 dark:text-sky-400 bg-sky-500/5"
    },
    {
      title: "Domicílios Cadastrados",
      value: householdsCount,
      subtech: `Mapeados geograficamente`,
      icon: MapPin,
      color: "border-indigo-500/20 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5"
    },
    {
      title: "Visitas no Sistema",
      value: totalVisitsCount,
      subtech: `${visitLogsCount} este período`,
      icon: Calendar,
      color: "border-purple-500/20 text-purple-600 dark:text-purple-400 bg-purple-500/5"
    },
  ];

  return (
    <div id="admin-system-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statsConfig.map((item, i) => (
        <motion.div
          key={i}
          id={`system-stat-card-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`p-6 rounded-[28px] bg-bg-secondary border shadow-sm flex items-center justify-between transition-all hover:shadow-md ${item.color.split(' ')[0]}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{item.title}</span>
            <h4 className="text-[28px] font-black text-text-primary leading-none">{item.value}</h4>
            <p className="text-[11px] text-text-secondary font-semibold">{item.subtech}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.color.split(' ')[2]}`}>
            <item.icon className="w-6 h-6" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
