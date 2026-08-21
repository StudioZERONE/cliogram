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
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { AccountModal, AccountRecordData } from '@/components/AccountModal';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
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

type SortField = 'sort_order' | 'broker_name' | 'account_name' | 'account_number' | 'is_active';
type SortDirection = 'asc' | 'desc';

export default function AccountsPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorting State (Default: sort_order asc)
  const [sortField, setSortField] = useState<SortField>('sort_order');
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

  const statusFilterOptions: FilterOption[] = useMemo(() => [
    { value: 'ALL', label: '전체' },
    { value: 'ACTIVE', label: '사용중' },
    { value: 'INACTIVE', label: '미사용' },
  ], []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'sort_order' ? 'asc' : 'asc');
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

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchAccount = item.account_name?.toLowerCase().includes(q);
          const matchBroker = item.broker_name?.toLowerCase().includes(q);
          const matchNumber = item.account_number?.toLowerCase().includes(q);
          if (!matchAccount && !matchBroker && !matchNumber) return false;
        }

        if (statusFilter === 'ACTIVE' && !item.is_active) return false;
        if (statusFilter === 'INACTIVE' && item.is_active) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'sort_order') {
          diff = a.sort_order - b.sort_order;
        } else if (sortField === 'broker_name') {
          diff = (a.broker_name || '').localeCompare(b.broker_name || '');
        } else if (sortField === 'account_name') {
          diff = a.account_name.localeCompare(b.account_name);
        } else if (sortField === 'account_number') {
          diff = (a.account_number || '').localeCompare(b.account_number || '');
        } else if (sortField === 'is_active') {
          diff = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
        }

        if (diff !== 0) {
          return sortDirection === 'asc' ? diff : -diff;
        }

        // Secondary tie-breaker: sort_order asc
        return a.sort_order - b.sort_order;
      });
  }, [accounts, searchQuery, statusFilter, sortField, sortDirection]);

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
      if (error) throw error;
    } else {
      const { error } = await supabase.from('accounts').insert([payload]);
      if (error) throw error;
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
          <div className="hidden sm:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs items-center justify-between gap-4">
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
                  {filteredAccounts.length} / {accounts.length}건
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

            {/* Filter Toolbar Section */}
            {/* Desktop Toolbar */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex-1 max-w-sm relative">
                <input
                  type="text"
                  placeholder="계좌명, 증권사명, 계좌번호 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-3.5 pr-8 py-2 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400/20 hover:bg-gray-400/40 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                    title="검색어 지우기"
                    aria-label="검색어 지우기"
                  >
                    <X className="h-3 w-3 stroke-[2.5]" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <FilterDropdown
                  labelPrefix="상태"
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
            </div>

            {/* Mobile Toolbar */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="계좌명, 증권사 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-3 pr-7 py-2 text-xs text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400/20 hover:bg-gray-400/40 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                      title="검색어 지우기"
                      aria-label="검색어 지우기"
                    >
                      <X className="h-2.5 w-2.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
                <div className="w-28">
                  <FilterDropdown
                    labelPrefix="상태"
                    mobileLabelPrefix="상태"
                    options={statusFilterOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm table-fixed">
                <colgroup className="hidden sm:table-column-group">
                  <col className="w-[70px] min-[1920px]:w-[80px]" />   {/* 1. 순서 */}
                  <col className="w-[130px] min-[1920px]:w-[150px]" /> {/* 2. 증권사 */}
                  <col />                                              {/* 3. 계좌명 (가변 폭) */}
                  <col className="w-[180px] min-[1920px]:w-[220px]" /> {/* 4. 계좌번호 */}
                  <col className="w-[90px] min-[1920px]:w-[100px]" />  {/* 5. 상태 */}
                  <col className="w-[85px] min-[1920px]:w-[95px]" />   {/* 6. 작업 */}
                </colgroup>
                <colgroup className="sm:hidden">
                  <col className="w-[50%]" /> {/* 1. 증권사 / 계좌명 */}
                  <col className="w-[38%]" /> {/* 2. 계좌번호 / 상태 */}
                  <col className="w-[12%]" /> {/* 3. 작업 */}
                </colgroup>

                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-medium text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 순서 */}
                    <th onClick={() => handleSort('sort_order')} className="hidden sm:table-cell py-2.5 px-3 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      순서 {renderSortIcon('sort_order')}
                    </th>

                    {/* 2. 증권사 */}
                    <th onClick={() => handleSort('broker_name')} className="hidden sm:table-cell py-2.5 px-3 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      증권사 {renderSortIcon('broker_name')}
                    </th>

                    {/* 3. 계좌명 */}
                    <th onClick={() => handleSort('account_name')} className="hidden sm:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      계좌명 {renderSortIcon('account_name')}
                    </th>

                    {/* 4. 계좌번호 */}
                    <th onClick={() => handleSort('account_number')} className="hidden sm:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      계좌번호 {renderSortIcon('account_number')}
                    </th>

                    {/* 5. 상태 */}
                    <th onClick={() => handleSort('is_active')} className="hidden sm:table-cell py-2.5 px-2 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      상태 {renderSortIcon('is_active')}
                    </th>

                    {/* 6. 작업 */}
                    <th className="hidden sm:table-cell py-2.5 px-2 text-center font-medium">작업</th>

                    {/* Mobile Headers */}
                    <th className="sm:hidden py-2 px-2 text-left font-medium text-[10.5px]">증권사 / 계좌명</th>
                    <th className="sm:hidden py-2 px-2 text-right font-medium text-[10.5px]">계좌번호 / 상태</th>
                    <th className="sm:hidden py-2 px-1 text-center font-medium text-[10.5px]">작업</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border)]">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 계좌 정보가 없습니다. 오른쪽 상단 "+" 버튼을 눌러 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                        {/* 1. 순서 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-3 text-center text-xs text-[var(--fg-muted)] font-bold">
                          {item.sort_order}
                        </td>

                        {/* 2. 증권사 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                            {item.broker_name || '기본'}
                          </span>
                        </td>

                        {/* 3. 계좌명 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm truncate">
                          {item.account_name}
                        </td>

                        {/* 4. 계좌번호 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-3 text-left text-xs text-[var(--fg-muted)] font-semibold truncate">
                          {item.account_number || '-'}
                        </td>

                        {/* 5. 상태 토글 버튼 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-2 text-center">
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

                        {/* 6. 작업 (Desktop) */}
                        <td className="hidden sm:table-cell py-3 px-2 text-center">
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

                        {/* Mobile Col 1: 증권사 배지 + 계좌명 */}
                        <td className="sm:hidden py-2.5 px-2 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                              {item.broker_name || '기본'}
                            </span>
                            <span className="text-[10px] text-[var(--fg-muted)] font-medium">
                              #{item.sort_order}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[var(--fg)] mt-1 truncate">
                            {item.account_name}
                          </p>
                        </td>

                        {/* Mobile Col 2: 계좌번호 + 상태 */}
                        <td className="sm:hidden py-2.5 px-2 text-right">
                          <p className="text-[10.5px] text-[var(--fg-muted)] font-semibold truncate">
                            {item.account_number || '-'}
                          </p>
                          <div className="mt-1">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                item.is_active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                              }`}
                            >
                              {item.is_active ? '사용중' : '미사용'}
                            </button>
                          </div>
                        </td>

                        {/* Mobile Col 3: 작업 메뉴 */}
                        <td className="sm:hidden py-2.5 px-1 text-center relative">
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
