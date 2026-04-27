import * as React from 'react';
import { cn } from '../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  className,
  ...props 
}) => {
  const variants = {
    default: 'bg-[#1A2038] text-slate-400 border border-[#1E293B]',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-tight",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
