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
    xs: 'text-[13px] px-2 py-0.5 gap-1 font-semibold',
    sm: 'text-[13px] px-2.5 py-1 gap-1.5 font-medium',
    md: 'text-[13.5px] px-3 py-1.5 gap-2 font-medium',
  };

  const variantStyles = {
    mint: 'bg-accent-soft text-accent border border-accent/20',
    danger: 'bg-danger-soft text-danger border border-danger/20',
    warning: 'bg-warning-soft text-warning border border-warning/20',
    info: 'bg-info/12 text-info border border-info/22',
    purple: 'bg-lilac/12 text-lilac border border-lilac/22',
    neutral: 'bg-surface-hover text-muted border border-line',
    muted: 'bg-inset text-fg-2 border border-line',
  };

  const dotColors = {
    mint: 'bg-accent',
    danger: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info',
    purple: 'bg-lilac',
    neutral: 'bg-muted',
    muted: 'bg-fg-2',
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
