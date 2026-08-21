'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface CodeGroupModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    group_id: string;
    group_name: string;
    description?: string;
  } | null;
  onClose: () => void;
  onSave: (data: { group_id: string; group_name: string; description?: string }) => Promise<void>;
}

export function CodeGroupModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: CodeGroupModalProps) {
  const toast = useToast();
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (mode === 'edit' && initialData) {
        setGroupId(initialData.group_id);
        setGroupName(initialData.group_name);
        setDescription(initialData.description || '');
      } else {
        setGroupId('');
        setGroupName('');
        setDescription('');
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
    setFormError(null);

    if (!groupId.trim()) {
      const msg = '그룹 ID를 입력해 주세요.';
      setFormError(msg);
      toast.warning(msg);
      return;
    }
    if (!groupName.trim()) {
      const msg = '그룹명을 입력해 주세요.';
      setFormError(msg);
      toast.warning(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        group_id: groupId.trim().toUpperCase(),
        group_name: groupName.trim(),
        description: description.trim(),
      });
      toast.success(mode === 'create' ? '코드 그룹이 등록되었습니다.' : '코드 그룹이 수정되었습니다.');
      onClose();
    } catch (err: any) {
      console.error('CodeGroupModal save error:', err);
      const msg = err?.message || '코드 그룹 저장 중 오류가 발생했습니다.';
      setFormError(msg);
      toast.error(msg);
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
            <Layers className="h-6 w-6 shrink-0" />
            <h3 className="text-xl font-bold">
              {mode === 'create' ? '코드 그룹 신규 등록' : '코드 그룹 수정'}
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
          {/* Inline Form Error Notification */}
          {formError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              그룹 ID (Group ID) {mode === 'create' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              placeholder="예: ACCOUNT_TYPE"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              그룹명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 계좌 유형"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              상세 설명
            </label>
            <textarea
              rows={3}
              placeholder="코드 그룹에 대한 상세 설명 메모..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
            />
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
              {isSubmitting ? '저장 중...' : mode === 'create' ? '그룹 등록' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
