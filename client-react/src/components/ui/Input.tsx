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
          <label htmlFor={inputId} className="text-[12.5px] font-medium text-[#d6ded8] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#78877d]">
              {leftElement}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-[#0c120e] text-[#d6ded8] text-[13.5px] rounded-[12px] border border-[#1b261f] py-2.5 px-3.5 transition-all duration-150',
                'placeholder:text-[#8a988e]',
                'focus:outline-none focus:border-[#95b399] focus:ring-1 focus:ring-[#95b399]/30',
                leftElement && 'pl-10',
                rightElement && 'pr-10',
                error && 'border-[#d66767] focus:border-[#d66767] focus:ring-[#d66767]/30',
                className
              )
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center text-[#78877d]">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[12.5px] text-[#d66767] font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-[12.5px] text-[#a7b3aa]">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
