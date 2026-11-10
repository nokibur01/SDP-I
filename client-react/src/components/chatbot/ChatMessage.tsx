import React from 'react';
import { AlertCircle, Database } from 'lucide-react';
import type { ChatMessageItem } from '../../stores/useChatStore';

/**
 * Render the assistant's lightweight Markdown (bold, inline code, links, lists)
 * as React elements. Nothing is injected as HTML, so model output cannot run scripts.
 */
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="px-1 py-0.5 rounded bg-inset border border-line text-[12.5px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const mdLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    const href = mdLink ? mdLink[2] : /^https?:\/\//.test(part) ? part : null;
    if (href) {
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent-hover break-all"
        >
          {mdLink ? mdLink[1] : part}
        </a>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });

const renderMarkdown = (content: string): React.ReactNode[] => {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const key = `list-${blocks.length}`;
    const items = list.items.map((item, i) => <li key={i}>{renderInline(item, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key} className="list-decimal pl-5 space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc pl-5 space-y-1">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  content.split('\n').forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet || numbered)![1]);
      return;
    }

    flushList();
    if (line.trim() === '') return;

    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const key = `p-${blocks.length}`;
    blocks.push(
      heading ? (
        <p key={key} className="font-semibold text-fg">
          {renderInline(heading[1], key)}
        </p>
      ) : (
        <p key={key}>{renderInline(line, key)}</p>
      ),
    );
  });
  flushList();
  return blocks;
};

export const ChatMessage: React.FC<{ message: ChatMessageItem }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className={`max-w-[85%] px-3.5 py-2 rounded-[14px] rounded-br-[4px] text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${
            message.failed
              ? 'bg-danger-soft text-fg border border-danger/30'
              : 'bg-accent text-on-accent'
          }`}
        >
          {message.content}
        </div>
        {message.failed && (
          <span className="inline-flex items-center gap-1 text-[12px] text-danger">
            <AlertCircle className="w-3 h-3" />
            Not sent
          </span>
        )}
      </div>
    );
  }

  const sources = message.sources ?? [];
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="max-w-[90%] px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] bg-inset border border-line text-[13.5px] leading-relaxed text-fg-2 space-y-2 break-words">
        {renderMarkdown(message.content)}
      </div>
      {sources.length > 0 && (
        <span
          className="inline-flex items-center gap-1 text-[12px] text-muted pl-1"
          title="This answer was built from your live BatchHub data"
        >
          <Database className="w-3 h-3 text-icon" />
          From BatchHub: {sources.join(', ')}
        </span>
      )}
    </div>
  );
};
