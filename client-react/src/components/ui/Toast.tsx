import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const value: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#95b399] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[#d66767] shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#d6b867] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#7f9fb3] shrink-0" />,
  };

  const borders = {
    success: 'border-[#95b399]/30 bg-[#101713]',
    error: 'border-[#d66767]/30 bg-[#101713]',
    warning: 'border-[#d6b867]/30 bg-[#101713]',
    info: 'border-[#7f9fb3]/30 bg-[#101713]',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-[14px] border shadow-[0_16px_40px_rgba(0,0,0,0.5)] ${borders[item.type]}`}
            >
              <div className="flex items-center gap-2.5">
                {icons[item.type]}
                <span className="text-[13px] text-[#d6ded8] font-medium">{item.message}</span>
              </div>
              <button
                onClick={() => removeToast(item.id)}
                className="text-[#78877d] hover:text-[#d6ded8] p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

