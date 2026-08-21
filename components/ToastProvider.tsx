'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  warning: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    setToasts((prev) => {
      // Prevent duplicate toasts with the exact same message and type
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }

      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Auto-dismiss ONLY positive/neutral feedback toasts (success, info in 5 seconds)
      // Error and Warning toasts remain persistent until the user manually reviews and dismisses them
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          removeToast(id);
        }, 5000);
      }

      return [...prev, { id, type, message, action }];
    });
  }, [removeToast]);

  const success = useCallback((msg: string, act?: ToastAction) => showToast(msg, 'success', act), [showToast]);
  const error = useCallback((msg: string, act?: ToastAction) => showToast(msg, 'error', act), [showToast]);
  const warning = useCallback((msg: string, act?: ToastAction) => showToast(msg, 'warning', act), [showToast]);
  const info = useCallback((msg: string, act?: ToastAction) => showToast(msg, 'info', act), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((item) => {
          let typeStyles = 'border-slate-300 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-zinc-100';
          let IconComponent = Info;
          let iconColor = 'text-sky-500';

          if (item.type === 'success') {
            typeStyles = 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-600 dark:text-emerald-400';
          } else if (item.type === 'error') {
            typeStyles = 'border-rose-500/40 bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100 shadow-rose-500/20 ring-1 ring-rose-500/30';
            IconComponent = AlertCircle;
            iconColor = 'text-rose-600 dark:text-rose-400';
          } else if (item.type === 'warning') {
            typeStyles = 'border-amber-500/30 bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100 shadow-amber-500/10 ring-1 ring-amber-500/30';
            IconComponent = AlertTriangle;
            iconColor = 'text-amber-600 dark:text-amber-400';
          }

          const isPersistent = item.type === 'error' || item.type === 'warning';

          return (
            <div
              key={item.id}
              role="alert"
              onClick={() => {
                if (isPersistent && !item.action) removeToast(item.id);
              }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in-50 slide-in-from-top-4 ${
                isPersistent && !item.action ? 'cursor-pointer' : ''
              } ${typeStyles}`}
            >
              <IconComponent className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs sm:text-sm font-semibold leading-relaxed break-keep">
                <div>{item.message}</div>
                {item.action ? (
                  <div className="mt-2">
                    {item.action.href ? (
                      <Link
                        href={item.action.href}
                        onClick={() => removeToast(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 dark:bg-rose-500 text-white hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors shadow-xs"
                      >
                        <span>{item.action.label}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          item.action?.onClick?.();
                          removeToast(item.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 dark:bg-rose-500 text-white hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>{item.action.label}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  isPersistent && (
                    <span className="block text-[11px] font-normal opacity-75 mt-0.5">
                      (클릭하여 닫기)
                    </span>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(item.id);
                }}
                className="p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-current"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => console.log('Toast:', msg),
      success: (msg: string) => console.log('Toast success:', msg),
      error: (msg: string) => console.error('Toast error:', msg),
      warning: (msg: string) => console.warn('Toast warning:', msg),
      info: (msg: string) => console.info('Toast info:', msg),
    };
  }
  return context;
}

