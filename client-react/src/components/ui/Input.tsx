import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftElement, rightElement, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-fg select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-muted">
              {leftElement}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-inset text-fg text-[13.5px] rounded-[12px] border border-line py-2.5 px-3.5 transition-all duration-150',
                'placeholder:text-muted-2',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                leftElement && 'pl-10',
                rightElement && 'pr-10',
                error && 'border-danger focus:border-danger focus:ring-danger/30',
                className
              )
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center text-muted">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[13px] text-danger font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-[13px] text-fg-2">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
