import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'recessed' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#101713] border border-[#1b261f]',
    elevated: 'bg-[#16201a] border border-[#1b261f] shadow-[0_12px_32px_rgba(0,0,0,0.35)]',
    recessed: 'bg-[#0c120e] border border-[#1b261f]/60',
    interactive:
      'bg-[#101713] border border-[#1b261f] hover:border-[#95b399]/40 hover:bg-[#16201a] transition-all duration-200 cursor-pointer',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-[18px] p-5 sm:p-6 text-[#d6ded8] overflow-hidden',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('flex flex-col gap-1 pb-4', className))} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={twMerge(clsx('text-[17px] font-semibold text-[#d6ded8] tracking-tight', className))}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={twMerge(clsx('text-[13px] text-[#78877d]', className))} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => <div className={twMerge(clsx('pt-1', className))} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={twMerge(
      clsx('flex items-center justify-between pt-4 mt-4 border-t border-[#1b261f]/80', className)
    )}
    {...props}
  >
    {children}
  </div>
);

