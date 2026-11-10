import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed select-none focus:outline-none';

    const sizeStyles = {
      xs: 'text-[12px] px-2.5 py-1 rounded-[8px] gap-1.5',
      sm: 'text-[13px] px-3.5 py-1.5 rounded-[10px] gap-1.5',
      md: 'text-[13.5px] px-4 py-2.5 rounded-[12px] gap-2',
      lg: 'text-[15px] px-6 py-3 rounded-[14px] gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-accent text-on-accent hover:bg-accent-hover font-semibold active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-accent disabled:active:scale-100 shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
      secondary:
        'bg-surface-hover text-fg hover:text-fg border border-line hover:border-accent/40 hover:bg-raised active:scale-[0.98] disabled:opacity-50',
      outline:
        'bg-transparent text-fg border border-line hover:border-accent/50 hover:text-fg active:scale-[0.98] disabled:opacity-50',
      danger:
        'bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20 active:scale-[0.98] disabled:opacity-50',
      ghost:
        'bg-transparent text-muted hover:text-fg hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50',
      subtle:
        'bg-inset text-fg hover:text-fg border border-line/60 hover:border-line active:scale-[0.98] disabled:opacity-50',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseStyles,
            sizeStyles[size],
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
