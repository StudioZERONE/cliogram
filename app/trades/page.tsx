'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Edit2, Trash2, Layers, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
import { CurrencyViewToggle, CurrencyViewMode } from '@/components/CurrencyViewToggle';
import { TradeModal, TradeRecordData, StockOption } from '@/components/TradeModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useCounts } from '@/components/CountsProvider';

type SortField = 'trade_date' | 'ticker' | 'stock_name' | 'total_amount';
type SortDirection = 'asc' | 'desc';

export default function TradesPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Core Data
  const [trades, setTrades] = useState<TradeRecordData[]>([]);
  const [stocks, setStocks] = useState<StockOption[]>([]);

  // Toolbar & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [currencyViewMode, setCurrencyViewMode] = useState<CurrencyViewMode>('ORIGINAL');

  // Sorting: Default trade_date DESC (최신순)
  const [sortField, setSortField] = useState<SortField>('trade_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modals & Action States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTrade, setEditingTrade] = useState<TradeRecordData | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Mobile Action Popover
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchTrades();
      fetchStocks();
    });
  }, [router]);

  const fetchStocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('stocks')
      .select('id, ticker, name, short_name, currency, is_active')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (data) {
      setStocks(
        data.map((s: any) => ({
          id: s.id,
          ticker: s.ticker,
          name: s.name,
          short_name: s.short_name || s.name,
          currency: s.currency || 'USD',
          is_active: s.is_active ?? true,
        }))
      );
    }
  };

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrades(data as TradeRecordData[]);
    }
  };

  // Map ticker -> short_name for responsive display
  const tickerToShortNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    stocks.forEach((s) => {
      map[s.ticker] = s.short_name || s.name;
    });
    return map;
  }, [stocks]);

  const typeFilterOptions: FilterOption[] = useMemo(() => [
    { value: 'ALL', label: '전체' },
    { value: 'BUY', label: '매수' },
    { value: 'SELL', label: '매도' },
  ], []);

  const currencyFilterOptions: FilterOption[] = useMemo(() => [
    { value: 'ALL', label: '전체' },
    { value: 'USD', label: 'USD' },
    { value: 'KRW', label: 'KRW' },
    { value: 'EUR', label: 'EUR' },
  ], []);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter & Sort Trades List
  const filteredTrades = useMemo(() => {
    return trades
      .filter((item) => {
        // Search Query (ticker, stock_name, short_name, notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = item.ticker?.toLowerCase().includes(q);
          const matchName = item.stock_name?.toLowerCase().includes(q);
          const shortName = (item.ticker ? tickerToShortNameMap[item.ticker] : undefined)?.toLowerCase();
          const matchShortName = shortName?.includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchTicker && !matchName && !matchShortName && !matchNotes) return false;
        }

        // Type Filter
        if (typeFilter !== 'ALL' && item.trade_type !== typeFilter) return false;

        // Currency Filter
        if (currencyFilter !== 'ALL' && item.currency !== currencyFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;

        if (sortField === 'total_amount') {
          const rawA = a.trade_type === 'SELL' ? -Math.abs(a.quantity * a.price) : Math.abs(a.quantity * a.price);
          const rawB = b.trade_type === 'SELL' ? -Math.abs(b.quantity * b.price) : Math.abs(b.quantity * b.price);
          const valA = currencyViewMode === 'KRW' ? rawA * (a.exchange_rate || 1) : rawA;
          const valB = currencyViewMode === 'KRW' ? rawB * (b.exchange_rate || 1) : rawB;
          diff = valA - valB;
        } else if (sortField === 'ticker') {
          diff = (a.ticker || '').localeCompare(b.ticker || '');
        } else if (sortField === 'stock_name') {
          diff = (a.stock_name || '').localeCompare(b.stock_name || '');
        } else if (sortField === 'trade_date') {
          diff = new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime();
        }

        if (diff !== 0) {
          return sortDirection === 'asc' ? diff : -diff;
        }

        // Secondary Tie-breaker: trade_date DESC (최신 일자 우선)
        const dateDiff = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (dateDiff !== 0) return dateDiff;

        // Tertiary Tie-breaker: created_at DESC
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [trades, searchQuery, typeFilter, currencyFilter, sortField, sortDirection, currencyViewMode, tickerToShortNameMap]);

  // Handlers for Save and Delete
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trade: TradeRecordData) => {
    setModalMode('edit');
    setEditingTrade(trade);
    setIsModalOpen(true);
    setActivePopoverId(null);
  };

  const handleSaveTrade = async (tradeData: TradeRecordData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      trade_date: tradeData.trade_date,
      ticker: tradeData.ticker,
      stock_name: tradeData.stock_name,
      trade_type: tradeData.trade_type,
      quantity: tradeData.quantity,
      price: tradeData.price,
      currency: tradeData.currency,
      exchange_rate: tradeData.exchange_rate,
      total_amount: tradeData.total_amount,
      total_amount_krw: tradeData.total_amount_krw,
      fee: tradeData.fee,
      tax: tradeData.tax,
      notes: tradeData.notes,
    };

    if (modalMode === 'edit' && tradeData.id) {
      let { error } = await supabase.from('trades').update(payload).eq('id', tradeData.id);
      if (error && error.code === 'PGRST204') {
        await supabase.from('trades').update(payload).eq('id', tradeData.id);
      }
    } else {
      let { error } = await supabase.from('trades').insert([payload]);
      if (error && error.code === 'PGRST204') {
        await supabase.from('trades').insert([payload]);
      }
    }

    await fetchTrades();
    refreshCounts();
    setIsModalOpen(false);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('trades').delete().eq('id', deleteTargetId);
    if (!error) {
      setTrades((prev) => prev.filter((t) => t.id !== deleteTargetId));
      refreshCounts();
    }
    setDeleteTargetId(null);
    setActivePopoverId(null);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  // Currency Flag Only
  const renderFlagEmoji = (curr: string) => {
    if (curr === 'USD') return <span className="text-lg leading-none align-middle inline-block" title="미국 달러 (USD)">🇺🇸</span>;
    if (curr === 'KRW') return <span className="text-lg leading-none align-middle inline-block" title="대한민국 원 (KRW)">🇰🇷</span>;
    if (curr === 'EUR') return <span className="text-lg leading-none align-middle inline-block" title="유로화 (EUR)">🇪🇺</span>;
    if (curr === 'JPY') return <span className="text-lg leading-none align-middle inline-block" title="일본 엔화 (JPY)">🇯🇵</span>;
    if (curr === 'CNY') return <span className="text-lg leading-none align-middle inline-block" title="중국 위안화 (CNY)">🇨🇳</span>;
    return <span className="text-xs font-bold text-[var(--fg-muted)]">{curr}</span>;
  };

  /**
   * Sort Icon Direction Rule:
   * - Ascending (작은 것 -> 큰 것, 가나다순, 위에서 아래로): ArrowDown (아래 화살표)
   * - Descending (큰 것 -> 작은 것, 최근 일자, 다나가순, 위에서 아래로): ArrowUp (위 화살표)
   */
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />;
    return sortDirection === 'asc' ? (
      <ArrowDown className="h-3 w-3 text-emerald-500 inline ml-1" />
    ) : (
      <ArrowUp className="h-3 w-3 text-emerald-500 inline ml-1" />
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="매매 내역" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner Card (Desktop Only) */}
          <div className="hidden sm:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                자산 매매 내역 원장
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                원화(KRW) 및 외화(USD 등) 주식 매매 거래 내역을 기록하고 관리하는 원장 목록입니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toss Style $ vs 원 Currency Toggle */}
              <CurrencyViewToggle mode={currencyViewMode} onChange={setCurrencyViewMode} />
            </div>
          </div>

          {/* Section Main Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs space-y-4">
            {/* Header Title & Circular Top-Right Add Button */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5 sm:pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold text-[var(--fg)]">
                  매매 내역 목록
                </h2>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredTrades.length} / {trades.length}건
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                title="신규 매매 내역 등록"
                aria-label="신규 매매 내역 등록"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Filter Toolbar Section */}
            {/* Desktop Toolbar: 1-Row Flex */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="종목, 짧은 종목명, 티커, 비고 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <FilterDropdown
                  labelPrefix="구분"
                  options={typeFilterOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                <FilterDropdown
                  labelPrefix="통화"
                  options={currencyFilterOptions}
                  value={currencyFilter}
                  onChange={setCurrencyFilter}
                />
              </div>
            </div>

            {/* Mobile Toolbar: 2-Row Structured Grid */}
            <div className="sm:hidden space-y-2">
              {/* Row 1: Search & Currency Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="종목, 티커 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                />
                <CurrencyViewToggle mode={currencyViewMode} onChange={setCurrencyViewMode} />
              </div>
              {/* Row 2: 2 Equal Columns Filter Comboboxes (구분, 통화) */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <FilterDropdown
                  labelPrefix="구분"
                  mobileLabelPrefix="구분"
                  options={typeFilterOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                <FilterDropdown
                  labelPrefix="통화"
                  mobileLabelPrefix="통화"
                  options={currencyFilterOptions}
                  value={currencyFilter}
                  onChange={setCurrencyFilter}
                />
              </div>
            </div>

            {/* Data Table View */}
            {/* Desktop Columns Order: 매매일자, 구분, 티커, 종목, 통화, 단가, 수량, 거래금액, 환율, 작업 */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 매매일자 (Sortable) */}
                    <th onClick={() => handleSort('trade_date')} className="hidden sm:table-cell py-2.5 px-3 text-center cursor-pointer hover:text-[var(--fg)]">
                      매매일자 {renderSortIcon('trade_date')}
                    </th>

                    {/* 2. 구분 */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-center">구분</th>

                    {/* 3. 티커 (Sortable) */}
                    <th onClick={() => handleSort('ticker')} className="hidden sm:table-cell py-2.5 px-3 text-center cursor-pointer hover:text-[var(--fg)]">
                      티커 {renderSortIcon('ticker')}
                    </th>

                    {/* 4. 종목 (Sortable) */}
                    <th onClick={() => handleSort('stock_name')} className="hidden sm:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)]">
                      종목 {renderSortIcon('stock_name')}
                    </th>

                    {/* 5. 통화 */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-center">통화</th>

                    {/* 6. 단가 (No Sort) */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right">단가</th>

                    {/* 7. 수량 (No Sort) */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right">수량</th>

                    {/* 8. 거래금액 (Sortable, No Parentheses) */}
                    <th onClick={() => handleSort('total_amount')} className="hidden sm:table-cell py-2.5 px-3 text-right cursor-pointer hover:text-[var(--fg)] font-bold">
                      거래금액 {renderSortIcon('total_amount')}
                    </th>

                    {/* 9. 환율 */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right">환율</th>

                    {/* 10. 작업 */}
                    <th className="hidden sm:table-cell py-2.5 px-3 text-center w-24">작업</th>

                    {/* Mobile 3-Column Headers */}
                    <th className="sm:hidden py-2.5 px-3 text-left">매매일자 / 종목</th>
                    <th className="sm:hidden py-2.5 px-3 text-right w-36">단가·수량 / 거래금액</th>
                    <th className="sm:hidden py-2.5 px-2 text-center w-10">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 매매 내역이 없습니다. 오른쪽 상단 "+" 버튼을 눌러 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((item) => {
                      const isSell = item.trade_type === 'SELL';
                      const rawQty = item.quantity || 0;
                      // Signed quantity: negative for SELL, positive for BUY
                      const effectiveQty = isSell ? -Math.abs(rawQty) : Math.abs(rawQty);

                      const rate = item.exchange_rate || (item.currency === 'KRW' ? 1 : 1450);
                      const rawAmount = Math.abs(effectiveQty * item.price);
                      const baseAmount = currencyViewMode === 'KRW' ? rawAmount * rate : rawAmount;
                      const effectiveAmount = isSell ? -baseAmount : baseAmount;

                      const shortName = (item.ticker ? tickerToShortNameMap[item.ticker] : undefined) || item.stock_name;
                      const currSymbol = currencyViewMode === 'KRW' ? '₩' : item.currency === 'USD' ? '$' : item.currency === 'EUR' ? '€' : '';

                      return (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                          {/* 1. 매매일자 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-center text-xs text-[var(--fg-muted)] font-semibold">
                            {item.trade_date}
                          </td>

                          {/* 2. 구분 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                isSell
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isSell ? '매도' : '매수'}
                            </span>
                          </td>

                          {/* 3. 티커 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                            {item.ticker}
                          </td>

                          {/* 4. 종목 (Desktop: wide -> full name, narrow -> short name, clean without ticker) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-left font-bold text-[var(--fg)]">
                            <span className="hidden lg:inline">{item.stock_name}</span>
                            <span className="inline lg:hidden">{shortName}</span>
                          </td>

                          {/* 5. 통화 (Desktop: Flag icon only) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-center">
                            {renderFlagEmoji(item.currency)}
                          </td>

                          {/* 6. 단가 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right font-semibold">
                            {item.price.toLocaleString(undefined, { minimumFractionDigits: item.currency === 'KRW' ? 0 : 2 })}
                          </td>

                          {/* 7. 수량 (Desktop: 매도(-)는 빨간색, 매수(+)는 회색/노말) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right">
                            {effectiveQty < 0 ? (
                              <span className="text-red-500 dark:text-red-400 font-bold">
                                {effectiveQty.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[var(--fg-muted)] font-semibold">
                                {effectiveQty.toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* 8. 거래금액 (Desktop: 매도(-)는 빨간색, 매수(+)는 노말) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-right">
                            {effectiveAmount < 0 ? (
                              <span className="text-red-500 dark:text-red-400 font-bold">
                                - {currSymbol} {Math.round(Math.abs(effectiveAmount)).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[var(--fg)] font-bold">
                                {currSymbol} {Math.round(effectiveAmount).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* 9. 환율 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right text-xs text-[var(--fg-muted)] font-semibold">
                            {item.currency === 'KRW' ? '-' : `${rate.toLocaleString()} 원`}
                          </td>

                          {/* 10. 작업 (Desktop) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                                title="수정"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetId(item.id || null)}
                                className="p-1 text-red-500 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          {/* Mobile 3-Column Cells */}
                          {/* Mobile Col 1: 매매일자 + 구분 배지 (1행), 짧은 종목명 (2행) */}
                          <td className="sm:hidden py-2.5 px-3 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[var(--fg-muted)] font-bold">{item.trade_date}</span>
                              <span
                                className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                  isSell
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {isSell ? '매도' : '매수'}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-[var(--fg)] mt-0.5">
                              {shortName}
                            </p>
                          </td>

                          {/* Mobile Col 2: 단가·수량 (1행), 거래금액 (2행) */}
                          <td className="sm:hidden py-2.5 px-3 text-right">
                            <div className="text-[10px] font-medium text-[var(--fg-muted)] flex items-center justify-end gap-1">
                              <span>@{item.price.toLocaleString(undefined, { minimumFractionDigits: item.currency === 'KRW' ? 0 : 2 })}</span>
                              <span>·</span>
                              <span className={effectiveQty < 0 ? 'text-red-500 font-bold' : 'text-[var(--fg-muted)] font-semibold'}>
                                {effectiveQty.toLocaleString()}주
                              </span>
                            </div>
                            <div className="mt-0.5">
                              {effectiveAmount < 0 ? (
                                <span className="text-xs font-bold text-red-500 dark:text-red-400">
                                  - {currSymbol} {Math.round(Math.abs(effectiveAmount)).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-[var(--fg)]">
                                  {currSymbol} {Math.round(effectiveAmount).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Mobile Col 3: 작업 Popover Menu Button */}
                          <td className="sm:hidden py-2.5 px-2 text-center relative">
                            <button
                              onClick={() => setActivePopoverId(activePopoverId === item.id ? null : item.id || null)}
                              className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
                              aria-label="작업 메뉴"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Floating Touch Popover Menu */}
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
                                    setDeleteTargetId(item.id || null);
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Trade Create & Edit Modal */}
      <TradeModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingTrade}
        stocks={stocks}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTrade}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetId}
        title="매매 내역 삭제 확인"
        confirmText="삭제하기"
        confirmVariant="danger"
        message="선택하신 매매 내역을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다."
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
