import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { ChatbotPanel } from './ChatbotPanel';

/**
 * BatchHub Assistant entry point: floating launcher + chat panel.
 * Mounted once in AppLayout, so it is available on every authenticated page.
 * Conversation state lives in useChatStore, so it survives page navigation.
 */
export const ChatbotLauncher: React.FC = () => {
  const { isOpen, toggle } = useChatStore();

  return (
    <>
      <ChatbotPanel />
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Close BatchHub Assistant' : 'Open BatchHub Assistant'}
        aria-expanded={isOpen}
        aria-controls="batchhub-assistant-panel"
        title="BatchHub Assistant"
        className={`fixed z-[45] bottom-5 right-5 sm:right-6 w-12 h-12 rounded-full bg-accent text-on-accent border border-accent/30 shadow-[0_6px_18px_rgba(0,0,0,0.3)] items-center justify-center hover:bg-accent-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
          isOpen ? 'hidden sm:flex' : 'flex'
        }`}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
};
