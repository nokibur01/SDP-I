import React from 'react';

export const TypingIndicator: React.FC = () => (
  <div className="flex items-start" role="status" aria-live="polite">
    <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] bg-inset border border-line">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
          />
        ))}
      </span>
      <span className="text-[12.5px] text-muted">Thinking…</span>
    </div>
  </div>
);
