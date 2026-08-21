'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Edit2, Trash2, Layers, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
import { CurrencyViewToggle, CurrencyViewMode } from '@/components/CurrencyViewToggle';
import { TradeModal, TradeRecordData, StockOption, AccountOption } from '@/components/TradeModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useCounts } from '@/components/CountsProvider';

type SortField = 'trade_date' | 'ticker' | 'stock_name' | 'total_amount';
type SortDirection = 'asc' | 'desc';

// Helper to compute cumulative remaining quantity per (account_id, ticker) chronologically
export function computeRemainingQuantities(rawTrades: TradeRecordData[]): TradeRecordData[] {
  const sortedAsc = [...rawTrades].sort((a, b) => {
    const dateDiff = new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  const balances: Record<string, number> = {};
  const calculatedMap = new Map<string, number>();

  for (const t of sortedAsc) {
    const accId = t.account_id || 'no_account';
    const tickerKey = t.ticker?.trim()?.toUpperCase() || '';
    const key = `${accId}_${tickerKey}`;
    const prev = balances[key] || 0;
    const current = prev + (t.quantity || 0);
    balances[key] = current;
    if (t.id) {
      calculatedMap.set(t.id, current);
    }
  }

  return rawTrades.map((t) => ({
    ...t,
    remaining_quantity: t.id && calculatedMap.has(t.id) ? calculatedMap.get(t.id) : (t.remaining_quantity || 0),
  }));
}

export default function TradesPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Core Data
  const [trades, setTrades] = useState<TradeRecordData[]>([]);
  const [stocks, setStocks] = useState<StockOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // Toolbar & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
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
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(true);

  // Mobile Action Popover
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      loadAllData();
    });
  }, [router]);

  const loadAllData = async () => {
    setIsLoadingTrades(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [accountsRes, stocksRes, tradesRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, account_name, broker_name, account_number, is_active')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('stocks')
          .select('id, ticker, name, short_name, currency, market, is_active')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('trade_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      if (accountsRes.data) {
        setAccounts(
          accountsRes.data.map((a: any) => ({
            id: a.id,
            account_name: a.account_name,
            broker_name: a.broker_name || a.account_name,
            account_number: a.account_number || '',
            is_active: a.is_active ?? true,
          }))
        );
      }

      if (stocksRes.data) {
        setStocks(
          stocksRes.data.map((s: any) => ({
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

      if (tradesRes.data) {
        const normalizedTrades = tradesRes.data.map((t: any) => {
          if (t.trade_type === 'SELL' && t.quantity > 0) {
            const negQty = -Math.abs(t.quantity);
            const negAmount = -Math.abs(t.total_amount || t.quantity * t.price);
            const negAmountKrw = -Math.abs(t.total_amount_krw || (t.quantity * t.price * (t.exchange_rate || 1)));

            return {
              ...t,
              quantity: negQty,
              total_amount: negAmount,
              total_amount_krw: negAmountKrw,
            };
          }
          return t;
        });

        const withRemaining = computeRemainingQuantities(normalizedTrades as TradeRecordData[]);
        setTrades(withRemaining);

        setYearFilter((prev) => {
          if (prev !== 'ALL') return prev;
          const distinctYears = Array.from(
            new Set(
              normalizedTrades
                .map((t: any) => t.trade_date?.substring(0, 4))
                .filter((y: any): y is string => Boolean(y && y.length === 4))
            )
          ).sort((a: string, b: string) => b.localeCompare(a));

          return distinctYears.length > 0 ? distinctYears[0] : 'ALL';
        });
      }
    } finally {
      setIsLoadingTrades(false);
    }
  };

  const fetchAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('accounts')
      .select('id, account_name, broker_name, account_number, is_active')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (data) {
      setAccounts(
        data.map((a: any) => ({
          id: a.id,
          account_name: a.account_name,
          broker_name: a.broker_name || a.account_name,
          account_number: a.account_number || '',
          is_active: a.is_active ?? true,
        }))
      );
    }
  };

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
    setIsLoadingTrades(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) {
        const normalizedTrades = data.map((t: any) => {
          if (t.trade_type === 'SELL' && t.quantity > 0) {
            const negQty = -Math.abs(t.quantity);
            const negAmount = -Math.abs(t.total_amount || t.quantity * t.price);
            const negAmountKrw = -Math.abs(t.total_amount_krw || (t.quantity * t.price * (t.exchange_rate || 1)));

            return {
              ...t,
              quantity: negQty,
              total_amount: negAmount,
              total_amount_krw: negAmountKrw,
            };
          }
          return t;
        });
        const withRemaining = computeRemainingQuantities(normalizedTrades as TradeRecordData[]);
        setTrades(withRemaining);
      }
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Account Lookup Map (id -> AccountOption) for instant 0ms account resolution
  const accountsMap = useMemo(() => {
    const map: Record<string, AccountOption> = {};
    accounts.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

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

  // Dynamic Account Filter Options (Account Name Priority)
  const accountFilterOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: '전체' },
      ...accounts.map((acc) => ({
        value: acc.id,
        label: acc.account_name || acc.broker_name || '',
      })),
    ];
  }, [accounts]);

  // Dynamic Distinct Year Filter Options extracted purely from recorded trade dates
  const yearFilterOptions: FilterOption[] = useMemo(() => {
    const distinctYears = Array.from(
      new Set(
        trades
          .map((t) => t.trade_date?.substring(0, 4))
          .filter((y): y is string => Boolean(y && y.length === 4))
      )
    ).sort((a, b) => b.localeCompare(a));

    return [
      { value: 'ALL', label: '전체' },
      ...distinctYears.map((y) => ({ value: y, label: `${y}년` })),
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

  // Filter & Sort Trades List with Stock Master JOIN & Account Filter
  const filteredTrades = useMemo(() => {
    return trades
      .filter((item) => {
        const { fullName, shortName } = resolveStockDisplayName(item.ticker, (item as any).stock_name);

        // Search Query (ticker, stock name, short name, notes, broker name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = item.ticker?.toLowerCase().includes(q);
          const matchName = fullName.toLowerCase().includes(q);
          const matchShortName = shortName.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          const matchAccount = item.accounts?.account_name?.toLowerCase().includes(q) || item.accounts?.broker_name?.toLowerCase().includes(q);
          if (!matchTicker && !matchName && !matchShortName && !matchNotes && !matchAccount) return false;
        }

        // Account Filter
        if (accountFilter !== 'ALL' && item.account_id !== accountFilter) return false;

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
  }, [trades, searchQuery, accountFilter, yearFilter, typeFilter, currencyFilter, sortField, sortDirection, currencyViewMode, stocksMap]);

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

    // 1. Auto-insert into stocks master table if ticker is new
    const cleanTicker = tradeData.ticker?.trim().toUpperCase();
    const existingStock = stocks.find((s) => s.ticker?.toUpperCase() === cleanTicker);
    if (!existingStock && cleanTicker) {
      const stockName = tradeData.resolvedStock?.name || cleanTicker;
      const stockShortName = tradeData.resolvedStock?.short_name || stockName;
      const stockType = tradeData.resolvedStock?.type || 'Growth';
      const stockCurrency = tradeData.currency || 'USD';
      const stockMarket = tradeData.resolvedStock?.market || '';

      const { error: stockErr } = await supabase.from('stocks').insert([{
        user_id: user.id,
        ticker: cleanTicker,
        name: stockName,
        short_name: stockShortName,
        type: stockType,
        currency: stockCurrency,
        market: stockMarket,
        is_active: true,
      }]);

      if (!stockErr) {
        await fetchStocks();
      }
    }

    const payload: any = {
      user_id: user.id,
      account_id: tradeData.account_id,
      trade_date: tradeData.trade_date,
      ticker: cleanTicker,
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
      await supabase.from('trades').update(payload).eq('id', tradeData.id);
    } else {
      await supabase.from('trades').insert([payload]);
    }

    // Recalculate remaining quantities for all trades of this account + ticker
    const { data: updatedAllTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (updatedAllTrades) {
      const withRem = computeRemainingQuantities(updatedAllTrades as TradeRecordData[]);
      // Batch sync remaining_quantity in DB for changed records
      for (const t of withRem) {
        if (t.id && t.account_id === tradeData.account_id && t.ticker?.toUpperCase() === cleanTicker) {
          await supabase.from('trades').update({ remaining_quantity: t.remaining_quantity }).eq('id', t.id);
        }
      }
    }

    await fetchTrades();
    refreshCounts();
    setIsModalOpen(false);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;

    const { data: { user } } = await supabase.auth.getUser();
    const deletedTrade = trades.find((t) => t.id === deleteTargetId);

    const { error } = await supabase.from('trades').delete().eq('id', deleteTargetId);
    if (!error && user && deletedTrade) {
      // Recalculate and update remaining quantities after deletion
      const { data: remainingTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (remainingTrades) {
        const withRem = computeRemainingQuantities(remainingTrades as TradeRecordData[]);
        for (const t of withRem) {
          if (t.id && t.account_id === deletedTrade.account_id && t.ticker?.toUpperCase() === deletedTrade.ticker?.toUpperCase()) {
            await supabase.from('trades').update({ remaining_quantity: t.remaining_quantity }).eq('id', t.id);
          }
        }
      }
      await fetchTrades();
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
        <Header title="매매 원장" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner Card (Desktop Only) */}
          <div className="hidden lg:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                자산 매매 원장
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                원화(KRW) 및 외화(USD 등) 주식 매매 거래 내역을 기록하고 관리하는 원장입니다.
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                목록의 티커, 종목, 비고 텍스트를 클릭하면 해당 항목으로 즉시 자동 검색 및 필터링됩니다.
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
                  매매 기록 목록
                </h2>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredTrades.length} / {trades.length}건
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                title="신규 매매 기록 등록"
                aria-label="신규 매매 기록 등록"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Filter Toolbar Section */}
            {/* Desktop Toolbar: 1-Row Flex with Year, Currency, Type, Account Filters */}
            <div className="hidden lg:flex items-center justify-between gap-3">
              <div className="flex-1 max-w-sm relative">
                <input
                  type="text"
                  placeholder="종목, 짧은 종목명, 티커, 비고 검색..."
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
                  labelPrefix="년도"
                  options={yearFilterOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                />
                <FilterDropdown
                  labelPrefix="통화"
                  options={currencyFilterOptions}
                  value={currencyFilter}
                  onChange={setCurrencyFilter}
                />
                <FilterDropdown
                  labelPrefix="구분"
                  options={typeFilterOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                {accounts.length > 0 && (
                  <FilterDropdown
                    labelPrefix="계좌"
                    options={accountFilterOptions}
                    value={accountFilter}
                    onChange={setAccountFilter}
                  />
                )}
              </div>
            </div>

            {/* Mobile Toolbar: 2-Row Structured Grid (Top: 년도, 통화 / Bottom: 구분, 계좌) */}
            <div className="lg:hidden space-y-2">
              {/* Row 1: Search & Currency Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="종목, 티커 검색..."
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
                <CurrencyViewToggle mode={currencyViewMode} onChange={setCurrencyViewMode} />
              </div>
              {/* Row 2: 2x2 Grid Filters: Top (년도, 통화) / Bottom (구분, 계좌) */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <FilterDropdown
                  labelPrefix="년도"
                  mobileLabelPrefix="년도"
                  options={yearFilterOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                />
                <FilterDropdown
                  labelPrefix="통화"
                  mobileLabelPrefix="통화"
                  options={currencyFilterOptions}
                  value={currencyFilter}
                  onChange={setCurrencyFilter}
                />
                <FilterDropdown
                  labelPrefix="구분"
                  mobileLabelPrefix="구분"
                  options={typeFilterOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                {accounts.length > 0 ? (
                  <FilterDropdown
                    labelPrefix="계좌"
                    mobileLabelPrefix="계좌"
                    options={accountFilterOptions}
                    value={accountFilter}
                    onChange={setAccountFilter}
                  />
                ) : (
                  <div />
                )}
              </div>
            </div>

            {/* Data Table View (Tightly Clustered Numbers with Iconic 계좌 Column before 비고) */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs sm:text-sm table-fixed">
                <colgroup className="hidden lg:table-column-group">
                  <col className="w-[80px] min-[1920px]:w-[105px]" />
                  <col className="w-[45px] min-[1920px]:w-[58px]" />
                  <col className="w-[65px] min-[1920px]:w-[80px]" />
                  <col />
                  <col className="w-[30px] min-[1920px]:w-[45px]" />
                  <col className="w-[70px] min-[1920px]:w-[95px]" />
                  <col className="w-[55px] min-[1920px]:w-[75px]" />
                  <col className="w-[105px] min-[1920px]:w-[125px]" />
                  <col className="w-[65px] min-[1920px]:w-[90px]" />
                  <col className="w-[55px] min-[1920px]:w-[75px]" />
                  <col className="w-[75px] min-[1920px]:w-[300px]" />
                  <col />
                  <col className="w-[60px] min-[1920px]:w-[70px]" />
                </colgroup>
                <colgroup className="lg:hidden">
                  <col className="w-[43%]" />
                  <col className="w-[49%]" />
                  <col className="w-[8%]" />
                </colgroup>

                <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-medium text-[11px] sm:text-xs">
                  <tr>
                    {/* 1. 매매일자 (Sortable) */}
                    <th onClick={() => handleSort('trade_date')} className="hidden lg:table-cell py-2.5 px-1 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      매매일자 {renderSortIcon('trade_date')}
                    </th>

                    {/* 2. 구분 */}
                    <th className="hidden lg:table-cell py-2.5 px-0.5 text-center font-medium">구분</th>

                    {/* 3. 티커 (Sortable) */}
                    <th onClick={() => handleSort('ticker')} className="hidden lg:table-cell py-2.5 px-1 text-center cursor-pointer hover:text-[var(--fg)] font-medium">
                      티커 {renderSortIcon('ticker')}
                    </th>

                    {/* 4. 종목 (Sortable, Joined from stocks master) */}
                    <th onClick={() => handleSort('stock_name')} className="hidden lg:table-cell py-2.5 px-3 text-left cursor-pointer hover:text-[var(--fg)] font-medium">
                      종목 {renderSortIcon('stock_name')}
                    </th>

                    {/* 5. 통화 */}
                    <th className="hidden lg:table-cell py-2.5 px-0.5 text-center font-medium">통화</th>

                    {/* 6. 단가 (No Sort) */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-right font-medium">단가</th>

                    {/* 7. 수량 (No Sort) */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-right font-medium">수량</th>

                    {/* 8. 거래금액 (Sortable, No Parentheses) */}
                    <th onClick={() => handleSort('total_amount')} className="hidden lg:table-cell py-2.5 px-1.5 text-right cursor-pointer hover:text-[var(--fg)] font-medium">
                      거래금액 {renderSortIcon('total_amount')}
                    </th>

                    {/* 9. 환율 */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-right font-medium">환율</th>

                    {/* 10. 잔여수량 */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-right font-medium">잔여수량</th>

                    {/* 11. 계좌 */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-center font-medium">계좌</th>

                    {/* 12. 비고 (Desktop Only) */}
                    <th className="hidden lg:table-cell py-2.5 px-3 text-left font-medium">비고</th>

                    {/* 13. 작업 */}
                    <th className="hidden lg:table-cell py-2.5 px-1 text-center font-medium">작업</th>

                    {/* Mobile 3-Column Headers (Single Line with whitespace-nowrap) */}
                    <th className="lg:hidden py-2 px-1.5 text-left font-medium text-[10px] sm:text-[10.5px] whitespace-nowrap">매매일자 / 종목</th>
                    <th className="lg:hidden py-2 px-1.5 text-right font-medium text-[10px] sm:text-[10.5px] whitespace-nowrap">단가·수량 / 거래금액</th>
                    <th className="lg:hidden py-2 pr-1.5 pl-0 text-center font-medium text-[10px] sm:text-[10.5px] whitespace-nowrap">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {isLoadingTrades ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                          <span>매매 내역을 불러오는 중입니다...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-xs text-[var(--fg-muted)]">
                        등록된 매매 내역이 없습니다. 오른쪽 상단 &quot;+&quot; 버튼을 눌러 추가해 주세요.
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
                          <td className="hidden lg:table-cell py-3 px-1 text-center text-xs text-[var(--fg)] font-normal whitespace-nowrap">
                            {item.trade_date}
                          </td>

                          {/* 2. 구분 (Desktop: 매도(-)는 빨간색, 매수는 녹색) */}
                          <td className="hidden lg:table-cell py-3 px-0.5 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-1 py-0.5 text-[10px] sm:text-[10.5px] font-bold border whitespace-nowrap ${
                                isSell
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isSell ? '매도' : '매수'}
                            </span>
                          </td>

                          {/* 3. 티커 (Desktop: 클릭 시 필터 검색 연동) */}
                          <td
                            onClick={() => setSearchQuery(item.ticker)}
                            className="hidden lg:table-cell py-3 px-1 text-center text-xs font-semibold text-[var(--fg)] truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                            title={`"${item.ticker}" 검색`}
                          >
                            {item.ticker}
                          </td>

                          {/* 4. 종목 (Desktop: Joined Stock Master Name, Click to search) */}
                          <td
                            onClick={() => setSearchQuery(shortName)}
                            className="hidden lg:table-cell py-3 px-3 text-left text-xs font-semibold text-[var(--fg)] truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                            title={`"${fullName}" 검색`}
                          >
                            {shortName}
                          </td>

                          {/* 5. 통화 (Desktop: Flag Icon Only) */}
                          <td className="hidden lg:table-cell py-3 px-0.5 text-center text-xs font-normal text-[var(--fg)]">
                            <div className="flex items-center justify-center text-base leading-none" title={item.currency}>
                              {renderFlagEmoji(item.currency)}
                            </div>
                          </td>

                          {/* 6. 단가 (Desktop: Formatted with currency symbol and commas) */}
                          <td className="hidden lg:table-cell py-3 px-1 text-right text-xs text-[var(--fg)] font-normal whitespace-nowrap">
                            {currSymbol} {currencyViewMode === 'KRW'
                              ? Math.round(displayPrice).toLocaleString()
                              : displayPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: item.currency === 'KRW' ? 0 : 2,
                                })}
                          </td>

                          {/* 7. 수량 (Desktop: 매도(-)는 빨간색) */}
                          <td className="hidden lg:table-cell py-3 px-1 text-right text-xs font-normal whitespace-nowrap">
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
                          <td className="hidden lg:table-cell py-3 px-1.5 text-right text-xs font-normal whitespace-nowrap">
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

                          {/* 9. 환율 (Desktop: 또렷한 텍스트 font-normal, '원' 제거) */}
                          <td className="hidden lg:table-cell py-3 px-1 text-right text-xs text-[var(--fg)] font-normal whitespace-nowrap">
                            {item.currency === 'KRW' ? '-' : rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* 10. 잔여수량 (Desktop: 숫자만 표출) */}
                          <td className="hidden lg:table-cell py-3 px-1 text-right text-xs text-[var(--fg)] font-medium whitespace-nowrap">
                            {(item.remaining_quantity !== undefined ? item.remaining_quantity : 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </td>

                          {/* 11. 계좌 (Desktop: 계좌명 우선 표출, 1920px+ 300px 공간 활용) */}
                          <td className="hidden lg:table-cell py-3 px-1 text-center">
                            {(() => {
                              const linkedAccount = item.account_id ? accountsMap[item.account_id] : item.accounts;
                              const accName = linkedAccount?.account_name || linkedAccount?.broker_name;
                              return accName ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate max-w-full" title={accName}>
                                  {accName}
                                </span>
                              ) : (
                                <span className="text-[var(--fg-muted)] font-normal text-xs">-</span>
                              );
                            })()}
                          </td>

                          {/* 12. 비고 (Desktop: 가변 폭 자동 조절, Click to search) */}
                          <td
                            onClick={() => item.notes && setSearchQuery(item.notes)}
                            className={`hidden lg:table-cell py-3 px-3 text-left text-xs text-[var(--fg)] font-normal truncate ${
                              item.notes ? 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors' : ''
                            }`}
                            title={item.notes ? `"${item.notes}" 검색` : ''}
                          >
                            {item.notes || '-'}
                          </td>

                          {/* 13. 작업 (Desktop) */}
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
                                onClick={() => setDeleteTargetId(item.id || null)}
                                className="p-1 text-red-500 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          {/* Mobile 3-Column Cells */}
                          {/* Mobile Col 1: 매매일자(10px) + 초소형 구분 배지 (1행), 짧은 종목명 (2행: Click to search) */}
                          <td className="lg:hidden py-2.5 px-1.5 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] sm:text-[10.5px] text-[var(--fg-muted)] font-medium whitespace-nowrap shrink-0">
                                {item.trade_date}
                              </span>
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[8.5px] font-bold border whitespace-nowrap shrink-0 leading-tight ${
                                  isSell
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {isSell ? '매도' : '매수'}
                              </span>
                            </div>
                            <p
                              onClick={() => setSearchQuery(shortName)}
                              className="font-bold text-xs text-[var(--fg)] mt-1 truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                              title={`"${shortName}" 검색`}
                            >
                              {shortName}
                            </p>
                          </td>

                          {/* Mobile Col 2: 단가 x 수량 (1행), 거래금액 (2행) */}
                          <td className="lg:hidden py-2.5 px-1.5 text-right">
                            <div className="text-[9.5px] sm:text-[10px] font-normal text-[var(--fg-muted)] flex items-center justify-end gap-1 whitespace-nowrap">
                              <span>
                                {currSymbol} {currencyViewMode === 'KRW'
                                  ? Math.round(displayPrice).toLocaleString()
                                  : displayPrice.toLocaleString(undefined, {
                                      minimumFractionDigits: item.currency === 'KRW' ? 0 : 2,
                                    })}
                              </span>
                              <span className="text-[var(--fg-muted)]">×</span>
                              <span className={`whitespace-nowrap font-medium ${isSell ? 'text-red-500 font-semibold' : 'text-[var(--fg)]'}`}>
                                {displayQty.toLocaleString()}주
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <span className={`text-[11.5px] sm:text-xs font-bold tracking-tight whitespace-nowrap ${isSell ? 'text-red-500 dark:text-red-400' : 'text-[var(--fg)]'}`}>
                                {isSell ? '- ' : ''}{currSymbol} {Math.round(Math.abs(displayAmount)).toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* Mobile Col 3: 작업 Popover Menu Button */}
                          <td className="lg:hidden py-2.5 pr-1.5 pl-0 text-center relative align-middle">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => setActivePopoverId(activePopoverId === item.id ? null : item.id || null)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                                aria-label="작업 메뉴"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Floating Touch Popover Menu */}
                            {activePopoverId === item.id && (
                              <div className="absolute right-1.5 top-8 z-30 w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl divide-y divide-[var(--border)] overflow-hidden text-left animate-in zoom-in-95">
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
        accounts={accounts}
        allTrades={trades}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTrade}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetId}
        title="매매 기록 삭제 확인"
        confirmText="삭제하기"
        confirmVariant="danger"
        message="선택하신 매매 기록을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다."
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
