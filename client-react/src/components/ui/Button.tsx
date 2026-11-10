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
      xs: 'text-[11px] px-2.5 py-1 rounded-[8px] gap-1.5',
      sm: 'text-[12.5px] px-3.5 py-1.5 rounded-[10px] gap-1.5',
      md: 'text-[13.5px] px-4 py-2.5 rounded-[12px] gap-2',
      lg: 'text-[15px] px-6 py-3 rounded-[14px] gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-[#95b399] text-[#090e0b] hover:bg-[#839f87] font-semibold active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-[#95b399] disabled:active:scale-100 shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
      secondary:
        'bg-[#141d18] text-[#d6ded8] hover:text-[#d6ded8] border border-[#1b261f] hover:border-[#95b399]/40 hover:bg-[#16201a] active:scale-[0.98] disabled:opacity-50',
      outline:
        'bg-transparent text-[#d6ded8] border border-[#1b261f] hover:border-[#95b399]/50 hover:text-[#d6ded8] active:scale-[0.98] disabled:opacity-50',
      danger:
        'bg-[rgba(214,103,103,0.12)] text-[#d66767] border border-[rgba(214,103,103,0.3)] hover:bg-[rgba(214,103,103,0.2)] active:scale-[0.98] disabled:opacity-50',
      ghost:
        'bg-transparent text-[#78877d] hover:text-[#d6ded8] hover:bg-[#141d18] active:scale-[0.98] disabled:opacity-50',
      subtle:
        'bg-[#0c120e] text-[#d6ded8] hover:text-[#d6ded8] border border-[#1b261f]/60 hover:border-[#1b261f] active:scale-[0.98] disabled:opacity-50',
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
