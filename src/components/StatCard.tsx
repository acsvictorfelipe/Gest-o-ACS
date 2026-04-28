import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'bg-primary',
  className
}) => {
  // Extract background and text color from the color prop if it's a standard bg- class
  // For simplicity, we'll assume the user passes a base color class and we'll apply opacity/variants
  // However, the instructions say "ícone com fundo suave (bg-opacity)"
  
  return (
    <Card className={cn("p-6 flex items-center justify-between group", className)}>
      <div className="relative z-10">
        <p className="text-xs uppercase text-text-muted font-bold tracking-wider mb-1">{label}</p>
        <h4 className="text-3xl font-bold text-text-primary dark:text-white">{value}</h4>
      </div>
      <div className={cn(
        "relative z-10 p-3 rounded-xl transition-colors duration-300",
        color.includes('bg-') ? color : 'bg-primary/10 text-primary',
        "bg-opacity-10 dark:bg-opacity-20"
      )}>
        <Icon className="w-6 h-6" />
      </div>
    </Card>
  );
};
