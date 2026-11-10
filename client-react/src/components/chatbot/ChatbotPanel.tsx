import React, { useEffect, useRef } from 'react';
import { Bot, Minus, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

const STARTER_PROMPTS = [
  'What are my upcoming tasks?',
  'What events are coming up?',
  'Show me the latest announcements.',
  'What resources are available?',
];

export const ChatbotPanel: React.FC = () => {
  const { isOpen, messages, isSending, error, close, send, retry, clear } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending, error, isOpen]);

  // Escape closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const firstName = user?.name ? user.name.split(' ')[0] : null;
  const canRetry = messages.some((m) => m.role === 'user' && m.failed);

  return (
    <section
      id="batchhub-assistant-panel"
      role="dialog"
      aria-label="BatchHub Assistant"
      className="fixed z-[45] bottom-0 right-0 sm:bottom-24 sm:right-6 w-full sm:w-[380px] h-[100dvh] sm:h-[560px] sm:max-h-[calc(100dvh-8rem)] flex flex-col bg-surface border border-line sm:rounded-[18px] shadow-[0_16px_40px_rgba(0,0,0,0.35)] overflow-hidden chat-panel-enter"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-accent-soft border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Bot className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-fg leading-tight truncate">BatchHub Assistant</h2>
            <p className="flex items-center gap-1.5 text-[12px] text-muted leading-tight mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              disabled={isSending}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="p-2 rounded-[10px] text-fg-2 hover:text-danger hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={close}
            title="Minimize"
            aria-label="Minimize assistant"
            className="p-2 rounded-[10px] text-fg-2 hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center">
            <p className="text-[15px] font-semibold text-fg">
              Hi{firstName ? `, ${firstName}` : ''} — how can I help?
            </p>
            <p className="text-[13px] text-muted mt-1 leading-relaxed">
              I can look up your tasks, events, announcements, resources, projects and batch members.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={isSending}
                  className="text-left px-3.5 py-2.5 rounded-[12px] bg-inset border border-line text-[13px] text-fg-2 hover:text-fg hover:border-accent/40 hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}

        {isSending && <TypingIndicator />}

        {error && !isSending && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-[12px] bg-danger-soft border border-danger/30 text-[13px] text-fg"
          >
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p>{error}</p>
              {canRetry && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-danger/40 text-[12.5px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={send} disabled={isSending} autoFocus={isOpen} />
    </section>
  );
};
