import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'mint' | 'danger' | 'warning' | 'info' | 'purple' | 'neutral' | 'muted';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'mint',
  size = 'sm',
  dot = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium select-none rounded-full';

  const sizeStyles = {
    xs: 'text-[12px] px-2 py-0.5 gap-1 font-semibold',
    sm: 'text-[12.5px] px-2.5 py-1 gap-1.5 font-medium',
    md: 'text-[13.5px] px-3 py-1.5 gap-2 font-medium',
  };

  const variantStyles = {
    mint: 'bg-[#1f2c23] text-[#95b399] border border-[#95b399]/20',
    danger: 'bg-[#3b1c1c] text-[#d66767] border border-[#d66767]/20',
    warning: 'bg-[#3a321c] text-[#d6b867] border border-[#d6b867]/20',
    info: 'bg-[rgba(127,159,179,0.12)] text-[#7f9fb3] border border-[rgba(127,159,179,0.22)]',
    purple: 'bg-[rgba(163,148,192,0.12)] text-[#a394c0] border border-[rgba(163,148,192,0.22)]',
    neutral: 'bg-[#141d18] text-[#78877d] border border-[#1b261f]',
    muted: 'bg-[#0c120e] text-[#a7b3aa] border border-[#1b261f]',
  };

  const dotColors = {
    mint: 'bg-[#95b399]',
    danger: 'bg-[#d66767]',
    warning: 'bg-[#d6b867]',
    info: 'bg-[#7f9fb3]',
    purple: 'bg-[#a394c0]',
    neutral: 'bg-[#78877d]',
    muted: 'bg-[#a7b3aa]',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};
