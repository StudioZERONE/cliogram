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

type SortField = 'broker_name' | 'account_name' | 'is_active';
type SortDirection = 'asc' | 'desc';

export default function AccountsPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  // Sorting State (Default: broker_name asc)
  const [sortField, setSortField] = useState<SortField>('broker_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Mobile Action Popover
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

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
      } else if (sortField === 'is_active') {
        diff = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      }

      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }

      // Secondary tie-breaker: account_name asc
      return a.account_name.localeCompare(b.account_name);
    });
  }, [accounts, sortField, sortDirection]);

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
    setActivePopoverId(null);
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
    if (!user) return;

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
      alert(`상태 변경에 실패했습니다: ${error.message}`);
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, is_active: updatedStatus } : a))
    );
    refreshCounts();
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('accounts').delete().eq('id', deleteTargetId);
    if (error) {
      alert(`계좌 삭제에 실패했습니다: ${error.message}`);
    } else {
      await fetchAccounts();
      refreshCounts();
    }
    setDeleteTargetId(null);
    setActivePopoverId(null);
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
                  {sortedAccounts.length}개
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

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm table-fixed">
                <colgroup className="hidden lg:table-column-group">
                  <col />                                              {/* 1. 증권사 (가변 폭) */}
                  <col />                                              {/* 2. 계좌명 (가변 폭) */}
                  <col />                                              {/* 3. 계좌번호 (가변 폭) */}
                  <col className="w-[90px] min-[1920px]:w-[100px]" />  {/* 4. 상태 */}
                  <col className="w-[85px] min-[1920px]:w-[95px]" />   {/* 5. 작업 */}
                </colgroup>
                <colgroup className="lg:hidden">
                  <col />                                              {/* 1. 증권사 / 계좌명 / 계좌번호 (가변 폭) */}
                  <col className="w-[75px]" />                         {/* 2. 상태 (고정 폭) */}
                  <col className="w-[45px]" />                         {/* 3. 작업 (고정 폭) */}
                </colgroup>

                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-medium text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 증권사 */}
                    <th onClick={() => handleSort('broker_name')} className="hidden lg:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      증권사 {renderSortIcon('broker_name')}
                    </th>

                    {/* 2. 계좌명 */}
                    <th onClick={() => handleSort('account_name')} className="hidden lg:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      계좌명 {renderSortIcon('account_name')}
                    </th>

                    {/* 3. 계좌번호 (정렬기능 삭제) */}
                    <th className="hidden lg:table-cell py-2.5 px-3 text-left font-medium">
                      계좌번호
                    </th>

                    {/* 4. 상태 */}
                    <th onClick={() => handleSort('is_active')} className="hidden lg:table-cell py-2.5 px-2 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      상태 {renderSortIcon('is_active')}
                    </th>

                    {/* 5. 작업 */}
                    <th className="hidden lg:table-cell py-2.5 px-2 text-center font-medium">작업</th>

                    {/* Mobile Headers */}
                    <th className="lg:hidden py-2 px-2 text-left font-medium text-[10.5px]">증권사 / 계좌명 / 계좌번호</th>
                    <th className="lg:hidden py-2 px-1 text-center font-medium text-[10.5px]">상태</th>
                    <th className="lg:hidden py-2 px-1 text-center font-medium text-[10.5px]">작업</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border)]">
                  {sortedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 계좌 정보가 없습니다. 오른쪽 상단 "+" 버튼을 눌러 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    sortedAccounts.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                        {/* 1. 증권사 (Desktop: 일반 텍스트) */}
                        <td className="hidden lg:table-cell py-3 px-3 text-left font-semibold text-[var(--fg)] text-xs sm:text-sm truncate">
                          {item.broker_name || '-'}
                        </td>

                        {/* 2. 계좌명 (Desktop) */}
                        <td className="hidden lg:table-cell py-3 px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm truncate">
                          {item.account_name}
                        </td>

                        {/* 3. 계좌번호 (Desktop) */}
                        <td className="hidden lg:table-cell py-3 px-3 text-left text-xs text-[var(--fg-muted)] font-semibold truncate">
                          {item.account_number || '-'}
                        </td>

                        {/* 4. 상태 토글 버튼 (Desktop) */}
                        <td className="hidden lg:table-cell py-3 px-2 text-center">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all cursor-pointer border ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20'
                            }`}
                            title={item.is_active ? '클릭하여 미사용으로 변경' : '클릭하여 사용중으로 변경'}
                          >
                            {item.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                사용중
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                미사용
                              </>
                            )}
                          </button>
                        </td>

                        {/* 5. 작업 (Desktop) */}
                        <td className="hidden lg:table-cell py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(item.id)}
                              className="p-1 text-red-500 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                        {/* Mobile Col 1: 증권사(일반 텍스트) + 계좌명 + 계좌번호 */}
                        <td className="lg:hidden py-2.5 px-2 text-left">
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                            {item.broker_name || '-'}
                          </div>
                          <p className="font-bold text-xs text-[var(--fg)] mt-0.5 truncate">
                            {item.account_name}
                          </p>
                          <p className="text-[10.5px] text-[var(--fg-muted)] font-medium mt-0.5 truncate">
                            {item.account_number || '-'}
                          </p>
                        </td>

                        {/* Mobile Col 2: 상태 */}
                        <td className="lg:hidden py-2.5 px-1 text-center">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }`}
                          >
                            {item.is_active ? '사용중' : '미사용'}
                          </button>
                        </td>

                        {/* Mobile Col 3: 작업 메뉴 */}
                        <td className="lg:hidden py-2.5 px-1 text-center relative">
                          <button
                            onClick={() => setActivePopoverId(activePopoverId === item.id ? null : item.id)}
                            className="p-1 rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
                            aria-label="작업 메뉴"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activePopoverId === item.id && (
                            <div className="absolute right-2 top-8 z-30 w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl divide-y divide-[var(--border)] overflow-hidden text-left animate-in zoom-in-95">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="w-full min-h-[42px] px-3 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-[var(--bg)] flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                정보 수정
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTargetId(item.id);
                                  setActivePopoverId(null);
                                }}
                                className="w-full min-h-[42px] px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-[var(--bg)] flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                삭제하기
                              </button>
                            </div>
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
