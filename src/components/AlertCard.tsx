import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface AlertCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant: 'danger' | 'warning' | 'success';
  className?: string;
  children?: React.ReactNode;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  title,
  description,
  icon: Icon,
  variant,
  className,
  children
}) => {
  const variants = {
    danger: 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-700 dark:text-red-400',
    warning: 'bg-amber-50 dark:bg-amber-900/10 border-amber-500 text-amber-800 dark:text-amber-400',
    success: 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-800 dark:text-green-400'
  };

  const iconColors = {
    danger: 'bg-red-100 dark:bg-red-900/20 text-red-600',
    warning: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600',
    success: 'bg-green-100 dark:bg-green-900/20 text-green-600'
  };

  return (
    <div className={cn(
      "p-4 border-l-4 rounded-r-xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow",
      variants[variant],
      className
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("p-2 rounded-lg", iconColors[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold uppercase tracking-tight">{title}</p>
          <p className="text-xs mt-0.5 font-medium opacity-90">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
};
