import React, { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '../../stores/useChatStore';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  /** Focus the field when this becomes true (panel opened) */
  autoFocus: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, autoFocus }) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Grow with content up to ~5 lines
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a new line. Ignore Enter while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const nearLimit = value.length > MAX_MESSAGE_LENGTH - 200;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-line p-3"
    >
      <div className="flex items-end gap-2 bg-inset border border-line rounded-[14px] pl-3.5 pr-1.5 py-1.5 focus-within:border-accent transition-colors">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask about tasks, events, resources…"
          aria-label="Message BatchHub Assistant"
          className="flex-1 resize-none bg-transparent text-[13.5px] text-fg placeholder:text-muted leading-relaxed py-1.5 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          title="Send (Enter)"
          className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center bg-accent text-on-accent hover:bg-accent-hover active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1 text-[12px] text-muted">
        <span>Enter to send · Shift+Enter for a new line</span>
        {nearLimit && (
          <span className={value.length >= MAX_MESSAGE_LENGTH ? 'text-danger' : undefined}>
            {value.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
};
