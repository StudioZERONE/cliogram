'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Monitor,
  TrendingUp,
  DollarSign,
  LogOut,
  Plus,
  Trash2,
  Building2,
  Settings,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Coins,
  Globe2,
  User,
  ChevronDown,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry, signOutUser } from '@/lib/auth';
import { CodeSelect } from '@/components/CodeSelect';
import { CommonCode, FALLBACK_CODES } from '@/lib/codes';

interface StockRecord {
  ticker: string;
  sort_code?: string;
  name: string;
  type: string;
  currency: string;
  market: string;
}

interface TradeRecord {
  id?: string;
  trade_date: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR';
  fee: number;
  tax: number;
  notes?: string;
}

interface DividendRecord {
  id?: string;
  payment_date: string;
  stock_name: string;
  amount: number;
  tax: number;
  currency: 'KRW' | 'USD' | 'EUR';
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [activeMenu, setActiveMenu] = useState<'overview' | 'trade' | 'dividend' | 'stocks' | 'codes'>('overview');
  const [userNickname, setUserNickname] = useState<string>('회원');
  const [userEmail, setUserEmail] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(1380);

  // User Profile Dropdown & Modal state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Forms State
  const [tradeForm, setTradeForm] = useState<{
    trade_date: Date;
    stock_name: string;
    trade_type: 'BUY' | 'SELL';
    quantity: string;
    price: string;
    currency: 'KRW' | 'USD' | 'EUR';
    fee: string;
    tax: string;
    notes: string;
  }>({
    trade_date: new Date(),
    stock_name: '',
    trade_type: 'BUY',
    quantity: '',
    price: '',
    currency: 'USD',
    fee: '0',
    tax: '0',
    notes: ''
  });

  const [dividendForm, setDividendForm] = useState<{
    payment_date: Date;
    stock_name: string;
    amount: string;
    tax: string;
    currency: 'KRW' | 'USD' | 'EUR';
  }>({
    payment_date: new Date(),
    stock_name: '',
    amount: '',
    tax: '0',
    currency: 'USD'
  });

  const [stockForm, setStockForm] = useState<StockRecord>({
    ticker: '',
    name: '',
    type: 'Growth',
    currency: 'USD',
    market: 'NASDAQ'
  });

  // Common Code Management State
  const [selectedGroupId, setSelectedGroupId] = useState<'CURRENCY' | 'STOCK_TYPE' | 'MARKET_TYPE' | 'TRADE_TYPE'>('CURRENCY');
  const [codeForm, setCodeForm] = useState<{
    code: string;
    code_name: string;
    sort_order: string;
  }>({
    code: '',
    code_name: '',
    sort_order: '1'
  });

  // Records List State
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [commonCodesList, setCommonCodesList] = useState<CommonCode[]>([]);

  // Check auth & session
  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.push('/');
        return;
      }
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          router.push('/');
          return;
        }
        setUserNickname(user.user_metadata?.full_name || user.email?.split('@')[0] || '회원');
        setUserEmail(user.email || '');
        fetchDashboardData();
      });
    });

    // Fetch live rate
    fetch('/api/exchange-rate')
      .then((res) => res.json())
      .then((data) => {
        if (data.rate) setExchangeRate(data.rate);
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (activeMenu === 'codes') {
      fetchCommonCodesByGroup(selectedGroupId);
    }
  }, [activeMenu, selectedGroupId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Remove limit(50) to fetch ALL records
      const [tradesRes, divRes, stocksRes] = await Promise.all([
        supabase.from('trades').select('*').order('trade_date', { ascending: false }),
        supabase.from('dividends').select('*').order('payment_date', { ascending: false }),
        supabase.from('stocks').select('*').order('name', { ascending: true })
      ]);

      if (tradesRes.data) setTrades(tradesRes.data as TradeRecord[]);
      if (divRes.data) setDividends(divRes.data as DividendRecord[]);
      if (stocksRes.data) setStocks(stocksRes.data as StockRecord[]);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCommonCodesByGroup = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('common_codes')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setCommonCodesList(data as CommonCode[]);
      } else {
        setCommonCodesList(FALLBACK_CODES[groupId] || []);
      }
    } catch {
      setCommonCodesList(FALLBACK_CODES[groupId] || []);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeForm.stock_name || !tradeForm.quantity || !tradeForm.price) return;

    const newRecord: Partial<TradeRecord> = {
      trade_date: format(tradeForm.trade_date, 'yyyy-MM-dd'),
      stock_name: tradeForm.stock_name,
      trade_type: tradeForm.trade_type,
      quantity: parseFloat(tradeForm.quantity),
      price: parseFloat(tradeForm.price),
      currency: tradeForm.currency,
      fee: parseFloat(tradeForm.fee || '0'),
      tax: parseFloat(tradeForm.tax || '0'),
      notes: tradeForm.notes
    };

    const { data, error } = await supabase.from('trades').insert([newRecord]).select();
    if (!error && data) {
      setTrades([data[0] as TradeRecord, ...trades]);
      setTradeForm({ ...tradeForm, stock_name: '', quantity: '', price: '', notes: '' });
    }
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendForm.stock_name || !dividendForm.amount) return;

    const newRecord: Partial<DividendRecord> = {
      payment_date: format(dividendForm.payment_date, 'yyyy-MM-dd'),
      stock_name: dividendForm.stock_name,
      amount: parseFloat(dividendForm.amount),
      tax: parseFloat(dividendForm.tax || '0'),
      currency: dividendForm.currency
    };

    const { data, error } = await supabase.from('dividends').insert([newRecord]).select();
    if (!error && data) {
      setDividends([data[0] as DividendRecord, ...dividends]);
      setDividendForm({ ...dividendForm, stock_name: '', amount: '', tax: '0' });
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.ticker || !stockForm.name) return;

    const newStock: StockRecord = {
      ticker: stockForm.ticker.toUpperCase(),
      name: stockForm.name,
      type: stockForm.type,
      currency: stockForm.currency,
      market: stockForm.market
    };

    const { error } = await supabase.from('stocks').insert([newStock]);
    if (!error) {
      setStocks([...stocks, newStock]);
      setStockForm({ ticker: '', name: '', type: 'Growth', currency: 'USD', market: 'NASDAQ' });
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeForm.code || !codeForm.code_name) return;

    const newCode: Partial<CommonCode> = {
      group_id: selectedGroupId,
      code: codeForm.code.trim(),
      code_name: codeForm.code_name.trim(),
      sort_order: parseInt(codeForm.sort_order || '1', 10),
      is_active: true
    };

    const { data, error } = await supabase.from('common_codes').insert([newCode]).select();
    if (!error && data) {
      setCommonCodesList([...commonCodesList, data[0] as CommonCode]);
      setCodeForm({ code: '', code_name: '', sort_order: '1' });
    } else {
      setCommonCodesList([...commonCodesList, newCode as CommonCode]);
      setCodeForm({ code: '', code_name: '', sort_order: '1' });
    }
  };

  const handleToggleCodeActive = async (item: CommonCode) => {
    const nextStatus = !item.is_active;
    if (item.id) {
      await supabase.from('common_codes').update({ is_active: nextStatus }).eq('id', item.id);
    }
    setCommonCodesList(
      commonCodesList.map((c) => (c.code === item.code ? { ...c, is_active: nextStatus } : c))
    );
  };

  const handleDeleteCode = async (item: CommonCode) => {
    if (item.id) {
      await supabase.from('common_codes').delete().eq('id', item.id);
    }
    setCommonCodesList(commonCodesList.filter((c) => c.code !== item.code));
  };

  const handleDeleteTrade = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) setTrades(trades.filter((t) => t.id !== id));
  };

  const handleDeleteDividend = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from('dividends').delete().eq('id', id);
    if (!error) setDividends(dividends.filter((d) => d.id !== id));
  };

  const handleDeleteStock = async (ticker: string) => {
    const { error } = await supabase.from('stocks').delete().eq('ticker', ticker);
    if (!error) setStocks(stocks.filter((s) => s.ticker !== ticker));
  };

  // Helper: Currency Flag / Badge Render
  const renderCurrencyBadge = (curr: string) => {
    if (curr === 'USD') return <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">🇺🇸 USD</span>;
    if (curr === 'KRW') return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">🇰🇷 KRW</span>;
    if (curr === 'EUR') return <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">🇪🇺 EUR</span>;
    return <span className="inline-flex items-center gap-1 rounded-md bg-gray-500/10 px-2 py-0.5 text-xs font-bold text-gray-500">{curr}</span>;
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      {/* Uplon Style Left Fixed Navigation Sidebar */}
      <aside className="sticky top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        {/* Brand Logo & Slogan */}
        <div className="flex items-center gap-3 pb-6 border-b border-[var(--border)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50 shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.5 13.5H9V22H15V13.5H19.5L12 2Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-500">KLIOGRAM</h1>
            <p className="text-xs font-medium text-[var(--fg-muted)]">고요히 흘러 마침내 숲이 될 하루</p>
          </div>
        </div>

        {/* Sidebar Navigation Links (Uplon Style) */}
        <nav className="mt-6 flex-1 space-y-2">
          <span className="px-3 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Navigation</span>
          
          <button
            onClick={() => setActiveMenu('overview')}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === 'overview'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
          >
            {activeMenu === 'overview' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>대시보드 개요</span>
          </button>

          <button
            onClick={() => setActiveMenu('trade')}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === 'trade'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
          >
            {activeMenu === 'trade' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>매매 내역 관리</span>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{trades.length}</span>
          </button>

          <button
            onClick={() => setActiveMenu('dividend')}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === 'dividend'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
          >
            {activeMenu === 'dividend' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>배당 내역 관리</span>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{dividends.length}</span>
          </button>

          <button
            onClick={() => setActiveMenu('stocks')}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === 'stocks'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
          >
            {activeMenu === 'stocks' && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
            <Building2 className="h-4 w-4 shrink-0" />
            <span>종목 마스터 관리</span>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{stocks.length}</span>
          </button>
        </nav>

        {/* Sidebar Bottom Common Code Manager Card Box (Requirement 11) */}
        <div className="pt-4 mt-auto">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/80 p-3.5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">System Settings</span>
            <button
              onClick={() => setActiveMenu('codes')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeMenu === 'codes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] hover:border-emerald-500 hover:text-emerald-500'
              }`}
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                ⚙️ 공통 코드 관리
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Canvas & Content Area (Wide Screen Layout) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold">
              {activeMenu === 'overview' && '📊 대시보드 개요'}
              {activeMenu === 'trade' && '📈 주식 매매 내역 관리'}
              {activeMenu === 'dividend' && '💰 주식 배당 내역 관리'}
              {activeMenu === 'stocks' && '🏢 주식 종목 마스터 관리'}
              {activeMenu === 'codes' && '⚙️ 공통 코드 설정'}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            {/* Live Exchange Rate Indicator */}
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs md:text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[var(--fg-muted)]">USD/KRW:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{exchangeRate.toLocaleString()}원</span>
            </div>

            {/* Theme Switcher Toggle */}
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1">
              <button
                onClick={() => setTheme('light')}
                className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'light' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
                title="White Mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'dark' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
                title="Dark Mode"
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'system' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
                title="System Mode"
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>

            {/* Top Right User Profile Dropdown Menu (Requirement 9 & 10) */}
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 pr-3 transition-colors cursor-pointer hover:border-[var(--accent)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-xs">
                  {userNickname.substring(0, 1)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-tight">{userNickname}</p>
                  <p className="text-[10px] text-[var(--fg-muted)] leading-tight">Google Auth</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
              </button>

              {/* Profile Dropdown Popover */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl backdrop-blur-md z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                    <p className="text-xs font-bold truncate">{userNickname}</p>
                    <p className="text-[10px] text-[var(--fg-muted)] truncate">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                  >
                    <User className="h-4 w-4 text-emerald-500" />
                    <span>계정 정보 관리</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOutUser().then(() => router.push('/'));
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Uplon Style Main Content Body */}
        <main className="p-8 space-y-8 flex-1">
          {/* Top Stat KPI Cards (Uplon Admin Style) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition-all hover:border-[var(--accent)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--fg-muted)]">보유 종목 마스터</p>
                  <h3 className="text-3xl font-bold mt-1.5">{stocks.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">개</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <Building2 className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition-all hover:border-[var(--accent)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--fg-muted)]">총 매매 내역 기록</p>
                  <h3 className="text-3xl font-bold mt-1.5">{trades.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">건</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition-all hover:border-[var(--accent)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--fg-muted)]">총 배당 수령 기록</p>
                  <h3 className="text-3xl font-bold mt-1.5">{dividends.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">건</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Coins className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition-all hover:border-[var(--accent)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--fg-muted)]">실시간 환율 (USD)</p>
                  <h3 className="text-3xl font-bold mt-1.5">₩{exchangeRate.toLocaleString()}</h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <Globe2 className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>

          {/* Overview Mode */}
          {activeMenu === 'overview' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Recent Trades Table */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    최근 매매 내역
                  </h3>
                  <button onClick={() => setActiveMenu('trade')} className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer">전체보기 →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">날짜</th>
                        <th className="py-3 px-4 text-center">구분</th>
                        <th className="py-3 px-4 text-center">통화</th>
                        <th className="py-3 px-4 text-left">종목명</th>
                        <th className="py-3 px-4 text-right">단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {trades.slice(0, 5).map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.trade_date}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${item.trade_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{item.trade_type}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">{renderCurrencyBadge(item.currency)}</td>
                          <td className="py-3.5 px-4 text-left font-semibold">{item.stock_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">{item.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Dividends Table */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    최근 배당 내역
                  </h3>
                  <button onClick={() => setActiveMenu('dividend')} className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer">전체보기 →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">지급일</th>
                        <th className="py-3 px-4 text-center">통화</th>
                        <th className="py-3 px-4 text-left">종목명</th>
                        <th className="py-3 px-4 text-right">세전 배당금</th>
                        <th className="py-3 px-4 text-right font-bold">세후 실수령액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {dividends.slice(0, 5).map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.payment_date}</td>
                          <td className="py-3.5 px-4 text-center">{renderCurrencyBadge(item.currency)}</td>
                          <td className="py-3.5 px-4 text-left font-semibold text-emerald-500">{item.stock_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{item.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-500">{(item.amount - item.tax).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trade CRUD Mode */}
          {activeMenu === 'trade' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  매매 내역 신규 등록
                </h3>
                <form onSubmit={handleAddTrade} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">거래 일자</label>
                    <DatePicker
                      selected={tradeForm.trade_date}
                      onChange={(date: Date | null) => date && setTradeForm({ ...tradeForm, trade_date: date })}
                      dateFormat="yyyy-MM-dd"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-center text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">거래 유형 (TRADE_TYPE)</label>
                      <CodeSelect groupId="TRADE_TYPE" value={tradeForm.trade_type} onChange={(val) => setTradeForm({ ...tradeForm, trade_type: val as any })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">통화 (CURRENCY)</label>
                      <CodeSelect groupId="CURRENCY" value={tradeForm.currency} onChange={(val) => setTradeForm({ ...tradeForm, currency: val as any })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">종목명 / 티커</label>
                    <input
                      type="text"
                      placeholder="예: Apple (AAPL)"
                      value={tradeForm.stock_name}
                      onChange={(e) => setTradeForm({ ...tradeForm, stock_name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">거래 수량</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="10"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">거래 단가</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="180.5"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">비고 (선택)</label>
                    <input
                      type="text"
                      placeholder="손절, 해외대체입고 등"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors shadow-sm cursor-pointer hover:bg-emerald-500">
                    매매 내역 추가하기
                  </button>
                </form>
              </div>
              <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h3 className="text-lg font-bold mb-5 flex items-center justify-between">
                  <span>전체 매매 내역 목록</span>
                  <span className="text-xs text-[var(--fg-muted)] font-normal">총 {trades.length}건</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">날짜</th>
                        <th className="py-3 px-4 text-center">구분</th>
                        <th className="py-3 px-4 text-center">통화</th>
                        <th className="py-3 px-4 text-left">종목명</th>
                        <th className="py-3 px-4 text-right">수량</th>
                        <th className="py-3 px-4 text-right">단가</th>
                        <th className="py-3 px-4 text-right font-semibold">총 금액</th>
                        <th className="py-3 px-4 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {trades.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.trade_date}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${item.trade_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{item.trade_type}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">{renderCurrencyBadge(item.currency)}</td>
                          <td className="py-3.5 px-4 text-left font-semibold">{item.stock_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{item.quantity.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{item.price.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{(item.quantity * item.price).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => handleDeleteTrade(item.id)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-4 w-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Dividend CRUD Mode */}
          {activeMenu === 'dividend' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  배당 내역 신규 등록
                </h3>
                <form onSubmit={handleAddDividend} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">지급 일자</label>
                    <DatePicker
                      selected={dividendForm.payment_date}
                      onChange={(date: Date | null) => date && setDividendForm({ ...dividendForm, payment_date: date })}
                      dateFormat="yyyy-MM-dd"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-center text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">통화 (CURRENCY)</label>
                    <CodeSelect groupId="CURRENCY" value={dividendForm.currency} onChange={(val) => setDividendForm({ ...dividendForm, currency: val as any })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">종목명 / 티커</label>
                    <input
                      type="text"
                      placeholder="예: Apple (AAPL)"
                      value={dividendForm.stock_name}
                      onChange={(e) => setDividendForm({ ...dividendForm, stock_name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">세전 배당금액</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="25.5"
                        value={dividendForm.amount}
                        onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">세금</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="3.8"
                        value={dividendForm.tax}
                        onChange={(e) => setDividendForm({ ...dividendForm, tax: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors shadow-sm cursor-pointer hover:bg-emerald-500">
                    배당 내역 추가하기
                  </button>
                </form>
              </div>
              <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h3 className="text-lg font-bold mb-5 flex items-center justify-between">
                  <span>전체 배당 내역 목록</span>
                  <span className="text-xs text-[var(--fg-muted)] font-normal">총 {dividends.length}건</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">지급일</th>
                        <th className="py-3 px-4 text-center">통화</th>
                        <th className="py-3 px-4 text-left">종목명</th>
                        <th className="py-3 px-4 text-right">세전 배당금</th>
                        <th className="py-3 px-4 text-right">세금</th>
                        <th className="py-3 px-4 text-right font-bold">세후 실수령액</th>
                        <th className="py-3 px-4 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {dividends.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.payment_date}</td>
                          <td className="py-3.5 px-4 text-center">{renderCurrencyBadge(item.currency)}</td>
                          <td className="py-3.5 px-4 text-left font-semibold text-emerald-500">{item.stock_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{item.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-red-500">{item.tax.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{(item.amount - item.tax).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => handleDeleteDividend(item.id)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-4 w-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Stocks Master CRUD Mode */}
          {activeMenu === 'stocks' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  주식 종목 마스터 신규 등록
                </h3>
                <form onSubmit={handleAddStock} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">티커 코드 (Ticker)</label>
                    <input
                      type="text"
                      placeholder="예: AAPL, 005930"
                      value={stockForm.ticker}
                      onChange={(e) => setStockForm({ ...stockForm, ticker: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-center font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">종목명 (Stock Name)</label>
                    <input
                      type="text"
                      placeholder="예: Apple, 삼성전자"
                      value={stockForm.name}
                      onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">종목 유형 (STOCK_TYPE)</label>
                    <CodeSelect groupId="STOCK_TYPE" value={stockForm.type} onChange={(val) => setStockForm({ ...stockForm, type: val })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">통화 (CURRENCY)</label>
                      <CodeSelect groupId="CURRENCY" value={stockForm.currency} onChange={(val) => setStockForm({ ...stockForm, currency: val })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">상장 시장 (MARKET_TYPE)</label>
                      <CodeSelect groupId="MARKET_TYPE" value={stockForm.market} onChange={(val) => setStockForm({ ...stockForm, market: val })} />
                    </div>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors shadow-sm cursor-pointer hover:bg-emerald-500">
                    종목 추가하기
                  </button>
                </form>
              </div>
              <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h3 className="text-lg font-bold mb-5 flex items-center justify-between">
                  <span>등록된 주식 종목 목록</span>
                  <span className="text-xs text-[var(--fg-muted)] font-normal">총 {stocks.length}개</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">종목명 (Name)</th>
                        <th className="py-3 px-4 text-center">티커 (Ticker)</th>
                        <th className="py-3 px-4 text-center">유형 (Type)</th>
                        <th className="py-3 px-4 text-center">통화</th>
                        <th className="py-3 px-4 text-center">상장 시장</th>
                        <th className="py-3 px-4 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {stocks.map((item) => (
                        <tr key={item.ticker} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-left font-bold text-[var(--fg)]">{item.name}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-500">{item.ticker}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">{item.type}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">{renderCurrencyBadge(item.currency)}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-[var(--fg-muted)]">{item.market}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => handleDeleteStock(item.ticker)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-4 w-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Common Code Manager Mode */}
          {activeMenu === 'codes' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-6 h-fit">
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-emerald-500" />
                    코드 그룹 선택
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'CURRENCY', label: '통화 (CURRENCY)' },
                      { id: 'STOCK_TYPE', label: '종목유형 (STOCK_TYPE)' },
                      { id: 'MARKET_TYPE', label: '상장시장 (MARKET_TYPE)' },
                      { id: 'TRADE_TYPE', label: '거래유형 (TRADE_TYPE)' }
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id as any)}
                        className={`rounded-xl border p-3 text-[11px] font-bold transition-colors cursor-pointer ${
                          selectedGroupId === g.id
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-5">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    신규 공통 코드 등록 ({selectedGroupId})
                  </h4>
                  <form onSubmit={handleAddCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">코드 (Code)</label>
                      <input
                        type="text"
                        placeholder="예: GBP, Crypto"
                        value={codeForm.code}
                        onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-center font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">코드명 (Code Name)</label>
                      <input
                        type="text"
                        placeholder="예: 영국 파운드 (£)"
                        value={codeForm.code_name}
                        onChange={(e) => setCodeForm({ ...codeForm, code_name: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1.5">정렬 순서 (Sort Order)</label>
                      <input
                        type="number"
                        value={codeForm.sort_order}
                        onChange={(e) => setCodeForm({ ...codeForm, sort_order: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors shadow-sm cursor-pointer hover:bg-emerald-500">
                      공통 코드 추가하기
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h3 className="text-lg font-bold mb-5 flex items-center justify-between">
                  <span>[{selectedGroupId}] 그룹 코드 목록</span>
                  <span className="text-xs text-[var(--fg-muted)] font-normal">총 {commonCodesList.length}개</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">코드 (Code)</th>
                        <th className="py-3 px-4 text-left">코드명 (Code Name)</th>
                        <th className="py-3 px-4 text-right">정렬 순서</th>
                        <th className="py-3 px-4 text-center">상태</th>
                        <th className="py-3 px-4 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {commonCodesList.map((item) => (
                        <tr key={item.code} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-500">{item.code}</td>
                          <td className="py-3.5 px-4 text-left font-medium">{item.code_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-[var(--fg-muted)]">{item.sort_order}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleCodeActive(item)}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer ${
                                item.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 text-gray-500'
                              }`}
                            >
                              {item.is_active ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> 사용중
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5" /> 중지됨
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => handleDeleteCode(item)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-4 w-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Account Info Modal (Requirement 10 - Blank Canvas State) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                계정 정보 관리
              </h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-8 text-center text-sm text-[var(--fg-muted)] space-y-2">
              <p className="font-semibold text-[var(--fg)]">계정 정보 관리 페이지입니다.</p>
              <p className="text-xs">상세 관리 기능은 곧 추가될 예정입니다.</p>
            </div>
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full rounded-xl bg-[var(--bg)] border border-[var(--border)] py-2.5 text-xs font-bold text-[var(--fg)] hover:border-emerald-500 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
