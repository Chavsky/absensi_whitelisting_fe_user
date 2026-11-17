import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5 font-semibold',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  };

  return (
    <span
      className={`inline-flex items-center tracking-tight transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
