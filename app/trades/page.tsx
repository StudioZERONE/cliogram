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
  const [yearFilter, setYearFilter] = useState<string>('ALL');
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
      fetchStocks();
      fetchTrades();
    });
  }, [router]);

  const fetchStocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('stocks')
      .select('id, ticker, name, short_name, currency, market, is_active')
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
          market: s.market || '',
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
      const normalizedTrades = data.map((t: any) => {
        // If SELL and quantity is positive in DB, normalize to negative
        if (t.trade_type === 'SELL' && t.quantity > 0) {
          const negQty = -Math.abs(t.quantity);
          const negAmount = -Math.abs(t.total_amount || t.quantity * t.price);
          const negAmountKrw = -Math.abs(t.total_amount_krw || (t.quantity * t.price * (t.exchange_rate || 1)));

          // Asynchronously sync the negative quantity back to Supabase
          supabase.from('trades').update({
            quantity: negQty,
            total_amount: negAmount,
            total_amount_krw: negAmountKrw,
          }).eq('id', t.id).then();

          return {
            ...t,
            quantity: negQty,
            total_amount: negAmount,
            total_amount_krw: negAmountKrw,
          };
        }
        return t;
      });

      setTrades(normalizedTrades as TradeRecordData[]);
    }
  };

  // Stock Master Lookup Map (Ticker -> StockOption) with robust trimming and case-insensitive keys
  const stocksMap = useMemo(() => {
    const map: Record<string, StockOption> = {};
    stocks.forEach((s) => {
      if (s.ticker) {
        map[s.ticker] = s;
        map[s.ticker.trim()] = s;
        map[s.ticker.trim().toUpperCase()] = s;
        map[s.ticker.trim().toLowerCase()] = s;
      }
    });
    return map;
  }, [stocks]);

  // Helper to resolve stock names cleanly without ever showing ticker as name
  const resolveStockDisplayName = (itemTicker: string, legacyStockName?: string) => {
    const stock = stocksMap[itemTicker] || stocksMap[itemTicker?.trim()?.toUpperCase()];
    if (stock?.name) {
      return {
        fullName: stock.name,
        shortName: stock.short_name || stock.name,
      };
    }

    // If not matched in stocks master, check legacy stock_name and strip any (TICKER) prefix
    if (legacyStockName && legacyStockName.trim()) {
      const match = legacyStockName.match(/\(([^)]+)\)/);
      const cleaned = match ? match[1] : legacyStockName;
      return { fullName: cleaned, shortName: cleaned };
    }

    return { fullName: itemTicker, shortName: itemTicker };
  };

  // Universal Currency Symbol Helper (Always outputs appropriate symbol for every currency)
  const getCurrencySymbol = (mode: CurrencyViewMode, curr?: string) => {
    if (mode === 'KRW') return '₩';
    if (curr === 'USD') return '$';
    if (curr === 'KRW') return '₩';
    if (curr === 'EUR') return '€';
    if (curr === 'JPY' || curr === 'CNY') return '¥';
    return curr || '$';
  };

  // Dynamic Year Filter Options extracted from recorded trade dates
  const yearFilterOptions: FilterOption[] = useMemo(() => {
    const yearsSet = new Set<string>();
    trades.forEach((t) => {
      if (t.trade_date && t.trade_date.length >= 4) {
        yearsSet.add(t.trade_date.substring(0, 4));
      }
    });
    yearsSet.add(new Date().getFullYear().toString());
    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'ALL', label: '전체' },
      ...sortedYears.map((y) => ({ value: y, label: `${y}년` })),
    ];
  }, [trades]);

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

  // Filter & Sort Trades List with Stock Master JOIN
  const filteredTrades = useMemo(() => {
    return trades
      .filter((item) => {
        const { fullName, shortName } = resolveStockDisplayName(item.ticker, (item as any).stock_name);

        // Search Query (ticker, stock name, short name, notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = item.ticker?.toLowerCase().includes(q);
          const matchName = fullName.toLowerCase().includes(q);
          const matchShortName = shortName.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchTicker && !matchName && !matchShortName && !matchNotes) return false;
        }

        // Year Filter
        if (yearFilter !== 'ALL' && !item.trade_date?.startsWith(yearFilter)) return false;

        // Type Filter
        if (typeFilter !== 'ALL' && item.trade_type !== typeFilter) return false;

        // Currency Filter
        if (currencyFilter !== 'ALL' && item.currency !== currencyFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;

        if (sortField === 'total_amount') {
          const valA = currencyViewMode === 'KRW' ? (a.total_amount_krw || a.quantity * a.price * (a.exchange_rate || 1)) : (a.total_amount || a.quantity * a.price);
          const valB = currencyViewMode === 'KRW' ? (b.total_amount_krw || b.quantity * b.price * (b.exchange_rate || 1)) : (b.total_amount || b.quantity * b.price);
          diff = valA - valB;
        } else if (sortField === 'ticker') {
          diff = (a.ticker || '').localeCompare(b.ticker || '');
        } else if (sortField === 'stock_name') {
          const nameA = resolveStockDisplayName(a.ticker, (a as any).stock_name).fullName;
          const nameB = resolveStockDisplayName(b.ticker, (b as any).stock_name).fullName;
          diff = nameA.localeCompare(nameB);
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
  }, [trades, searchQuery, yearFilter, typeFilter, currencyFilter, sortField, sortDirection, currencyViewMode, stocksMap]);

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

    const payload: any = {
      user_id: user.id,
      trade_date: tradeData.trade_date,
      ticker: tradeData.ticker,
      trade_type: tradeData.trade_type,
      quantity: tradeData.quantity,
      price: tradeData.price,
      currency: tradeData.currency,
      exchange_rate: tradeData.exchange_rate,
      total_amount: tradeData.total_amount,
      total_amount_krw: tradeData.total_amount_krw,
      fee: tradeData.fee,
      tax: tradeData.tax,
      foreign_fee: tradeData.foreign_fee,
      foreign_tax: tradeData.foreign_tax,
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
    return <span className="text-xs text-[var(--fg)]">{curr}</span>;
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
            {/* Desktop Toolbar: 1-Row Flex with Year, Type, Currency Filters */}
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
                  labelPrefix="년도"
                  options={yearFilterOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                />
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

            {/* Mobile Toolbar: 2-Row Structured Grid with 3 Filters */}
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
              {/* Row 2: 3 Equal Columns Filter Comboboxes (년도, 구분, 통화) */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <FilterDropdown
                  labelPrefix="년도"
                  mobileLabelPrefix="년도"
                  options={yearFilterOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                />
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

            {/* Data Table View (Tightly Clustered Numbers with Intentional Spacer Column between 환율 and 비고) */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm table-fixed">
                {/* Fixed tight column widths for standard metrics & auto-expansion for 종목 and 비고 */}
                <colgroup className="hidden sm:table-column-group">
                  <col className="w-[105px] min-[1920px]:w-[115px]" /> {/* 1. 매매일자 */}
                  <col className="w-[65px] min-[1920px]:w-[70px]" />   {/* 2. 구분 */}
                  <col className="w-[85px] min-[1920px]:w-[95px]" />   {/* 3. 티커 */}
                  <col />                                              {/* 4. 종목 (가변 폭) */}
                  {/* 밀집형 수치 데이터 클러스터 (통화, 단가, 수량, 거래금액, 환율) */}
                  <col className="w-[55px] min-[1920px]:w-[60px]" />   {/* 5. 통화 */}
                  <col className="w-[110px] min-[1920px]:w-[125px]" /> {/* 6. 단가 */}
                  <col className="w-[95px] min-[1920px]:w-[105px]" />  {/* 7. 수량 */}
                  <col className="w-[135px] min-[1920px]:w-[145px]" /> {/* 8. 거래금액 */}
                  <col className="w-[110px] min-[1920px]:w-[120px]" /> {/* 9. 환율 */}
                  {/* 10. 환율-비고 완충 분리 영역 (1920px 이상에서 150px로 시원하게 확장) */}
                  <col className="w-[24px] min-[1920px]:w-[150px]" />
                  <col />                                              {/* 11. 비고 (가변 폭) */}
                  <col className="w-[75px] min-[1920px]:w-[85px]" />   {/* 12. 작업 */}
                </colgroup>
                <colgroup className="sm:hidden">
                  <col className="w-[50%]" /> {/* 1. 매매일자 / 종목 */}
                  <col className="w-[40%]" /> {/* 2. 단가·수량 / 거래금액 */}
                  <col className="w-[10%]" /> {/* 3. 작업 */}
                </colgroup>

                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-medium text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 매매일자 (Sortable) */}
                    <th onClick={() => handleSort('trade_date')} className="hidden sm:table-cell py-2.5 px-3 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      매매일자 {renderSortIcon('trade_date')}
                    </th>

                    {/* 2. 구분 */}
                    <th className="hidden sm:table-cell py-2.5 px-2 text-center font-medium">구분</th>

                    {/* 3. 티커 (Sortable) */}
                    <th onClick={() => handleSort('ticker')} className="hidden sm:table-cell py-2.5 px-2.5 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      티커 {renderSortIcon('ticker')}
                    </th>

                    {/* 4. 종목 (Sortable, Joined from stocks master) */}
                    <th onClick={() => handleSort('stock_name')} className="hidden sm:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      종목 {renderSortIcon('stock_name')}
                    </th>

                    {/* 5. 통화 */}
                    <th className="hidden sm:table-cell py-2.5 px-2 text-center font-medium">통화</th>

                    {/* 6. 단가 (No Sort) */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right font-medium">단가</th>

                    {/* 7. 수량 (No Sort) */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right font-medium">수량</th>

                    {/* 8. 거래금액 (Sortable, No Parentheses) */}
                    <th onClick={() => handleSort('total_amount')} className="hidden sm:table-cell py-2.5 px-3 text-right cursor-pointer hover:text-[var(--fg)] font-medium">
                      거래금액 {renderSortIcon('total_amount')}
                    </th>

                    {/* 9. 환율 */}
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right font-medium">환율</th>

                    {/* 10. 환율과 비고 사이 완충 스페이서 컬럼 */}
                    <th className="hidden lg:table-cell p-0" aria-hidden="true" />

                    {/* 11. 비고 (Desktop Only) */}
                    <th className="hidden lg:table-cell py-2.5 px-3 text-left font-medium">비고</th>

                    {/* 12. 작업 */}
                    <th className="hidden sm:table-cell py-2.5 px-2 text-center font-medium">작업</th>

                    {/* Mobile 3-Column Headers */}
                    <th className="sm:hidden py-2.5 px-3 text-left font-medium">매매일자 / 종목</th>
                    <th className="sm:hidden py-2.5 px-3 text-right font-medium">단가·수량 / 거래금액</th>
                    <th className="sm:hidden py-2.5 px-2 text-center font-medium">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 매매 내역이 없습니다. 오른쪽 상단 "+" 버튼을 눌러 추가해 주세요.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((item) => {
                      const isSell = item.trade_type === 'SELL' || (item.quantity !== undefined && item.quantity < 0);
                      const displayQty = item.quantity || 0;
                      const rate = item.exchange_rate || (item.currency === 'KRW' ? 1 : 1450);

                      // Converted Price based on Currency Toggle ($ vs 원)
                      const displayPrice = currencyViewMode === 'KRW' && item.currency !== 'KRW'
                        ? item.price * rate
                        : item.price;

                      // Raw Amount: item.total_amount directly from DB or calculated
                      const rawAmount = item.total_amount !== undefined ? item.total_amount : displayQty * item.price;
                      const displayAmount = currencyViewMode === 'KRW'
                        ? (item.total_amount_krw !== undefined ? item.total_amount_krw : rawAmount * rate)
                        : rawAmount;

                      const { fullName, shortName } = resolveStockDisplayName(item.ticker, (item as any).stock_name);
                      const currSymbol = getCurrencySymbol(currencyViewMode, item.currency);

                      return (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                          {/* 1. 매매일자 (Desktop: Standard text) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-center text-xs text-[var(--fg)] font-normal">
                            {item.trade_date}
                          </td>

                          {/* 2. 구분 (Desktop: Normal non-bold badge) */}
                          <td className="hidden sm:table-cell py-3 px-2 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-normal border ${
                                isSell
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isSell ? '매도' : '매수'}
                            </span>
                          </td>

                          {/* 3. 티커 (Desktop: Normal standard text) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-center text-xs text-[var(--fg)] font-normal">
                            {item.ticker}
                          </td>

                          {/* 4. 종목 (Desktop: Stock master list typography - font-bold text-[var(--fg)] text-xs sm:text-sm) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm truncate" title={fullName}>
                            <span className="hidden lg:inline">{fullName}</span>
                            <span className="inline lg:hidden">{shortName}</span>
                          </td>

                          {/* 5. 통화 (Desktop: Flag icon only) */}
                          <td className="hidden sm:table-cell py-3 px-2 text-center">
                            {renderFlagEmoji(item.currency)}
                          </td>

                          {/* 6. 단가 (Desktop: Dynamically converted with currency symbol and commas) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right text-xs text-[var(--fg)] font-normal">
                            {currSymbol} {currencyViewMode === 'KRW'
                              ? Math.round(displayPrice).toLocaleString()
                              : displayPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: item.currency === 'KRW' ? 0 : 2,
                                  maximumFractionDigits: 4,
                                })}
                          </td>

                          {/* 7. 수량 (Desktop: Formatted with commas, 매도(-)는 빨간색, 매수(+)는 또렷한 텍스트) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right text-xs font-normal">
                            {isSell ? (
                              <span className="text-red-500 dark:text-red-400">
                                {displayQty.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[var(--fg)]">
                                {displayQty.toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* 8. 거래금액 (Desktop: Formatted with currency symbol and commas, 매도(-)는 빨간색) */}
                          <td className="hidden sm:table-cell py-3 px-3 text-right text-xs font-normal">
                            {isSell ? (
                              <span className="text-red-500 dark:text-red-400">
                                - {currSymbol} {Math.round(Math.abs(displayAmount)).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[var(--fg)]">
                                {currSymbol} {Math.round(displayAmount).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* 9. 환율 (Desktop: 또렷한 텍스트 font-normal) */}
                          <td className="hidden sm:table-cell py-3 px-2.5 text-right text-xs text-[var(--fg)] font-normal">
                            {item.currency === 'KRW' ? '-' : `${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 원`}
                          </td>

                          {/* 10. 환율과 비고 사이 완충 스페이서 셀 (우측 정렬 환율과 좌측 정렬 비고가 붙지 않도록 분리) */}
                          <td className="hidden lg:table-cell p-0 pointer-events-none" aria-hidden="true" />

                          {/* 11. 비고 (Desktop: 가변 폭 자동 조절, 또렷한 텍스트 font-normal) */}
                          <td className="hidden lg:table-cell py-3 px-3 text-left text-xs text-[var(--fg)] font-normal truncate" title={item.notes || ''}>
                            {item.notes || '-'}
                          </td>

                          {/* 12. 작업 (Desktop) */}
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
                                onClick={() => setDeleteTargetId(item.id || null)}
                                className="p-1 text-red-500 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          {/* Mobile 3-Column Cells */}
                          {/* Mobile Col 1: 매매일자(non-bold) + 구분 배지 (1행), 줄간격 확대 + 짧은 종목명 (2행) */}
                          <td className="sm:hidden py-3 px-3 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--fg)] font-normal">{item.trade_date}</span>
                              <span
                                className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold border ${
                                  isSell
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {isSell ? '매도' : '매수'}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-[var(--fg)] mt-1.5 truncate">
                              {shortName}
                            </p>
                          </td>

                          {/* Mobile Col 2: 단가(통화기호 포함, non-bold) x 수량(non-bold) (1행), 거래금액(통화기호 포함) (2행) */}
                          <td className="sm:hidden py-3 px-3 text-right">
                            <div className="text-xs font-normal text-[var(--fg)] flex items-center justify-end">
                              <span>
                                {currSymbol} {currencyViewMode === 'KRW'
                                  ? Math.round(displayPrice).toLocaleString()
                                  : displayPrice.toLocaleString(undefined, {
                                      minimumFractionDigits: item.currency === 'KRW' ? 0 : 2,
                                    })}
                              </span>
                              <span className="text-[var(--fg-muted)] font-normal mx-1">x</span>
                              <span className={isSell ? 'text-red-500 font-normal' : 'text-[var(--fg)] font-normal'}>
                                {displayQty.toLocaleString()}주
                              </span>
                            </div>
                            <div className="mt-1.5">
                              {isSell ? (
                                <span className="text-xs font-bold text-red-500 dark:text-red-400">
                                  - {currSymbol} {Math.round(Math.abs(displayAmount)).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-[var(--fg)]">
                                  {currSymbol} {Math.round(displayAmount).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Mobile Col 3: 작업 Popover Menu Button */}
                          <td className="sm:hidden py-3 px-2 text-center relative">
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
