import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-[12.5px] font-medium text-[#d6ded8] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full appearance-none bg-[#0c120e] text-[#d6ded8] text-[13.5px] rounded-[12px] border border-[#1b261f] py-2.5 pl-3.5 pr-10 transition-all duration-150',
                'focus:outline-none focus:border-[#95b399] focus:ring-1 focus:ring-[#95b399]/30 cursor-pointer',
                error && 'border-[#d66767] focus:border-[#d66767]',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#101713] text-[#d6ded8]">
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3.5 w-4 h-4 text-[#78877d] pointer-events-none" />
        </div>

        {error && <span className="text-[11.5px] text-[#d66767] font-medium">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';

