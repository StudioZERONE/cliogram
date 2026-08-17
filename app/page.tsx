'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

/* ── Reusable mini-components ────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#888' }}>
      {children}
    </label>
  );
}

function InputBase({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors duration-150
        bg-[#0a0a0a] border border-[#2e2e2e] text-[#ededed] placeholder:text-[#444]
        focus:border-[#0070f3] focus:ring-1 focus:ring-[#0070f3]/40 ${className}`}
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
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: '#555' }}
      />
      <DatePicker
        selected={value}
        onChange={(d: Date | null) => d && onChange(d)}
        dateFormat="yyyy-MM-dd"
        maxDate={new Date()}
        className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none cursor-pointer transition-colors duration-150
          bg-[#0a0a0a] border border-[#2e2e2e] text-[#ededed]
          focus:border-[#0070f3] focus:ring-1 focus:ring-[#0070f3]/40"
        wrapperClassName="w-full"
        popperPlacement="bottom-start"
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
          className={`py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
            value === opt.value
              ? opt.activeClass
              : 'border-[#2e2e2e] text-[#666] bg-[#0a0a0a] hover:border-[#444] hover:text-[#aaa]'
          }`}
        >
          {opt.label}
        </button>
      ))}
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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150
        border border-[#2e2e2e] bg-[#111] hover:border-[#444] text-[#aaa]"
    >
      <DollarSign className="w-3.5 h-3.5" style={{ color: '#17c964' }} />
      <span>USD/KRW</span>
      <span className="font-bold text-[#ededed]">
        {loading ? '...' : rate ? `${rate.usd_krw.toLocaleString()}원` : '-'}
      </span>
      <RefreshCw className={`w-3 h-3 text-[#555] ${loading ? 'animate-spin' : ''}`} />
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
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: accent ? 'rgba(0,112,243,.07)' : '#111',
        border: `1px solid ${accent ? 'rgba(0,112,243,.2)' : '#1f1f1f'}`,
      }}
    >
      <div className="flex items-center justify-between text-xs font-medium" style={{ color: '#666' }}>
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold" style={{ color: accent ? '#338ef7' : '#ededed' }}>
        {value} <span className="text-xs font-normal" style={{ color: '#666' }}>{unit}</span>
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

  /* ── rate display for active date ── */
  const activeDate = activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date;

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0a' }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl animate-fade-in"
          style={{
            background: '#111',
            border: `1px solid ${toast.type === 'success' ? 'rgba(23,201,100,.3)' : 'rgba(243,18,96,.3)'}`,
            color: '#ededed',
          }}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#17c964' }} />
            : <AlertCircle  className="w-4 h-4 shrink-0" style={{ color: '#f31260' }} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 md:px-8"
        style={{
          background: 'rgba(10,10,10,.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1f1f1f',
        }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between py-3.5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: '#0070f3', color: '#fff' }}
            >
              K
            </div>
            <span className="font-semibold tracking-tight text-base" style={{ color: '#ededed' }}>
              KLIOGRAM
            </span>
            <span
              className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(0,112,243,.1)', color: '#338ef7', border: '1px solid rgba(0,112,243,.2)' }}
            >
              자산 관리
            </span>
          </div>

          {/* Rate badge */}
          <RateBadge
            rate={exchangeRate}
            loading={rateLoading}
            onRefresh={() => fetchExchangeRate(toDateStr(activeDate))}
          />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 pt-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="총 매매 기록"
            value={String(trades.length)}
            unit="건"
            icon={<Receipt className="w-4 h-4" style={{ color: '#338ef7' }} />}
          />
          <StatCard
            label="총 배당 수령"
            value={String(dividends.length)}
            unit="건"
            icon={<Coins className="w-4 h-4" style={{ color: '#f5a623' }} />}
          />
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label="누적 세후 배당금 (원화)"
              value={`≈ ${Math.round(totalDividendKRW).toLocaleString()}`}
              unit="원"
              icon={<Wallet className="w-4 h-4" style={{ color: '#17c964' }} />}
              accent
            />
          </div>
        </div>

        {/* Two-column: Form + List */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* ── Form Panel ────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #1f1f1f', background: '#111' }}
          >
            {/* Tab bar */}
            <div
              className="grid grid-cols-2"
              style={{ borderBottom: '1px solid #1f1f1f' }}
            >
              {(['trade', 'dividend'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
                  style={{
                    color: activeTab === tab ? '#ededed' : '#555',
                    background: activeTab === tab ? '#0a0a0a' : 'transparent',
                    borderBottom: activeTab === tab ? '2px solid #0070f3' : '2px solid transparent',
                  }}
                >
                  {tab === 'trade' ? (
                    <><TrendingUp className="w-4 h-4" />매매 내역 입력</>
                  ) : (
                    <><Coins className="w-4 h-4" />배당 내역 입력</>
                  )}
                </button>
              ))}
            </div>

            {/* Exchange rate display */}
            {exchangeRate && (
              <div
                className="px-5 py-2.5 flex items-center justify-between text-xs"
                style={{
                  background: 'rgba(0,112,243,.05)',
                  borderBottom: '1px solid rgba(0,112,243,.1)',
                }}
              >
                <span style={{ color: '#555' }}>적용 환율 ({toDateStr(activeDate)})</span>
                <span className="font-semibold" style={{ color: '#338ef7' }}>
                  {rateLoading ? '조회중...' : `1 USD = ${exchangeRate.usd_krw.toLocaleString()}원`}
                </span>
              </div>
            )}

            {/* Form body */}
            <div className="p-5">
              {activeTab === 'trade' ? (
                <form onSubmit={handleTradeSubmit} className="space-y-4">
                  {/* Row 1: date + currency */}
                  <div className="grid grid-cols-2 gap-4">
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
                          { value: 'USD', label: 'USD ($)', activeClass: 'border-[#0070f3] text-[#338ef7] bg-[#0070f3]/10' },
                          { value: 'KRW', label: 'KRW (₩)', activeClass: 'border-[#0070f3] text-[#338ef7] bg-[#0070f3]/10' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 2: stock + buy/sell */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>종목명 / 티커 *</Label>
                      <InputBase
                        type="text"
                        placeholder="AAPL, TSLA, 삼성전자"
                        value={tradeForm.stock_name}
                        onChange={(e) => setTradeForm({ ...tradeForm, stock_name: e.target.value })}
                        className="uppercase"
                        required
                      />
                    </div>
                    <div>
                      <Label>매매 구분 *</Label>
                      <ToggleGroup
                        value={tradeForm.trade_type}
                        onChange={(v) => setTradeForm({ ...tradeForm, trade_type: v })}
                        options={[
                          { value: 'BUY',  label: '매수', activeClass: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
                          { value: 'SELL', label: '매도', activeClass: 'border-rose-500 text-rose-400 bg-rose-500/10' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 3: qty + price */}
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: 'rgba(0,112,243,.07)',
                        border: '1px solid rgba(0,112,243,.15)',
                      }}
                    >
                      <span style={{ color: '#888' }}>예상 총액</span>
                      <span className="font-bold" style={{ color: '#ededed' }}>
                        {tradeForm.currency === 'USD'
                          ? `$${tradeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `₩${Math.round(tradeTotal).toLocaleString()}`}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                    style={{ background: '#0070f3', color: '#fff' }}
                  >
                    {isSubmitting ? '저장 중...' : '매매 내역 저장'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDividendSubmit} className="space-y-4">
                  {/* Row 1: date + currency */}
                  <div className="grid grid-cols-2 gap-4">
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
                          { value: 'USD', label: 'USD ($)', activeClass: 'border-[#0070f3] text-[#338ef7] bg-[#0070f3]/10' },
                          { value: 'KRW', label: 'KRW (₩)', activeClass: 'border-[#0070f3] text-[#338ef7] bg-[#0070f3]/10' },
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
                      className="uppercase"
                      required
                    />
                  </div>

                  {/* Row 3: amount + tax */}
                  <div className="grid grid-cols-2 gap-4">
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
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: 'rgba(245,166,35,.06)',
                        border: '1px solid rgba(245,166,35,.15)',
                      }}
                    >
                      <span style={{ color: '#888' }}>세후 실수령액</span>
                      <span className="font-bold" style={{ color: '#f5a623' }}>
                        {dividendForm.currency === 'USD'
                          ? `$${dividendNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `₩${Math.round(dividendNet).toLocaleString()}`}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                    style={{ background: '#0070f3', color: '#fff' }}
                  >
                    {isSubmitting ? '저장 중...' : '배당 내역 저장'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── List Panel ───────────────────────────── */}
          <div className="space-y-4">
            {/* List header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(['all', 'trade', 'dividend'] as const).map((f) => {
                  const labels = { all: '전체', trade: `매매 (${trades.length})`, dividend: `배당 (${dividends.length})` };
                  return (
                    <button
                      key={f}
                      onClick={() => setListFilter(f)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                      style={{
                        background: listFilter === f ? 'rgba(0,112,243,.1)' : 'transparent',
                        color: listFilter === f ? '#338ef7' : '#666',
                        border: `1px solid ${listFilter === f ? 'rgba(0,112,243,.25)' : 'transparent'}`,
                      }}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={refreshData}
                className="p-1.5 rounded-lg transition-colors duration-150"
                style={{ color: '#555' }}
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List items */}
            {loadingData ? (
              <div className="py-16 text-center" style={{ color: '#444' }}>
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-xs">불러오는 중...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Trades */}
                {(listFilter === 'all' || listFilter === 'trade') &&
                  trades.map((trade) => {
                    const isBuy = trade.trade_type === 'BUY';
                    const total = trade.quantity * trade.price + (trade.fee || 0) + (trade.tax || 0);
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors duration-150 animate-fade-in"
                        style={{ background: '#111', border: '1px solid #1f1f1f' }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2e2e2e')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f1f1f')}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: isBuy ? 'rgba(23,201,100,.1)' : 'rgba(243,18,96,.1)',
                              color: isBuy ? '#17c964' : '#f31260',
                            }}
                          >
                            {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm" style={{ color: '#ededed' }}>
                                {trade.stock_name}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  background: isBuy ? 'rgba(23,201,100,.1)' : 'rgba(243,18,96,.1)',
                                  color: isBuy ? '#17c964' : '#f31260',
                                }}
                              >
                                {isBuy ? '매수' : '매도'}
                              </span>
                              <span className="text-xs" style={{ color: '#555' }}>{trade.trade_date}</span>
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                              {trade.quantity.toLocaleString()}주 ×{' '}
                              {trade.currency === 'USD' ? `$${trade.price}` : `₩${trade.price.toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-bold text-sm" style={{ color: '#ededed' }}>
                              {trade.currency === 'USD'
                                ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `₩${Math.round(total).toLocaleString()}`}
                            </div>
                            <div className="text-[10px] uppercase" style={{ color: '#555' }}>{trade.currency}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteTrade(trade.id, trade.stock_name)}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: '#444' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#f31260')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors duration-150 animate-fade-in"
                        style={{ background: '#111', border: '1px solid #1f1f1f' }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2e2e2e')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f1f1f')}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(245,166,35,.1)', color: '#f5a623' }}
                          >
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm" style={{ color: '#ededed' }}>{div.stock_name}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ background: 'rgba(245,166,35,.1)', color: '#f5a623' }}
                              >
                                배당금
                              </span>
                              <span className="text-xs" style={{ color: '#555' }}>{div.payment_date}</span>
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                              세전: {div.currency === 'USD' ? `$${div.amount}` : `₩${div.amount.toLocaleString()}`}
                              {div.tax > 0 && ` | 세금: ${div.currency === 'USD' ? `$${div.tax}` : `₩${div.tax.toLocaleString()}`}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-bold text-sm" style={{ color: '#f5a623' }}>
                              +{div.currency === 'USD'
                                ? `$${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `₩${Math.round(net).toLocaleString()}`}
                            </div>
                            <div className="text-[10px]" style={{ color: '#555' }}>세후 ({div.currency})</div>
                          </div>
                          <button
                            onClick={() => handleDeleteDividend(div.id, div.stock_name)}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: '#444' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#f31260')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {trades.length === 0 && dividends.length === 0 && (
                  <div
                    className="py-16 text-center rounded-xl"
                    style={{ border: '1px dashed #2e2e2e', color: '#444' }}
                  >
                    <p className="text-sm">아직 등록된 내역이 없습니다.</p>
                    <p className="text-xs mt-1" style={{ color: '#333' }}>
                      좌측 폼에서 첫 거래를 입력해 보세요.
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
