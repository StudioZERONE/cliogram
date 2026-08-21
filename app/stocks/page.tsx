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
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { StockModal, StockRecordData } from '@/components/StockModal';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
import { useCounts } from '@/components/CountsProvider';
import { useToast } from '@/components/ToastProvider';
import { getCommonCodes, CommonCode } from '@/lib/codes';
import { lookupTickerInfo } from '@/lib/stock-ticker';

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
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoadingStocks, setIsLoadingStocks] = useState<boolean>(true);
  const [stocks, setStocks] = useState<StockRecord[]>([]);

  // Common Codes State for Display Name and Sort Order
  const [stockTypeCodes, setStockTypeCodes] = useState<CommonCode[]>([]);
  const [marketTypeCodes, setMarketTypeCodes] = useState<CommonCode[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Header Sorting State (Default: name asc)
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Mobile 3-Dot Action Menu State
  const [activeMobileActionTicker, setActiveMobileActionTicker] = useState<string | null>(null);
  const [mobileActionPos, setMobileActionPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);

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
  const [toggleTargetStock, setToggleTargetStock] = useState<StockRecord | null>(null);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchStocks();
      fetchCommonCodes();
    });
  }, [router]);

  const fetchCommonCodes = async () => {
    const [types, markets] = await Promise.all([
      getCommonCodes('STOCK_TYPE'),
      getCommonCodes('MARKET_TYPE'),
    ]);
    setStockTypeCodes(types);
    setMarketTypeCodes(markets);
  };

  const fetchStocks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .order('ticker', { ascending: true });

      let currentStocks = data || [];

      // Auto-sync missing trade tickers into stocks master
      const { data: userTrades } = await supabase
        .from('trades')
        .select('ticker, stock_name, currency')
        .eq('user_id', user.id);

      if (userTrades && userTrades.length > 0) {
        const existingTickerSet = new Set(currentStocks.map((s: any) => s.ticker?.toUpperCase()));
        const missingTrades = userTrades.filter(
          (t: any) => t.ticker && !existingTickerSet.has(t.ticker.toUpperCase())
        );

        if (missingTrades.length > 0) {
          const addedTickers = new Set<string>();
          for (const t of missingTrades) {
            const tick = t.ticker.toUpperCase().trim();
            if (addedTickers.has(tick)) continue;
            addedTickers.add(tick);

            const preset = lookupTickerInfo(tick);
            const stockName = t.stock_name || preset?.name || tick;
            const stockShortName = preset?.short_name || stockName;
            const stockCurrency = t.currency || preset?.currency || 'USD';
            const stockMarket = preset?.market || (stockCurrency === 'KRW' ? 'KRX' : 'NASDAQ');

            await supabase.from('stocks').insert([{
              user_id: user.id,
              ticker: tick,
              name: stockName,
              short_name: stockShortName,
              type: 'Growth',
              currency: stockCurrency,
              market: stockMarket,
              is_active: true,
            }]);
          }

          const { data: refetched } = await supabase
            .from('stocks')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true })
            .order('ticker', { ascending: true });

          if (refetched) currentStocks = refetched;
        }
      }

      const normalizedData: StockRecord[] = currentStocks.map((item: any) => ({
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
    } finally {
      setIsLoadingStocks(false);
    }
  };

  // Maps for Code Name and Sort Order
  const stockTypeCodeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    stockTypeCodes.forEach((c) => {
      map[c.code] = c.code_name;
    });
    return map;
  }, [stockTypeCodes]);

  const stockTypeSortOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    stockTypeCodes.forEach((c) => {
      map[c.code] = c.sort_order;
    });
    return map;
  }, [stockTypeCodes]);

  const marketTypeCodeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    marketTypeCodes.forEach((c) => {
      map[c.code] = c.code_name;
    });
    return map;
  }, [marketTypeCodes]);

  const marketTypeSortOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    marketTypeCodes.forEach((c) => {
      map[c.code] = c.sort_order;
    });
    return map;
  }, [marketTypeCodes]);

  // Header click sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Mobile 3-Dot Action Trigger
  const handleToggleMobileAction = (e: React.MouseEvent<HTMLButtonElement>, ticker: string) => {
    e.stopPropagation();
    if (activeMobileActionTicker === ticker) {
      setActiveMobileActionTicker(null);
      setMobileActionPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 170;
      setMobileActionPos({
        top: rect.top,
        right: Math.max(8, window.innerWidth - rect.right),
        openUp,
      });
      setActiveMobileActionTicker(ticker);
    }
  };

  const closeMobileAction = () => {
    setActiveMobileActionTicker(null);
    setMobileActionPos(null);
  };

  // Toggle Stock Active Status (Fail-safe, no technical alert thrown)
  const handleToggleActive = async (stock: StockRecord) => {
    const nextStatus = !stock.is_active;
    try {
      const { error } = await supabase
        .from('stocks')
        .update({ is_active: nextStatus })
        .eq('ticker', stock.ticker);

      if (error) {
        console.warn('Supabase PostgREST update notice:', error.message);
      }
      setStocks((prev) =>
        prev.map((s) => (s.ticker === stock.ticker ? { ...s, is_active: nextStatus } : s))
      );
    } catch (err: any) {
      console.error('handleToggleActive exception:', err);
      setStocks((prev) =>
        prev.map((s) => (s.ticker === stock.ticker ? { ...s, is_active: nextStatus } : s))
      );
    } finally {
      closeMobileAction();
      setToggleTargetStock(null);
    }
  };

  // Save handler for StockModal (Create / Edit)
  const handleSaveStock = async (data: StockRecordData & { short_name: string; is_active: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
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
      let { data: inserted, error } = await supabase
        .from('stocks')
        .insert([payload])
        .select();

      // Supabase 스키마 캐시 미갱신 방어 로직 (Schema Cache Fallback)
      if (error && (error.message?.includes('is_active') || error.message?.includes('short_name') || error.code === 'PGRST204')) {
        const fallbackPayload = {
          user_id: user.id,
          ticker: payload.ticker,
          name: payload.name,
          type: payload.type,
          currency: payload.currency,
          market: payload.market,
        };
        const fallbackRes = await supabase.from('stocks').insert([fallbackPayload]).select();
        inserted = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Failed to insert stock:', error);
        throw new Error(`종목 등록 실패: ${error.message}`);
      }

      if (inserted && inserted.length > 0) {
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
      let { error } = await supabase
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

      // Supabase 스키마 캐시 미갱신 방어 로직 (Schema Cache Fallback)
      if (error && (error.message?.includes('is_active') || error.message?.includes('short_name') || error.code === 'PGRST204')) {
        const fallbackRes = await supabase
          .from('stocks')
          .update({
            name: payload.name,
            type: payload.type,
            currency: payload.currency,
            market: payload.market,
          })
          .eq('ticker', payload.ticker);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Failed to update stock:', error);
        throw new Error(`종목 수정 실패: ${error.message}`);
      }

      setStocks((prev) =>
        prev.map((s) => (s.ticker === payload.ticker ? { ...s, ...payload } : s))
      );
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetTicker) return;
    const { error } = await supabase.from('stocks').delete().eq('ticker', deleteTargetTicker);
    if (!error) {
      setStocks((prev) => prev.filter((s) => s.ticker !== deleteTargetTicker));
      refreshCounts();
      toast.success(`종목(${deleteTargetTicker})이 삭제되었습니다.`);
    } else {
      toast.error(`종목 삭제 실패: ${error.message}`);
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
      let cmp = 0;

      if (sortField === 'type') {
        const orderA = stockTypeSortOrderMap[a.type] ?? 999;
        const orderB = stockTypeSortOrderMap[b.type] ?? 999;
        cmp = orderA - orderB;
      } else if (sortField === 'market') {
        const orderA = marketTypeSortOrderMap[a.market] ?? 999;
        const orderB = marketTypeSortOrderMap[b.market] ?? 999;
        cmp = orderA - orderB;
      } else {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;
      }

      if (cmp !== 0) {
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      // Secondary Tie-Breaker: Ticker ASC
      return a.ticker.localeCompare(b.ticker);
    });

    return result;
  }, [
    stocks,
    searchQuery,
    typeFilter,
    marketFilter,
    statusFilter,
    sortField,
    sortDirection,
    stockTypeSortOrderMap,
    marketTypeSortOrderMap,
  ]);

  // Options for FilterDropdowns based on common_codes sort_order
  const typeFilterOptions: FilterOption[] = useMemo(() => {
    const options: FilterOption[] = [{ value: 'ALL', label: '전체' }];
    stockTypeCodes.forEach((c) => {
      options.push({ value: c.code, label: c.code_name });
    });
    return options;
  }, [stockTypeCodes]);

  const marketFilterOptions: FilterOption[] = useMemo(() => {
    const options: FilterOption[] = [{ value: 'ALL', label: '전체' }];
    marketTypeCodes.forEach((c) => {
      options.push({ value: c.code, label: c.code_name });
    });
    return options;
  }, [marketTypeCodes]);

  const statusFilterOptions: FilterOption[] = [
    { value: 'ALL', label: '전체' },
    { value: 'ACTIVE', label: '사용중' },
    { value: 'INACTIVE', label: '사용중지' },
  ];

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  const renderFlagEmoji = (curr: string) => {
    if (curr === 'USD') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="미국 달러">🇺🇸</span>;
    if (curr === 'KRW') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="대한민국 원">🇰🇷</span>;
    if (curr === 'EUR') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="유로">🇪🇺</span>;
    return <span className="text-xs sm:text-sm font-bold text-[var(--fg-muted)]">{curr}</span>;
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-[var(--fg-muted)] opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="종목 관리" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner (Hidden on Mobile, Visible on Desktop) */}
          <div className="hidden lg:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-xs items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                종목 기준정보 관리
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                매매 및 배당 관리를 위한 종목 기준정보(티커, 종목명, 짧은 종목명, 유형, 상장 시장, 상태)를 통합 등록하고 관리합니다.
              </p>
            </div>
          </div>

          {/* Main Full-Width Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs space-y-4">
            {/* Top Section Header Row: Title & Top-Right Circular Add Button */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
              <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
                <span>종목 목록</span>
                <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {isLoadingStocks ? '...' : `${filteredAndSortedStocks.length} / ${stocks.length}개`}
                </span>
              </h3>

              {/* Top-Right Circular Green Add Button */}
              <button
                onClick={() =>
                  setStockModal({
                    isOpen: true,
                    mode: 'create',
                    initialData: null,
                  })
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                title="신규 종목 등록"
                aria-label="신규 종목 등록"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Filter Toolbar: Structured 2-Row Grid on Mobile, 1-Row Flex on Desktop */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 pb-1">
              {/* Row 1 (Mobile: Full Width Search Bar) */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                <input
                  type="text"
                  placeholder="종목명, 짧은 종목명, 티커 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                />
              </div>

              {/* Row 2 (Mobile: 3-Column Equal Grid for 3 Comboboxes) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full sm:w-auto sm:flex sm:items-center">
                {/* Stock Type Filter Combobox */}
                <FilterDropdown
                  labelPrefix="종목 유형"
                  mobileLabelPrefix="유형"
                  value={typeFilter}
                  options={typeFilterOptions}
                  onChange={setTypeFilter}
                  className="w-full sm:w-auto"
                />

                {/* Market Type Filter Combobox (상장 시장) */}
                <FilterDropdown
                  labelPrefix="상장 시장"
                  mobileLabelPrefix="시장"
                  value={marketFilter}
                  options={marketFilterOptions}
                  onChange={setMarketFilter}
                  className="w-full sm:w-auto"
                />

                {/* Status Filter Combobox */}
                <FilterDropdown
                  labelPrefix="상태"
                  mobileLabelPrefix="상태"
                  value={statusFilter}
                  options={statusFilterOptions}
                  onChange={setStatusFilter}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>

            {/* High Density Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                  <tr>
                    {/* Mobile Only Header: 짧은 종목명 */}
                    <th
                      onClick={() => handleSort('short_name')}
                      className="lg:hidden py-3 px-3.5 text-left cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>짧은 종목명</span>
                        {renderSortIcon('short_name')}
                      </div>
                    </th>

                    {/* Desktop Header: 종목명 */}
                    <th
                      onClick={() => handleSort('name')}
                      className="hidden lg:table-cell py-3 px-3.5 text-left cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>종목명</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>

                    {/* Desktop Header: 짧은 종목명 */}
                    <th
                      onClick={() => handleSort('short_name')}
                      className="hidden lg:table-cell py-3 px-3 text-left cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>짧은 종목명</span>
                        {renderSortIcon('short_name')}
                      </div>
                    </th>

                    {/* Desktop Header: 티커 */}
                    <th
                      onClick={() => handleSort('ticker')}
                      className="hidden lg:table-cell py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>티커</span>
                        {renderSortIcon('ticker')}
                      </div>
                    </th>

                    {/* Desktop Header: 유형 */}
                    <th
                      onClick={() => handleSort('type')}
                      className="hidden lg:table-cell py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>유형</span>
                        {renderSortIcon('type')}
                      </div>
                    </th>

                    {/* Common Header: 통화 */}
                    <th
                      onClick={() => handleSort('currency')}
                      className="py-3 px-2.5 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none w-16 sm:w-auto"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>통화</span>
                        {renderSortIcon('currency')}
                      </div>
                    </th>

                    {/* Desktop Header: 상장 시장 */}
                    <th
                      onClick={() => handleSort('market')}
                      className="hidden lg:table-cell py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>상장 시장</span>
                        {renderSortIcon('market')}
                      </div>
                    </th>

                    {/* Desktop Header: 상태 */}
                    <th
                      onClick={() => handleSort('is_active')}
                      className="hidden lg:table-cell py-3 px-3 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors group select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>상태</span>
                        {renderSortIcon('is_active')}
                      </div>
                    </th>

                    {/* Desktop Header: 관리 */}
                    <th className="hidden lg:table-cell py-3 px-3 text-center w-24">관리</th>

                    {/* Mobile Header: 관리 */}
                    <th className="lg:hidden py-3 px-2 text-center w-12">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  {isLoadingStocks ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs sm:text-sm text-[var(--fg-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                          <span>종목 목록을 불러오는 중입니다...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAndSortedStocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs sm:text-sm text-[var(--fg-muted)]">
                        조회된 종목 데이터가 없습니다. 상단의 &quot;+ 버튼&quot;을 눌러 신규 종목을 추가해 주세요.
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
                        {/* Mobile Only Cell: 짧은 종목명 */}
                        <td className="lg:hidden py-3 px-3.5 text-left font-bold text-[var(--fg)] text-xs">
                          {item.short_name || item.name}
                        </td>

                        {/* Desktop Name */}
                        <td className="hidden lg:table-cell py-3 px-3.5 text-left font-bold text-[var(--fg)] text-xs sm:text-sm">
                          {item.name}
                        </td>

                        {/* Desktop Short Name */}
                        <td className="hidden lg:table-cell py-3 px-3 text-left font-semibold text-[var(--fg-muted)] text-xs">
                          {item.short_name}
                        </td>

                        {/* Desktop Ticker */}
                        <td className="hidden lg:table-cell py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {item.ticker}
                        </td>

                        {/* Desktop Type */}
                        <td className="hidden lg:table-cell py-3 px-3 text-center">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {stockTypeCodeNameMap[item.type] || item.type}
                          </span>
                        </td>

                        {/* Common Currency Flag */}
                        <td className="py-3 px-2.5 text-center">
                          {renderFlagEmoji(item.currency)}
                        </td>

                        {/* Desktop Market */}
                        <td className="hidden lg:table-cell py-3 px-3 text-center text-xs text-[var(--fg-muted)] font-semibold">
                          {marketTypeCodeNameMap[item.market] || item.market}
                        </td>

                        {/* Desktop Status Toggle */}
                        <td className="hidden lg:table-cell py-3 px-3 text-center">
                          <button
                            onClick={() => setToggleTargetStock(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold cursor-pointer transition-colors ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                            }`}
                            title="클릭하여 사용 상태 변경 확인"
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

                        {/* Desktop Actions */}
                        <td className="hidden lg:table-cell py-3 px-3 text-center">
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

                        {/* Mobile Actions (3-Dot Button & Touch-Optimized Popover Menu) */}
                        <td className="lg:hidden py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMobileAction(e, item.ticker)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--fg-muted)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer mx-auto shrink-0"
                            title="작업 메뉴"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMobileActionTicker === item.ticker && mobileActionPos && (
                            <>
                              {/* Backdrop to close popover */}
                              <div
                                className="fixed inset-0 z-40 bg-transparent cursor-default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeMobileAction();
                                }}
                              />
                              {/* Floating Popover Menu with Touch Padding & Dividers */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'fixed',
                                  right: `${mobileActionPos.right}px`,
                                  ...(mobileActionPos.openUp
                                    ? { bottom: `${window.innerHeight - mobileActionPos.top + 6}px` }
                                    : { top: `${mobileActionPos.top + 32}px` }),
                                }}
                                className="z-50 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl backdrop-blur-md text-left text-xs divide-y divide-[var(--border)] animate-in fade-in-50 zoom-in-95 cursor-default"
                              >
                                {/* Edit */}
                                <div className="pb-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeMobileAction();
                                      setStockModal({
                                        isOpen: true,
                                        mode: 'edit',
                                        initialData: item,
                                      });
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[42px] font-bold text-[var(--fg)] hover:bg-[var(--bg)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span>정보 수정</span>
                                  </button>
                                </div>

                                {/* Toggle Active Confirmation */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeMobileAction();
                                      setToggleTargetStock(item);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[42px] font-bold text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                                  >
                                    {item.is_active ? (
                                      <>
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                        <span className="text-red-500">사용 중지</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span className="text-emerald-500">사용으로 변경</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Delete */}
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeMobileAction();
                                      setDeleteTargetTicker(item.ticker);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[42px] font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 shrink-0" />
                                    <span>종목 삭제</span>
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

      {/* Stock Registration/Edit Modal */}
      <StockModal
        isOpen={stockModal.isOpen}
        mode={stockModal.mode}
        initialData={stockModal.initialData}
        existingTickers={stocks.map((s) => s.ticker)}
        onClose={() => setStockModal({ ...stockModal, isOpen: false })}
        onSave={handleSaveStock}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetTicker}
        title="종목 삭제 확인"
        message={`선택하신 종목 (${deleteTargetTicker})을 정말 삭제하시겠습니까?\n삭제 후에는 등록된 종목 정보가 제거됩니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetTicker(null)}
      />

      {/* Confirm Status Change Modal */}
      <ConfirmDeleteModal
        isOpen={!!toggleTargetStock}
        title="종목 사용 상태 변경 확인"
        confirmText="상태 변경하기"
        confirmVariant="primary"
        message={
          toggleTargetStock
            ? toggleTargetStock.is_active
              ? `선택하신 종목 (${toggleTargetStock.short_name || toggleTargetStock.name})의 사용 상태를 '[사용중지]'로 변경하시겠습니까?\n[사용중지] 시 신규 매매 및 배당 등록 시 선택 목록에서 제외됩니다.`
              : `선택하신 종목 (${toggleTargetStock.short_name || toggleTargetStock.name})의 사용 상태를 '[사용중]'으로 변경하시겠습니까?\n신규 매매 및 배당 등록 시 정상 선택할 수 있게 됩니다.`
            : ''
        }
        onConfirm={() => {
          if (toggleTargetStock) {
            handleToggleActive(toggleTargetStock);
          }
        }}
        onClose={() => setToggleTargetStock(null)}
      />
    </div>
  );
}
