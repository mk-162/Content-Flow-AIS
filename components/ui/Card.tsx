import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  onClick,
  padding = 'md',
}) => {
  const baseClasses = 'bg-slate-900 border border-slate-800';
  const interactiveClasses = interactive ? 'hover:border-slate-700 cursor-pointer transition-colors' : '';
  const paddingClass = paddingClasses[padding];

  if (onClick || interactive) {
    return (
      <motion.div
        whileHover={{ y: interactive ? -2 : 0 }}
        className={`${baseClasses} ${interactiveClasses} ${paddingClass} ${className}`}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseClasses} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};

// Card with header and body sections
interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 ${className}`}>
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 bg-cyan-500/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

// Stat card for dashboards
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const variantClasses = {
  default: 'bg-slate-800/50',
  primary: 'bg-cyan-500/10 border border-cyan-500/20',
  success: 'bg-emerald-500/10 border border-emerald-500/20',
  warning: 'bg-amber-500/10 border border-amber-500/20',
};

const valueColorClasses = {
  default: 'text-white',
  primary: 'text-cyan-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  variant = 'default',
}) => {
  return (
    <div className={`p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold ${valueColorClasses[variant]}`}>{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};

export default Card;
