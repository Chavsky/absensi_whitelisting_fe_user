import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'interactive';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-slate-200/90 shadow-xs rounded-2xl',
    subtle: 'bg-slate-50/70 border border-slate-200/60 rounded-2xl',
    interactive: 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-2xl transition-all duration-150 active:scale-[0.99]',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
