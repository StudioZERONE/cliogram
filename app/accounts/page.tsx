'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Landmark,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { AccountModal, AccountRecordData } from '@/components/AccountModal';
import { useCounts } from '@/components/CountsProvider';
import { useToast } from '@/components/ToastProvider';

export interface AccountRecord {
  id: string;
  user_id: string;
  account_name: string;
  broker_name?: string | null;
  account_number?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

type SortField = 'broker_name' | 'account_name';
type SortDirection = 'asc' | 'desc';

export default function AccountsPage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  // Sorting State (Default: broker_name asc)
  const [sortField, setSortField] = useState<SortField>('broker_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Smart Fixed Popover Positioning State
  const [activeMobileActionId, setActiveMobileActionId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);

  // Modals state
  const [accountModal, setAccountModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData: AccountRecordData | null;
  }>({
    isOpen: false,
    mode: 'create',
    initialData: null,
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchAccounts();
    });
  }, [router]);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        setAccounts(
          data.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            account_name: item.account_name,
            broker_name: item.broker_name || '',
            account_number: item.account_number || '',
            sort_order: item.sort_order ?? 0,
            is_active: item.is_active ?? true,
            created_at: item.created_at,
          }))
        );
      }
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />;
    return sortDirection === 'asc' ? (
      <ArrowDown className="h-3 w-3 text-emerald-500 inline ml-1" />
    ) : (
      <ArrowUp className="h-3 w-3 text-emerald-500 inline ml-1" />
    );
  };

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let diff = 0;
      if (sortField === 'broker_name') {
        diff = (a.broker_name || '').localeCompare(b.broker_name || '');
      } else if (sortField === 'account_name') {
        diff = a.account_name.localeCompare(b.account_name);
      }

      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }

      // Secondary tie-breaker: account_name asc
      return a.account_name.localeCompare(b.account_name);
    });
  }, [accounts, sortField, sortDirection]);

  // Mobile Smart Action Popover Handlers
  const handleToggleMobileAction = (e: React.MouseEvent<HTMLButtonElement>, accountId: string) => {
    e.stopPropagation();
    if (activeMobileActionId === accountId) {
      setActiveMobileActionId(null);
      setActionMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 180;
    setActionMenuPos({
      top: rect.top,
      right: window.innerWidth - rect.right,
      openUp,
    });
    setActiveMobileActionId(accountId);
  };

  const closeMobileAction = () => {
    setActiveMobileActionId(null);
    setActionMenuPos(null);
  };

  // Handlers for Save, Toggle & Delete
  const handleOpenCreateModal = () => {
    setAccountModal({
      isOpen: true,
      mode: 'create',
      initialData: null,
    });
  };

  const handleOpenEditModal = (account: AccountRecord) => {
    setAccountModal({
      isOpen: true,
      mode: 'edit',
      initialData: account,
    });
  };

  const handleSaveAccount = async (data: {
    id?: string;
    account_name: string;
    broker_name: string;
    account_number: string;
    sort_order: number;
    is_active: boolean;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }

    const payload = {
      user_id: user.id,
      account_name: data.account_name,
      broker_name: data.broker_name || null,
      account_number: data.account_number || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };

    if (accountModal.mode === 'edit' && data.id) {
      const { error } = await supabase.from('accounts').update(payload).eq('id', data.id);
      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST204' || (error as any).status === 404) {
          throw new Error("Supabase DB에 'accounts' 테이블이 아직 생성되지 않았습니다. Supabase 대시보드의 SQL Editor에서 'sql/a_schema.sql' 스크립트를 먼저 실행해 주세요.");
        }
        throw error;
      }
    } else {
      const { error } = await supabase.from('accounts').insert([payload]);
      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST204' || (error as any).status === 404) {
          throw new Error("Supabase DB에 'accounts' 테이블이 아직 생성되지 않았습니다. Supabase 대시보드의 SQL Editor에서 'sql/a_schema.sql' 스크립트를 먼저 실행해 주세요.");
        }
        throw error;
      }
    }

    await fetchAccounts();
    refreshCounts();
    setAccountModal({ isOpen: false, mode: 'create', initialData: null });
  };

  const handleToggleStatus = async (account: AccountRecord) => {
    const updatedStatus = !account.is_active;
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: updatedStatus })
      .eq('id', account.id);

    if (error) {
      toast.error(`상태 변경에 실패했습니다: ${error.message}`);
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, is_active: updatedStatus } : a))
    );
    refreshCounts();
    toast.success(`계좌가 ${updatedStatus ? '사용' : '미사용'} 상태로 변경되었습니다.`);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('accounts').delete().eq('id', deleteTargetId);
    if (error) {
      toast.error(`계좌 삭제에 실패했습니다: ${error.message}`);
    } else {
      await fetchAccounts();
      refreshCounts();
      toast.success('계좌가 삭제되었습니다.');
    }
    setDeleteTargetId(null);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="계좌 관리" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner Card (Desktop Only) */}
          <div className="hidden lg:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                증권 및 투자 계좌 마스터
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                증권사별 종합위탁, ISA, 연금저축 등 실거래에 사용하는 투자 계좌 정보를 관리합니다.
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                매매 기록 등록 시 등록된 계좌를 선택하여 계좌별 자산 및 종목 보유 현황을 정확히 분리할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Section Main Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs space-y-4">
            {/* Header Title & Circular Top-Right Add Button */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5 sm:pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold text-[var(--fg)]">
                  계좌 목록
                </h2>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {isLoadingAccounts ? '...' : `${sortedAccounts.length}개`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                title="신규 계좌 등록"
                aria-label="신규 계좌 등록"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Accounts Table with Clean Flow (No table-internal scrollbars) */}
            <div className="rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm">
                <colgroup className="hidden lg:table-column-group">
                  <col />
                  <col />
                  <col />
                  <col className="w-[90px] min-[1920px]:w-[100px]" />
                  <col className="w-[85px] min-[1920px]:w-[95px]" />
                </colgroup>
                <colgroup className="lg:hidden">
                  <col className="w-[30%]" />
                  <col className="w-[36%]" />
                  <col className="w-[34%]" />
                  <col className="w-12" />
                </colgroup>

                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-medium text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 증권사 */}
                    <th onClick={() => handleSort('broker_name')} className="py-2.5 px-2 sm:px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium whitespace-nowrap">
                      증권사 {renderSortIcon('broker_name')}
                    </th>

                    {/* 2. 계좌명 */}
                    <th onClick={() => handleSort('account_name')} className="py-2.5 px-2 sm:px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium whitespace-nowrap">
                      계좌명 {renderSortIcon('account_name')}
                    </th>

                    {/* 3. 계좌번호 */}
                    <th className="py-2.5 px-2 sm:px-3 text-left font-medium whitespace-nowrap">
                      계좌번호
                    </th>

                    {/* 4. 상태 (Desktop Only) */}
                    <th className="hidden lg:table-cell py-2.5 px-1 sm:px-2 text-center font-medium whitespace-nowrap">
                      상태
                    </th>

                    {/* 5. 작업 (Desktop) */}
                    <th className="hidden lg:table-cell py-2.5 px-1 sm:px-2 text-center font-medium whitespace-nowrap">
                      작업
                    </th>

                    {/* 5. 작업 (Mobile) */}
                    <th className="lg:hidden py-2.5 px-2 text-center w-12 font-medium whitespace-nowrap">
                      작업
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border)]">
                  {isLoadingAccounts ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                          <span>계좌 목록을 불러오는 중입니다...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 계좌 정보가 없습니다. 오른쪽 상단 &quot;+&quot; 버튼을 눌러 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    sortedAccounts.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                        {/* 1. 증권사 (일반 텍스트) */}
                        <td className="py-3 px-2 sm:px-3 text-left font-semibold text-[var(--fg)] text-xs sm:text-sm truncate" title={item.broker_name || ''}>
                          {item.broker_name || '-'}
                        </td>

                        {/* 2. 계좌명 */}
                        <td className="py-3 px-2 sm:px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm truncate" title={item.account_name}>
                          {item.account_name}
                        </td>

                        {/* 3. 계좌번호 */}
                        <td className="py-3 px-2 sm:px-3 text-left text-[11px] sm:text-xs text-[var(--fg-muted)] font-semibold truncate" title={item.account_number || ''}>
                          {item.account_number || '-'}
                        </td>

                        {/* 4. 상태 토글 버튼 (Desktop Only) */}
                        <td className="hidden lg:table-cell py-3 px-0.5 sm:px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20'
                            }`}
                            title={item.is_active ? '클릭하여 미사용으로 변경' : '클릭하여 사용중으로 변경'}
                          >
                            {item.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                사용중
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-0.5" />
                                미사용
                              </>
                            )}
                          </button>
                        </td>

                        {/* 5. 작업 (Desktop: 인라인 버튼) */}
                        <td className="hidden lg:table-cell py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(item.id)}
                              className="p-1 text-red-500 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                        {/* 5. 작업 (Mobile: 점 세개 스마트 고정 팝오버) */}
                        <td className="lg:hidden py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMobileAction(e, item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--fg-muted)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer mx-auto shrink-0"
                            title="작업 메뉴"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {activeMobileActionId === item.id && actionMenuPos && (
                            <>
                              {/* Transparent Backdrop */}
                              <div
                                className="fixed inset-0 z-40 bg-transparent cursor-default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeMobileAction();
                                }}
                              />
                              {/* Smart Fixed Floating Popover */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'fixed',
                                  right: `${actionMenuPos.right}px`,
                                  ...(actionMenuPos.openUp
                                    ? { bottom: `${window.innerHeight - actionMenuPos.top + 6}px` }
                                    : { top: `${actionMenuPos.top + 32}px` }),
                                }}
                                className="z-50 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl backdrop-blur-md text-left text-xs divide-y divide-[var(--border)] animate-in fade-in-50 zoom-in-95 cursor-default"
                              >
                                {/* Status Toggle */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleToggleStatus(item);
                                      closeMobileAction();
                                    }}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 min-h-[42px] font-bold transition-colors hover:bg-[var(--bg)] cursor-pointer"
                                  >
                                    <span className="text-[var(--fg)]">상태 변경</span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                        item.is_active
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                      }`}
                                    >
                                      {item.is_active ? '사용중' : '미사용'}
                                    </span>
                                  </button>
                                </div>

                                {/* Edit */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenEditModal(item);
                                      closeMobileAction();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[42px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-[var(--bg)] cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    <span>계좌 수정</span>
                                  </button>
                                </div>

                                {/* Delete */}
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteTargetId(item.id);
                                      closeMobileAction();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[42px] font-bold text-red-500 hover:bg-[var(--bg)] cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>계좌 삭제</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Account Create & Edit Modal */}
      <AccountModal
        isOpen={accountModal.isOpen}
        mode={accountModal.mode}
        initialData={accountModal.initialData}
        existingOrderCount={accounts.length}
        onClose={() => setAccountModal({ isOpen: false, mode: 'create', initialData: null })}
        onSave={handleSaveAccount}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetId}
        title="계좌 정보 삭제 확인"
        confirmText="삭제하기"
        confirmVariant="danger"
        message="선택하신 계좌 정보를 정말 삭제하시겠습니까?\n삭제 후 매매 원장에 연결된 해당 계좌 정보는 해제됩니다."
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
