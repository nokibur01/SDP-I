import React from 'react';
import { Button } from './Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 sm:p-10 border border-dashed border-line rounded-[18px] bg-inset/50',
          className
        )
      )}
    >
      <div className="flex items-center gap-2.5 text-accent mb-2">
        <span className="w-5 h-5 shrink-0 text-current">{icon}</span>
        <h4 className="text-[16px] font-semibold text-fg tracking-tight">{title}</h4>
      </div>
      <p className="text-[13.5px] text-fg-2 max-w-sm leading-relaxed [text-wrap:pretty]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
