'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Code2 } from 'lucide-react';

interface CommonCodeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  groupId: string;
  initialData?: {
    id?: string;
    code: string;
    code_name: string;
    sort_order: number;
    is_active?: boolean;
  } | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    group_id: string;
    code: string;
    code_name: string;
    sort_order: number;
    is_active: boolean;
  }) => Promise<void>;
}

export function CommonCodeModal({
  isOpen,
  mode,
  groupId,
  initialData,
  onClose,
  onSave,
}: CommonCodeModalProps) {
  const [code, setCode] = useState<string>('');
  const [codeName, setCodeName] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setCode(initialData.code);
        setCodeName(initialData.code_name);
        setSortOrder(initialData.sort_order || 1);
        setIsActive(initialData.is_active ?? true);
      } else {
        setCode('');
        setCodeName('');
        setSortOrder(initialData?.sort_order || 1);
        setIsActive(true);
      }
    }
  }, [isOpen, mode, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !codeName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        group_id: groupId,
        code: code.trim().toUpperCase(),
        code_name: codeName.trim(),
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 cursor-default text-[var(--fg)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <Code2 className="h-6 w-6 shrink-0" />
            <h3 className="text-xl font-bold">
              {mode === 'create'
                ? `상세 코드 추가 (${groupId})`
                : `상세 코드 수정 (${groupId})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              코드 (Code) {mode === 'create' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              placeholder="예: JPY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              코드명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 일본 엔화 (¥)"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                정렬 순서
              </label>
              <input
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                사용 상태
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full h-[42px] rounded-xl font-bold text-sm transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                }`}
              >
                {isActive ? '사용중' : '중지'}
              </button>
            </div>
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
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : mode === 'create' ? '코드 등록' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
