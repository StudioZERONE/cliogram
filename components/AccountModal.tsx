'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Layers } from 'lucide-react';

export interface AccountRecordData {
  id?: string;
  account_name: string;
  broker_name?: string | null;
  account_number?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface AccountModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: AccountRecordData | null;
  existingOrderCount?: number;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    account_name: string;
    broker_name: string;
    account_number: string;
    sort_order: number;
    is_active: boolean;
  }) => Promise<void>;
}

export function AccountModal({
  isOpen,
  mode,
  initialData,
  existingOrderCount = 0,
  onClose,
  onSave,
}: AccountModalProps) {
  const [brokerName, setBrokerName] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setBrokerName(initialData.broker_name || '');
        setAccountName(initialData.account_name || '');
        setAccountNumber(initialData.account_number || '');
        setSortOrder(initialData.sort_order ?? 1);
        setIsActive(initialData.is_active ?? true);
      } else {
        setBrokerName('');
        setAccountName('');
        setAccountNumber('');
        setSortOrder(existingOrderCount + 1);
        setIsActive(true);
      }
    }
  }, [isOpen, mode, initialData, existingOrderCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        account_name: accountName.trim(),
        broker_name: brokerName.trim(),
        account_number: accountNumber.trim(),
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      console.error('AccountModal save error:', err);
      alert(`계좌 정보 저장 중 오류가 발생했습니다: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden cursor-default text-[var(--fg)] animate-in zoom-in-95"
      >
        {/* Fixed Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold">
              {mode === 'create' ? '신규 계좌 등록' : '계좌 정보 수정'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Row 1: 증권사명 (50%) & 계좌명 (50%) */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                증권사명
              </label>
              <input
                type="text"
                placeholder="KB증권, 미래에셋 등"
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                계좌명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="종합위탁, ISA계좌 등"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm font-bold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                required
              />
            </div>
          </div>

          {/* Row 2: 계좌번호 (VARCHAR 30) */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              계좌번호
            </label>
            <input
              type="text"
              maxLength={30}
              placeholder="예: 123-45-678901 (선택 입력)"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
            />
          </div>

          {/* Row 3: 정렬순서 (50%) & 사용여부 (50%) */}
          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                정렬 순서
              </label>
              <input
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-center font-bold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                사용 여부
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}
              >
                {isActive ? '사용중 (Active)' : '미사용 (Inactive)'}
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !accountName.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? '저장 중...' : mode === 'create' ? '계좌 등록' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
