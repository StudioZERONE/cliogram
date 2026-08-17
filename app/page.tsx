'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import {
  TrendingUp,
  DollarSign,
  Coins,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
  CalendarDays,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────── */
interface Trade {
  id: string;
  trade_date: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD';
  fee: number;
  tax: number;
  created_at: string;
}

interface Dividend {
  id: string;
  payment_date: string;
  stock_name: string;
  amount: number;
  tax: number;
  currency: 'KRW' | 'USD';
  created_at: string;
}

/* ── Helpers ─────────────────────────────────────────── */
function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}
function todayDate(): Date {
  return new Date();
}

/* ── Reusable UI Components ─────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2" style={{ color: 'var(--text-sub)' }}>
      {children}
    </label>
  );
}

function InputBase({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm md:text-base outline-none transition-all duration-150
        placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${className}`}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <div className="relative w-full">
      <CalendarDays
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 pointer-events-none z-10"
        style={{ color: 'var(--text-muted)' }}
      />
      <DatePicker
        selected={value}
        onChange={(d: Date | null) => d && onChange(d)}
        dateFormat="yyyy-MM-dd"
        maxDate={new Date()}
        className="w-full rounded-xl pl-10 md:pl-11 pr-3.5 py-2.5 md:py-3 text-sm md:text-base outline-none cursor-pointer transition-all duration-150"
        wrapperClassName="w-full"
        popperPlacement="bottom-start"
        customInput={
          <input
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        }
      />
    </div>
  );
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; activeClass: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`py-2.5 md:py-3 rounded-xl text-sm md:text-base font-semibold border transition-all duration-150 ${
            value === opt.value
              ? opt.activeClass
              : 'border-[var(--border)] text-[var(--text-sub)] bg-[var(--bg)] hover:border-[var(--border-hi)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Theme Switcher Component ────────────────────────── */
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  }

  const iconMap = {
    light: <Sun className="w-4 h-4 md:w-4.5 md:h-4.5 text-amber-500" />,
    dark: <Moon className="w-4 h-4 md:w-4.5 md:h-4.5 text-blue-400" />,
    system: <Monitor className="w-4 h-4 md:w-4.5 md:h-4.5 text-zinc-500 dark:text-zinc-400" />,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 md:gap-1.5 p-2 md:px-3 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-150"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        title="테마 변경 (White / Dark / System)"
      >
        {iconMap[(theme as 'light' | 'dark' | 'system') || 'system']}
        <span className="hidden sm:inline text-xs font-semibold capitalize">
          {theme === 'light' ? 'White' : theme === 'dark' ? 'Dark' : 'System'}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-32 rounded-2xl p-1.5 shadow-xl border z-50 animate-fade-in"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border-hi)',
          }}
        >
          {[
            { key: 'light', label: 'White', icon: <Sun className="w-4 h-4 text-amber-500" /> },
            { key: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4 text-blue-400" /> },
            { key: 'system', label: 'System', icon: <Monitor className="w-4 h-4 text-zinc-400" /> },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTheme(item.key);
                setOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-colors duration-150 text-left"
              style={{
                background: theme === item.key ? 'var(--accent-bg)' : 'transparent',
                color: theme === item.key ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Rate Badge ───────────────────────────────────────── */
function RateBadge({
  rate,
  loading,
  onRefresh,
}: {
  rate: { usd_krw: number; source: string } | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-150 border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-sub)',
      }}
    >
      <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 shrink-0" />
      <span className="hidden sm:inline">USD/KRW:</span>
      <span className="font-bold text-[var(--text)]">
        {loading ? '...' : rate ? `${rate.usd_krw.toLocaleString()}원` : '-'}
      </span>
      <RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}

/* ── Stat Card ────────────────────────────────────────── */
function StatCard({
  label,
  value,
  unit,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 md:p-6 flex flex-col justify-between transition-all duration-150"
      style={{
        background: accent ? 'var(--accent-bg)' : 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center justify-between text-xs md:text-sm font-medium" style={{ color: 'var(--text-sub)' }}>
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 md:mt-4 text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value} <span className="text-xs md:text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'trade' | 'dividend'>('trade');
  const [listFilter, setListFilter] = useState<'all' | 'trade' | 'dividend'>('all');

  const [exchangeRate, setExchangeRate] = useState<{
    rate_date: string;
    usd_krw: number;
    source: string;
  } | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [tradeForm, setTradeForm] = useState({
    trade_date: todayDate(),
    stock_name: '',
    trade_type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    fee: '0',
    tax: '0',
    currency: 'USD' as 'KRW' | 'USD',
  });

  const [dividendForm, setDividendForm] = useState({
    payment_date: todayDate(),
    stock_name: '',
    amount: '',
    tax: '0',
    currency: 'USD' as 'KRW' | 'USD',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchExchangeRate = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setRateLoading(true);
    try {
      const res = await fetch(`/api/exchange-rate?date=${dateStr}`);
      if (!res.ok) throw new Error('환율 정보를 불러올 수 없습니다.');
      const data = await res.json();
      setExchangeRate({ rate_date: data.rate_date, usd_krw: data.usd_krw, source: data.source });
    } catch (err) {
      console.error('환율 조회 오류:', err);
    } finally {
      setRateLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [tradesRes, dividendsRes] = await Promise.all([
        supabase.from('trades').select('*').order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('dividends').select('*').order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      if (tradesRes.data) setTrades(tradesRes.data as Trade[]);
      if (dividendsRes.data) setDividends(dividendsRes.data as Dividend[]);
    } catch (err) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRate(toDateStr(todayDate()));
    refreshData();
  }, [fetchExchangeRate, refreshData]);

  useEffect(() => {
    const d = activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date;
    fetchExchangeRate(toDateStr(d));
  }, [activeTab, tradeForm.trade_date, dividendForm.payment_date, fetchExchangeRate]);

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeForm.stock_name.trim()) { showToast('종목명을 입력해 주세요.', 'error'); return; }
    const qty = parseFloat(tradeForm.quantity);
    const price = parseFloat(tradeForm.price);
    if (!qty || qty <= 0) { showToast('올바른 수량을 입력해 주세요.', 'error'); return; }
    if (isNaN(price) || price < 0) { showToast('올바른 단가를 입력해 주세요.', 'error'); return; }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trades').insert([{
        trade_date: toDateStr(tradeForm.trade_date),
        stock_name: tradeForm.stock_name.trim().toUpperCase(),
        trade_type: tradeForm.trade_type,
        quantity: qty,
        price,
        currency: tradeForm.currency,
        fee: parseFloat(tradeForm.fee) || 0,
        tax: parseFloat(tradeForm.tax) || 0,
      }]);
      if (error) throw error;
      showToast(`${tradeForm.stock_name.toUpperCase()} 매매 내역이 저장되었습니다.`);
      setTradeForm((p) => ({ ...p, stock_name: '', quantity: '', price: '', fee: '0', tax: '0' }));
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDividendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendForm.stock_name.trim()) { showToast('종목명을 입력해 주세요.', 'error'); return; }
    const amt = parseFloat(dividendForm.amount);
    if (!amt || amt <= 0) { showToast('올바른 배당금액을 입력해 주세요.', 'error'); return; }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('dividends').insert([{
        payment_date: toDateStr(dividendForm.payment_date),
        stock_name: dividendForm.stock_name.trim().toUpperCase(),
        amount: amt,
        tax: parseFloat(dividendForm.tax) || 0,
        currency: dividendForm.currency,
      }]);
      if (error) throw error;
      showToast(`${dividendForm.stock_name.toUpperCase()} 배당 내역이 저장되었습니다.`);
      setDividendForm((p) => ({ ...p, stock_name: '', amount: '', tax: '0' }));
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrade = async (id: string, name: string) => {
    if (!confirm(`"${name}" 매매 내역을 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) showToast('삭제 중 오류가 발생했습니다.', 'error');
    else { showToast('매매 내역이 삭제되었습니다.'); refreshData(); }
  };

  const handleDeleteDividend = async (id: string, name: string) => {
    if (!confirm(`"${name}" 배당 내역을 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('dividends').delete().eq('id', id);
    if (error) showToast('삭제 중 오류가 발생했습니다.', 'error');
    else { showToast('배당 내역이 삭제되었습니다.'); refreshData(); }
  };

  /* ── computed ── */
  const tradeTotal =
    (parseFloat(tradeForm.quantity) || 0) * (parseFloat(tradeForm.price) || 0) +
    (parseFloat(tradeForm.fee) || 0) +
    (parseFloat(tradeForm.tax) || 0);

  const dividendNet = Math.max(
    0,
    (parseFloat(dividendForm.amount) || 0) - (parseFloat(dividendForm.tax) || 0)
  );

  const totalDividendKRW = dividends.reduce((acc, d) => {
    const net = d.amount - d.tax;
    return acc + (d.currency === 'USD' ? net * (exchangeRate?.usd_krw || 1400) : net);
  }, 0);

  const activeDate = activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date;

  return (
    <div className="min-h-screen pb-24 transition-colors duration-200" style={{ background: 'var(--bg)' }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 md:px-5 md:py-3.5 rounded-2xl text-sm md:text-base font-medium shadow-2xl animate-fade-in"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${toast.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            color: 'var(--text)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            : <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 md:px-8 transition-colors duration-200"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between py-3.5 md:py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 md:gap-3">
            <div
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-bold text-sm md:text-base shadow-sm"
              style={{ background: 'var(--accent)', color: '#ffffff' }}
            >
              K
            </div>
            <span className="font-bold tracking-tight text-base md:text-lg" style={{ color: 'var(--text)' }}>
              KLIOGRAM
            </span>
            <span
              className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}
            >
              자산 관리
            </span>
          </div>

          {/* Right Header Bar: Theme Switcher + Rate Badge */}
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeSwitcher />
            <RateBadge
              rate={exchangeRate}
              loading={rateLoading}
              onRefresh={() => fetchExchangeRate(toDateStr(activeDate))}
            />
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-6 md:space-y-10">

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            label="총 매매 기록"
            value={String(trades.length)}
            unit="건"
            icon={<Receipt className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />}
          />
          <StatCard
            label="총 배당 수령"
            value={String(dividends.length)}
            unit="건"
            icon={<Coins className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />}
          />
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label="누적 세후 배당금 (원화)"
              value={`≈ ${Math.round(totalDividendKRW).toLocaleString()}`}
              unit="원"
              icon={<Wallet className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />}
              accent
            />
          </div>
        </div>

        {/* Main Grid: Form + List */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">

          {/* ── Form Panel ────────────────────────────── */}
          <div
            className="rounded-3xl overflow-hidden transition-all duration-200"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {/* Tab bar */}
            <div
              className="grid grid-cols-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {(['trade', 'dividend'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="py-3.5 md:py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-colors duration-150"
                  style={{
                    color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                    background: activeTab === tab ? 'var(--surface-sub)' : 'transparent',
                    borderBottom: activeTab === tab ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                >
                  {tab === 'trade' ? (
                    <><TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />매매 내역 입력</>
                  ) : (
                    <><Coins className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />배당 내역 입력</>
                  )}
                </button>
              ))}
            </div>

            {/* Exchange rate info bar */}
            {exchangeRate && (
              <div
                className="px-5 py-3 flex items-center justify-between text-xs md:text-sm font-medium"
                style={{
                  background: 'var(--accent-bg)',
                  borderBottom: '1px solid var(--accent-border)',
                }}
              >
                <span style={{ color: 'var(--text-sub)' }}>적용 환율 ({toDateStr(activeDate)})</span>
                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                  {rateLoading ? '조회중...' : `1 USD = ${exchangeRate.usd_krw.toLocaleString()}원`}
                </span>
              </div>
            )}

            {/* Form body */}
            <div className="p-5 md:p-8">
              {activeTab === 'trade' ? (
                <form onSubmit={handleTradeSubmit} className="space-y-4 md:space-y-6">
                  {/* Row 1: date + currency */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>거래일자 *</Label>
                      <DateInput
                        value={tradeForm.trade_date}
                        onChange={(d) => setTradeForm({ ...tradeForm, trade_date: d })}
                      />
                    </div>
                    <div>
                      <Label>통화</Label>
                      <ToggleGroup
                        value={tradeForm.currency}
                        onChange={(v) => setTradeForm({ ...tradeForm, currency: v })}
                        options={[
                          { value: 'USD', label: 'USD ($)', activeClass: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-bg)] font-bold' },
                          { value: 'KRW', label: 'KRW (₩)', activeClass: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-bg)] font-bold' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 2: stock + buy/sell */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>종목명 / 티커 *</Label>
                      <InputBase
                        type="text"
                        placeholder="AAPL, TSLA, 삼성전자"
                        value={tradeForm.stock_name}
                        onChange={(e) => setTradeForm({ ...tradeForm, stock_name: e.target.value })}
                        className="uppercase font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <Label>매매 구분 *</Label>
                      <ToggleGroup
                        value={tradeForm.trade_type}
                        onChange={(v) => setTradeForm({ ...tradeForm, trade_type: v })}
                        options={[
                          { value: 'BUY',  label: '매수', activeClass: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold' },
                          { value: 'SELL', label: '매도', activeClass: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-bold' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 3: qty + price */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>수량 *</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0.000001"
                        placeholder="10"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>단가 ({tradeForm.currency === 'USD' ? '$' : '₩'}) *</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0"
                        placeholder={tradeForm.currency === 'USD' ? '185.50' : '75000'}
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 4: fee + tax */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>수수료</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0"
                        value={tradeForm.fee}
                        onChange={(e) => setTradeForm({ ...tradeForm, fee: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>세금</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0"
                        value={tradeForm.tax}
                        onChange={(e) => setTradeForm({ ...tradeForm, tax: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Total preview */}
                  {tradeTotal > 0 && (
                    <div
                      className="flex items-center justify-between px-4 py-3.5 md:px-5 md:py-4 rounded-2xl text-sm md:text-base"
                      style={{
                        background: 'var(--accent-bg)',
                        border: '1px solid var(--accent-border)',
                      }}
                    >
                      <span style={{ color: 'var(--text-sub)' }}>예상 총액</span>
                      <span className="font-bold text-base md:text-lg" style={{ color: 'var(--text)' }}>
                        {tradeForm.currency === 'USD'
                          ? `$${tradeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `₩${Math.round(tradeTotal).toLocaleString()}`}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 md:py-3.5 rounded-xl text-sm md:text-base font-bold shadow-md transition-all duration-150 disabled:opacity-50 hover:opacity-95"
                    style={{ background: 'var(--accent)', color: '#ffffff' }}
                  >
                    {isSubmitting ? '저장 중...' : '매매 내역 저장'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDividendSubmit} className="space-y-4 md:space-y-6">
                  {/* Row 1: date + currency */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>지급일자 *</Label>
                      <DateInput
                        value={dividendForm.payment_date}
                        onChange={(d) => setDividendForm({ ...dividendForm, payment_date: d })}
                      />
                    </div>
                    <div>
                      <Label>통화</Label>
                      <ToggleGroup
                        value={dividendForm.currency}
                        onChange={(v) => setDividendForm({ ...dividendForm, currency: v })}
                        options={[
                          { value: 'USD', label: 'USD ($)', activeClass: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-bg)] font-bold' },
                          { value: 'KRW', label: 'KRW (₩)', activeClass: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-bg)] font-bold' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 2: stock */}
                  <div>
                    <Label>종목명 / 티커 *</Label>
                    <InputBase
                      type="text"
                      placeholder="AAPL, TSLA, 삼성전자"
                      value={dividendForm.stock_name}
                      onChange={(e) => setDividendForm({ ...dividendForm, stock_name: e.target.value })}
                      className="uppercase font-semibold"
                      required
                    />
                  </div>

                  {/* Row 3: amount + tax */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label>배당금액 ({dividendForm.currency === 'USD' ? '$' : '₩'}) *</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0"
                        placeholder={dividendForm.currency === 'USD' ? '12.50' : '15000'}
                        value={dividendForm.amount}
                        onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>세금 ({dividendForm.currency})</Label>
                      <InputBase
                        type="number"
                        step="any"
                        min="0"
                        value={dividendForm.tax}
                        onChange={(e) => setDividendForm({ ...dividendForm, tax: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Net preview */}
                  {dividendNet > 0 && (
                    <div
                      className="flex items-center justify-between px-4 py-3.5 md:px-5 md:py-4 rounded-2xl text-sm md:text-base"
                      style={{
                        background: 'var(--warning-bg)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      <span style={{ color: 'var(--text-sub)' }}>세후 실수령액</span>
                      <span className="font-bold text-base md:text-lg" style={{ color: 'var(--warning)' }}>
                        {dividendForm.currency === 'USD'
                          ? `$${dividendNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `₩${Math.round(dividendNet).toLocaleString()}`}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 md:py-3.5 rounded-xl text-sm md:text-base font-bold shadow-md transition-all duration-150 disabled:opacity-50 hover:opacity-95"
                    style={{ background: 'var(--accent)', color: '#ffffff' }}
                  >
                    {isSubmitting ? '저장 중...' : '배당 내역 저장'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── List Panel ───────────────────────────── */}
          <div className="space-y-4 md:space-y-6">
            {/* List header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 md:gap-2">
                {(['all', 'trade', 'dividend'] as const).map((f) => {
                  const labels = { all: '전체', trade: `매매 (${trades.length})`, dividend: `배당 (${dividends.length})` };
                  return (
                    <button
                      key={f}
                      onClick={() => setListFilter(f)}
                      className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-150"
                      style={{
                        background: listFilter === f ? 'var(--accent-bg)' : 'transparent',
                        color: listFilter === f ? 'var(--accent)' : 'var(--text-sub)',
                        border: `1px solid ${listFilter === f ? 'var(--accent-border)' : 'transparent'}`,
                      }}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={refreshData}
                className="p-2 rounded-xl transition-colors duration-150 hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-muted)' }}
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 md:w-4.5 md:h-4.5 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List items */}
            {loadingData ? (
              <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--accent)]" />
                <p className="text-xs md:text-sm">데이터를 불러오는 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Trades */}
                {(listFilter === 'all' || listFilter === 'trade') &&
                  trades.map((trade) => {
                    const isBuy = trade.trade_type === 'BUY';
                    const total = trade.quantity * trade.price + (trade.fee || 0) + (trade.tax || 0);
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 rounded-2xl transition-all duration-150 animate-fade-in"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div
                            className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 font-bold"
                            style={{
                              background: isBuy ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: isBuy ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm md:text-base" style={{ color: 'var(--text)' }}>
                                {trade.stock_name}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold"
                                style={{
                                  background: isBuy ? 'var(--success-bg)' : 'var(--danger-bg)',
                                  color: isBuy ? 'var(--success)' : 'var(--danger)',
                                }}
                              >
                                {isBuy ? '매수' : '매도'}
                              </span>
                              <span className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>{trade.trade_date}</span>
                            </div>
                            <div className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
                              {trade.quantity.toLocaleString()}주 ×{' '}
                              {trade.currency === 'USD' ? `$${trade.price}` : `₩${trade.price.toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-sm md:text-base" style={{ color: 'var(--text)' }}>
                              {trade.currency === 'USD'
                                ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `₩${Math.round(total).toLocaleString()}`}
                            </div>
                            <div className="text-[10px] md:text-xs uppercase font-medium" style={{ color: 'var(--text-muted)' }}>{trade.currency}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteTrade(trade.id, trade.stock_name)}
                            className="p-2 rounded-xl transition-colors duration-150 hover:bg-rose-500/10 hover:text-rose-500"
                            style={{ color: 'var(--text-muted)' }}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Dividends */}
                {(listFilter === 'all' || listFilter === 'dividend') &&
                  dividends.map((div) => {
                    const net = div.amount - (div.tax || 0);
                    return (
                      <div
                        key={div.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 rounded-2xl transition-all duration-150 animate-fade-in"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div
                            className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
                          >
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm md:text-base" style={{ color: 'var(--text)' }}>{div.stock_name}</span>
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold"
                                style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
                              >
                                배당금
                              </span>
                              <span className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>{div.payment_date}</span>
                            </div>
                            <div className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
                              세전: {div.currency === 'USD' ? `$${div.amount}` : `₩${div.amount.toLocaleString()}`}
                              {div.tax > 0 && ` | 세금: ${div.currency === 'USD' ? `$${div.tax}` : `₩${div.tax.toLocaleString()}`}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-sm md:text-base" style={{ color: 'var(--warning)' }}>
                              +{div.currency === 'USD'
                                ? `$${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `₩${Math.round(net).toLocaleString()}`}
                            </div>
                            <div className="text-[10px] md:text-xs font-medium" style={{ color: 'var(--text-muted)' }}>세후 ({div.currency})</div>
                          </div>
                          <button
                            onClick={() => handleDeleteDividend(div.id, div.stock_name)}
                            className="p-2 rounded-xl transition-colors duration-150 hover:bg-rose-500/10 hover:text-rose-500"
                            style={{ color: 'var(--text-muted)' }}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {trades.length === 0 && dividends.length === 0 && (
                  <div
                    className="py-16 md:py-20 text-center rounded-2xl"
                    style={{ border: '1px dashed var(--border-hi)', color: 'var(--text-muted)' }}
                  >
                    <p className="text-sm md:text-base font-medium">아직 등록된 내역이 없습니다.</p>
                    <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
                      좌측 폼에서 첫 거래 또는 배당 내역을 입력해 보세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
