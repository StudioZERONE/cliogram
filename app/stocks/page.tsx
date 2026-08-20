'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { StockModal, StockRecordData } from '@/components/StockModal';
import { useCounts } from '@/components/CountsProvider';

export interface StockRecord {
  id?: string;
  user_id?: string;
  ticker: string;
  name: string;
  short_name: string;
  type: string;
  currency: string;
  market: string;
  is_active: boolean;
  created_at?: string;
}

type SortField = 'name' | 'short_name' | 'ticker' | 'type' | 'currency' | 'market' | 'is_active';
type SortDirection = 'asc' | 'desc';

export default function StocksPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [stocks, setStocks] = useState<StockRecord[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Header Sorting State (Default: name asc)
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modals state
  const [stockModal, setStockModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData: StockRecordData | null;
  }>({
    isOpen: false,
    mode: 'create',
    initialData: null,
  });

  const [deleteTargetTicker, setDeleteTargetTicker] = useState<string | null>(null);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchStocks();
    });
  }, [router]);

  const fetchStocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('stocks')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
      .order('ticker', { ascending: true });

    if (data) {
      const normalizedData: StockRecord[] = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        ticker: item.ticker,
        name: item.name,
        short_name: item.short_name || item.name,
        type: item.type || 'Growth',
        currency: item.currency || 'USD',
        market: item.market || 'NASDAQ',
        is_active: item.is_active ?? true,
        created_at: item.created_at,
      }));
      setStocks(normalizedData);
    }
  };

  // Header click sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Toggle Stock Active Status directly
  const handleToggleActive = async (stock: StockRecord) => {
    const nextStatus = !stock.is_active;
    const { error } = await supabase
      .from('stocks')
      .update({ is_active: nextStatus })
      .eq('ticker', stock.ticker);

    if (!error) {
      setStocks((prev) =>
        prev.map((s) => (s.ticker === stock.ticker ? { ...s, is_active: nextStatus } : s))
      );
    }
  };

  // Save handler for StockModal (Create / Edit)
  const handleSaveStock = async (data: StockRecordData & { short_name: string; is_active: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/?error=unauthorized');
      return;
    }

    const payload = {
      user_id: user.id,
      ticker: data.ticker.toUpperCase(),
      name: data.name,
      short_name: data.short_name || data.name,
      type: data.type,
      currency: data.currency,
      market: data.market,
      is_active: data.is_active ?? true,
    };

    if (stockModal.mode === 'create') {
      const { data: inserted, error } = await supabase
        .from('stocks')
        .insert([payload])
        .select();

      if (!error && inserted && inserted.length > 0) {
        const newRecord: StockRecord = {
          id: inserted[0].id,
          user_id: inserted[0].user_id,
          ticker: inserted[0].ticker,
          name: inserted[0].name,
          short_name: inserted[0].short_name || inserted[0].name,
          type: inserted[0].type,
          currency: inserted[0].currency,
          market: inserted[0].market,
          is_active: inserted[0].is_active ?? true,
        };
        setStocks((prev) => [...prev, newRecord]);
        refreshCounts();
      }
    } else if (stockModal.mode === 'edit') {
      const { error } = await supabase
        .from('stocks')
        .update({
          name: payload.name,
          short_name: payload.short_name,
          type: payload.type,
          currency: payload.currency,
          market: payload.market,
          is_active: payload.is_active,
        })
        .eq('ticker', payload.ticker);

      if (!error) {
        setStocks((prev) =>
          prev.map((s) => (s.ticker === payload.ticker ? { ...s, ...payload } : s))
        );
      }
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetTicker) return;
    const { error } = await supabase.from('stocks').delete().eq('ticker', deleteTargetTicker);
    if (!error) {
      setStocks((prev) => prev.filter((s) => s.ticker !== deleteTargetTicker));
      refreshCounts();
    }
    setDeleteTargetTicker(null);
  };

  // Filter & Sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    let result = stocks.filter((stock) => {
      // Search filter (ticker, name, short_name)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTicker = stock.ticker.toLowerCase().includes(q);
        const matchesName = stock.name.toLowerCase().includes(q);
        const matchesShortName = stock.short_name.toLowerCase().includes(q);
        if (!matchesTicker && !matchesName && !matchesShortName) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && stock.type !== typeFilter) {
        return false;
      }

      // Market filter
      if (marketFilter !== 'ALL' && stock.market !== marketFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !stock.is_active) {
        return false;
      }
      if (statusFilter === 'INACTIVE' && stock.is_active) {
        return false;
      }

      return true;
    });

    // Header Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;

      // Secondary Tie-Breaker: Ticker ASC
      return a.ticker.localeCompare(b.ticker);
    });

    return result;
  }, [stocks, searchQuery, typeFilter, marketFilter, statusFilter, sortField, sortDirection]);

  // Unique types and markets for filter dropdowns
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => { if (s.type) set.add(s.type); });
    return Array.from(set);
  }, [stocks]);

  const availableMarkets = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => { if (s.market) set.add(s.market); });
    return Array.from(set);
  }, [stocks]);

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  const renderFlagEmoji = (curr: string) => {
    if (curr === 'USD') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="미국 달러 (USD)">🇺🇸</span>;
    if (curr === 'KRW') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="대한민국 원 (KRW)">🇰🇷</span>;
    if (curr === 'EUR') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="유로화 (EUR)">🇪🇺</span>;
    return <span className="text-xs sm:text-sm font-bold text-[var(--fg-muted)]">{curr}</span>;
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-[var(--fg-muted)] opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="종목 마스터" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                주식 종목 마스터 관리
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                매매 및 배당 관리를 위한 주식 종목(티커, 짧은 종목명, 유형, 시장, 사용상태) 목록을 통합 등록하고 관리합니다.
              </p>
            </div>
          </div>

          {/* Main Full-Width Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs space-y-4">
            {/* Header Toolbar: Title, Search, Filter & Add Button */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <span>주식 종목 목록</span>
                  <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {filteredAndSortedStocks.length} / {stocks.length}개
                  </span>
                </h3>
              </div>

              {/* Controls: Search & Filters & Green Circular Add Button */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    placeholder="종목명, 짧은 종목명, 티커 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--fg)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                >
                  <option value="ALL">유형: 전체</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Market Filter */}
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--fg)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                >
                  <option value="ALL">시장: 전체</option>
                  {availableMarkets.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--fg)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                >
                  <option value="ALL">상태: 전체</option>
                  <option value="ACTIVE">사용중</option>
                  <option value="INACTIVE">사용중지</option>
                </select>

                {/* Circular Green Add Button */}
                <button
                  onClick={() =>
                    setStockModal({
                      isOpen: true,
                      mode: 'create',
                      initialData: null,
                    })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0 ml-1"
                  title="신규 종목 추가"
                  aria-label="신규 종목 추가"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* High Density Table with Clickable Sorting Headers */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                  <tr>
                    {/* Header: Name */}
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-3.5 text-left cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>종목명</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>

                    {/* Header: Short Name */}
                    <th
                      onClick={() => handleSort('short_name')}
                      className="py-3 px-3 text-left cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none hidden md:table-cell"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>짧은 종목명</span>
                        {renderSortIcon('short_name')}
                      </div>
                    </th>

                    {/* Header: Ticker */}
                    <th
                      onClick={() => handleSort('ticker')}
                      className="py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>티커</span>
                        {renderSortIcon('ticker')}
                      </div>
                    </th>

                    {/* Header: Type */}
                    <th
                      onClick={() => handleSort('type')}
                      className="py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>유형</span>
                        {renderSortIcon('type')}
                      </div>
                    </th>

                    {/* Header: Currency */}
                    <th
                      onClick={() => handleSort('currency')}
                      className="py-3 px-2.5 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>통화</span>
                        {renderSortIcon('currency')}
                      </div>
                    </th>

                    {/* Header: Market */}
                    <th
                      onClick={() => handleSort('market')}
                      className="py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none hidden sm:table-cell"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>상장 시장</span>
                        {renderSortIcon('market')}
                      </div>
                    </th>

                    {/* Header: Active Status */}
                    <th
                      onClick={() => handleSort('is_active')}
                      className="py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>상태</span>
                        {renderSortIcon('is_active')}
                      </div>
                    </th>

                    {/* Header: Actions */}
                    <th className="py-3 px-3 text-center w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  {filteredAndSortedStocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs sm:text-sm text-[var(--fg-muted)]">
                        조회된 종목 데이터가 없습니다. 상단의 "+ 버튼"을 눌러 신규 종목을 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedStocks.map((item) => (
                      <tr
                        key={item.ticker}
                        className={`hover:bg-[var(--bg)]/70 transition-colors ${
                          !item.is_active ? 'opacity-65 bg-gray-500/5' : ''
                        }`}
                      >
                        {/* Name */}
                        <td className="py-3 px-3.5 text-left font-bold text-[var(--fg)] text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="md:hidden text-[10px] text-[var(--fg-muted)] font-normal">
                              {item.short_name}
                            </span>
                          </div>
                        </td>

                        {/* Short Name */}
                        <td className="py-3 px-3 text-left font-semibold text-[var(--fg-muted)] text-xs hidden md:table-cell">
                          {item.short_name}
                        </td>

                        {/* Ticker */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {item.ticker}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3 text-center">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {item.type}
                          </span>
                        </td>

                        {/* Currency */}
                        <td className="py-3 px-2.5 text-center">
                          {renderFlagEmoji(item.currency)}
                        </td>

                        {/* Market */}
                        <td className="py-3 px-3 text-center text-xs text-[var(--fg-muted)] font-semibold hidden sm:table-cell">
                          {item.market}
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold cursor-pointer transition-colors ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                            }`}
                            title="클릭하여 사용 상태 변경"
                          >
                            {item.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>사용중</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                <span>중지</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                setStockModal({
                                  isOpen: true,
                                  mode: 'edit',
                                  initialData: item,
                                })
                              }
                              className="text-[var(--fg-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => setDeleteTargetTicker(item.ticker)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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

      {/* Stock Registration/Edit Modal */}
      <StockModal
        isOpen={stockModal.isOpen}
        mode={stockModal.mode}
        initialData={stockModal.initialData}
        onClose={() => setStockModal({ ...stockModal, isOpen: false })}
        onSave={handleSaveStock}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetTicker}
        title="종목 마스터 삭제 확인"
        message={`선택하신 종목 (${deleteTargetTicker})을 정말 삭제하시겠습니까?\n삭제 후에는 등록된 종목 정보가 제거됩니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetTicker(null)}
      />
    </div>
  );
}
