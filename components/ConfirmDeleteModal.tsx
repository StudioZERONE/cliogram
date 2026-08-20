'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary' | 'emerald';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = '데이터 삭제 확인',
  message = '선택하신 항목을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다.',
  confirmText = '삭제하기',
  confirmVariant = 'danger',
  onConfirm,
  onClose
}: ConfirmDeleteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const messageLines = message.split('\n');

  const isPrimary = confirmVariant === 'primary' || confirmVariant === 'emerald';

  const renderIcon = () => {
    if (isPrimary) {
      return <AlertCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (confirmVariant === 'warning') {
      return <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />;
    }
    return <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 shrink-0" />;
  };

  const renderButtonClass = () => {
    if (isPrimary) {
      return 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600';
    }
    if (confirmVariant === 'warning') {
      return 'bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-500 dark:hover:bg-amber-600';
    }
    return 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-500 dark:hover:bg-red-600';
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 cursor-default"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            {renderIcon()}
            <h3 className="text-xl font-bold text-[var(--fg)]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clean Line-Broken Message Paragraphs */}
        <div className="py-2 text-base text-[var(--fg)] space-y-1.5 leading-relaxed font-medium">
          {messageLines.map((line, idx) => (
            <p key={idx} className={idx > 0 ? 'text-sm text-[var(--fg-muted)]' : ''}>
              {line}
            </p>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 text-sm font-bold text-[var(--fg)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors shadow-xs cursor-pointer ${renderButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
