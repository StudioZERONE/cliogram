'use client';

import React, { useEffect, useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { X, Layers, Calculator, RefreshCw } from 'lucide-react';
import { CodeSelect } from '@/components/CodeSelect';
import { formatCommaString, parseCommaNumber } from '@/lib/format';
import { lookupTickerInfo, fetchRemoteTickerInfo } from '@/lib/stock-ticker';

export interface StockOption {
  id?: string;
  ticker: string;
  name: string;
  short_name: string;
  currency: string;
  market?: string;
  type?: string;
  is_active: boolean;
}

export interface AccountOption {
  id: string;
  account_name: string;
  broker_name?: string | null;
  account_number?: string | null;
  is_active?: boolean;
}

export interface TradeRecordData {
  id?: string;
  user_id?: string;
  account_id?: string;
  trade_date: string;
  ticker: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
  exchange_rate?: number;
  total_amount?: number;
  total_amount_krw?: number;
  fee?: number;
  tax?: number;
  foreign_fee?: number;
  foreign_tax?: number;
  notes?: string;
  created_at?: string;
  accounts?: {
    id: string;
    account_name: string;
    broker_name?: string | null;
  };
  resolvedStock?: {
    name: string;
    short_name: string;
    type?: string;
    currency?: string;
    market?: string;
  } | null;
}

export interface TradeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: TradeRecordData | null;
  stocks: StockOption[];
  accounts?: AccountOption[];
  onClose: () => void;
  onSave: (data: TradeRecordData) => Promise<void>;
}

export function TradeModal({
  isOpen,
  mode,
  initialData,
  stocks = [],
  accounts = [],
  onClose,
  onSave,
}: TradeModalProps) {
  const [tradeDate, setTradeDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState<string>('');
  const [ticker, setTicker] = useState<string>('');
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY'>('USD');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [rateFetchedAt, setRateFetchedAt] = useState<Date | null>(null);
  const [resolvedStock, setResolvedStock] = useState<{ name: string; short_name: string; currency: string; type?: string; market?: string } | null>(null);
  const [fee, setFee] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [foreignFee, setForeignFee] = useState<string>('0');
  const [foreignTax, setForeignTax] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setTradeDate(initialData.trade_date ? new Date(initialData.trade_date) : new Date());
        setAccountId(initialData.account_id || (accounts[0]?.id || ''));
        const initTicker = initialData.ticker || '';
        setTicker(initTicker);

        // Resolve stock name
        const dbMatch = stocks.find((s) => s.ticker.toUpperCase() === initTicker.toUpperCase());
        const preset = lookupTickerInfo(initTicker);
        if (dbMatch) {
          setResolvedStock({
            name: dbMatch.name,
            short_name: dbMatch.short_name || dbMatch.name,
            currency: dbMatch.currency || initialData.currency || 'USD',
            type: dbMatch.type || 'Growth',
            market: dbMatch.market || '',
          });
        } else if (preset) {
          setResolvedStock({
            name: preset.name,
            short_name: preset.short_name || preset.name,
            currency: preset.currency || initialData.currency || 'USD',
            type: preset.type || 'Growth',
            market: preset.market || '',
          });
        } else {
          setResolvedStock(null);
        }

        // If SELL, make sure quantity reflects negative sign
        const rawQty = initialData.quantity || 0;
        const signedQty = initialData.trade_type === 'SELL' ? -Math.abs(rawQty) : Math.abs(rawQty);
        setQuantity(formatCommaString(signedQty));

        setPrice(formatCommaString(initialData.price || ''));
        setCurrency(initialData.currency || 'USD');
        setExchangeRate(formatCommaString(initialData.exchange_rate || '1'));
        setRateFetchedAt(new Date());
        setFee(formatCommaString(initialData.fee || '0'));
        setTax(formatCommaString(initialData.tax || '0'));
        setForeignFee(formatCommaString(initialData.foreign_fee || '0'));
        setForeignTax(formatCommaString(initialData.foreign_tax || '0'));
        setNotes(initialData.notes || '');
      } else {
        setTradeDate(new Date());
        setAccountId(accounts[0]?.id || '');
        setTicker('');
        setResolvedStock(null);
        setCurrency('USD');
        setPrice('');
        setQuantity('');
        setExchangeRate('1,450');
        setRateFetchedAt(null);
        setFee('0');
        setTax('0');
        setForeignFee('0');
        setForeignTax('0');
        setNotes('');
      }
    }
  }, [isOpen, mode, initialData, stocks, accounts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch exchange rate logic
  const fetchRate = async () => {
    if (currency === 'KRW') {
      setExchangeRate('1');
      setRateFetchedAt(new Date());
      return;
    }

    const dateStr = format(tradeDate, 'yyyy-MM-dd');
    setIsFetchingRate(true);
    try {
      const res = await fetch(`/api/exchange-rate?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.usd_krw) {
          setExchangeRate(formatCommaString(data.usd_krw));
          setRateFetchedAt(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to fetch exchange rate:', err);
    } finally {
      setIsFetchingRate(false);
    }
  };

  // Auto fetch exchange rate when date or currency changes, plus 1-min interval
  useEffect(() => {
    if (!isOpen) return;
    fetchRate();

    if (currency !== 'KRW') {
      const interval = setInterval(() => {
        fetchRate();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, tradeDate, currency]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Handle ticker change and multi-source auto-resolution (DB -> Preset -> Remote API)
  const handleTickerChange = async (val: string) => {
    const upper = val.toUpperCase();
    setTicker(upper);
    const trimmed = upper.trim();

    if (!trimmed) {
      setResolvedStock(null);
      setCurrency('USD');
      return;
    }

    // 1. Check user DB registered stocks
    const dbMatch = stocks.find((s) => s.ticker.toUpperCase() === trimmed);
    if (dbMatch) {
      setResolvedStock({
        name: dbMatch.name,
        short_name: dbMatch.short_name || dbMatch.name,
        currency: dbMatch.currency || 'USD',
        type: dbMatch.type || 'Growth',
        market: dbMatch.market || '',
      });
      if (dbMatch.currency) {
        setCurrency(dbMatch.currency as any);
      }
      return;
    }

    // 2. Check local popular stock preset dictionary (AAPL, 005930, MSFT, etc.)
    const preset = lookupTickerInfo(trimmed);
    if (preset) {
      setResolvedStock({
        name: preset.name,
        short_name: preset.short_name || preset.name,
        currency: preset.currency || 'USD',
        type: preset.type || 'Growth',
        market: preset.market || '',
      });
      if (preset.currency) {
        setCurrency(preset.currency as any);
      }
      return;
    }

    // 3. Fallback: Query remote Yahoo/stock-lookup API
    try {
      const remote = await fetchRemoteTickerInfo(trimmed);
      if (remote) {
        setResolvedStock({
          name: remote.name,
          short_name: remote.short_name || remote.name,
          currency: remote.currency || 'USD',
          type: remote.type || 'Growth',
          market: remote.market || '',
        });
        if (remote.currency) {
          setCurrency(remote.currency as any);
        }
        return;
      }
    } catch {
      // ignore
    }

    setResolvedStock(null);
  };

  const parsedQty = parseCommaNumber(quantity);
  const parsedPrice = parseCommaNumber(price);
  const parsedRate = parseCommaNumber(exchangeRate) || (currency === 'KRW' ? 1 : 1450);
  const parsedFee = parseCommaNumber(fee);
  const parsedTax = parseCommaNumber(tax);
  const parsedForeignFee = parseCommaNumber(foreignFee);
  const parsedForeignTax = parseCommaNumber(foreignTax);

  // Automated trade type: positive -> BUY, negative -> SELL
  const tradeType: 'BUY' | 'SELL' = parsedQty < 0 ? 'SELL' : 'BUY';

  const rawTotal = parsedQty * parsedPrice;
  const krwTotal = currency === 'KRW' ? rawTotal : rawTotal * parsedRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || parsedQty === 0 || parsedPrice <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        account_id: accountId || undefined,
        trade_date: format(tradeDate, 'yyyy-MM-dd'),
        ticker: ticker.trim().toUpperCase(),
        trade_type: tradeType,
        quantity: parsedQty,
        price: parsedPrice,
        currency,
        exchange_rate: currency === 'KRW' ? 1 : parsedRate,
        total_amount: rawTotal,
        total_amount_krw: krwTotal,
        fee: parsedFee,
        tax: parsedTax,
        foreign_fee: parsedForeignFee,
        foreign_tax: parsedForeignTax,
        notes: notes.trim(),
        resolvedStock,
      });
      onClose();
    } catch (err: any) {
      console.error('TradeModal save error:', err);
      alert(`매매 내역 저장 중 오류가 발생했습니다: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !ticker.trim() || parsedQty === 0 || parsedPrice <= 0;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden cursor-default text-[var(--fg)] animate-in zoom-in-95"
      >
        {/* Fixed Header outside scroll area */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold">
              {mode === 'create' ? '매매 기록 신규 등록' : '매매 기록 정보 수정'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {/* 구역 1: 기본 거래 정보 및 환율/금액 통합 블록 (매매일자, 계좌, 티커, 종목명, 통화, 단가, 수량, 환율&거래금액) */}
          <div className="space-y-3 sm:space-y-3.5">
            {/* 행 1: [매매 일자 (50%)] | [계좌 (50%)] */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-start">
              <div>
                <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                  매매 일자 <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={tradeDate}
                  onChange={(date: Date | null) => date && setTradeDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-center font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                  계좌 <span className="text-red-500">*</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[var(--surface)] text-[var(--fg)]">
                      {acc.broker_name ? `${acc.broker_name} (${acc.account_name})` : acc.account_name}
                    </option>
                  ))}
                  {accounts.length === 0 && (
                    <option value="" className="bg-[var(--surface)] text-[var(--fg)]">
                      기본 투자계좌
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* 행 2: [티커 (50%)] | [종목명 (50%)] */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-start">
              <div>
                <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                  티커 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="AAPL, 005930"
                  value={ticker}
                  onChange={(e) => handleTickerChange(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-bold uppercase text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                  종목명
                </label>
                <div className="flex items-center h-[36px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-xs sm:text-sm font-bold text-[var(--fg)] truncate">
                  {resolvedStock ? (
                    <span className="truncate text-[var(--fg)]">
                      {resolvedStock.short_name || resolvedStock.name}
                    </span>
                  ) : ticker.trim() ? (
                    <span className="text-[var(--fg-muted)] text-[11px] sm:text-xs font-normal">미등록 종목</span>
                  ) : (
                    <span className="text-[var(--fg-muted)] text-xs font-normal"></span>
                  )}
                </div>
              </div>
            </div>

            {/* 행 3: [통화 (50%)] | [단가(25%) + 수량(25%)] - 상단 그리드와 50:50 수직선 완전 일치 */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-start">
              <div>
                <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                  통화
                </label>
                <CodeSelect
                  groupId="CURRENCY_CODE"
                  value={currency}
                  onChange={(val) => setCurrency(val as any)}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1 truncate">
                    단가 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="185.50"
                    value={price}
                    onChange={(e) => setPrice(formatCommaString(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-xs sm:text-sm font-bold text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1 truncate">
                    수량 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="+10"
                    value={quantity}
                    onChange={(e) => setQuantity(formatCommaString(e.target.value))}
                    className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-xs sm:text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner ${
                      parsedQty < 0 ? 'text-red-500' : 'text-[var(--fg)]'
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 환율 및 거래금액 요약 카드 (은은한 틴트 배경 & 픽셀 단위 완전 일치 고정 3단 구조) */}
            <div className="rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] p-3 sm:p-3.5 space-y-2 shadow-2xs">
              {/* 1단: 기준 정보 행 (h-7 고정 높이) */}
              {currency !== 'KRW' ? (
                <div className="flex items-center justify-between gap-1.5 h-7">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] sm:text-xs font-bold text-[var(--fg)] flex items-center gap-1">
                      <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      적용 환율
                    </span>
                    <div className="flex items-center gap-0.5 text-[10px] sm:text-[11px] text-[var(--fg-muted)]">
                      {rateFetchedAt && <span>({format(rateFetchedAt, 'HH:mm')})</span>}
                      <button
                        type="button"
                        onClick={() => fetchRate()}
                        disabled={isFetchingRate}
                        className="p-0.5 rounded hover:bg-[var(--bg)] text-[var(--fg-muted)] hover:text-emerald-600 transition-colors cursor-pointer"
                        title="환율 새로고침"
                        aria-label="환율 새로고침"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFetchingRate ? 'animate-spin text-emerald-600' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-right">
                    <span className="text-xs sm:text-sm font-bold text-[var(--fg)]">
                      {parsedRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10.5px] sm:text-xs font-semibold text-[var(--fg-muted)] shrink-0">KRW/{currency}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1.5 h-7">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] sm:text-xs font-bold text-[var(--fg)] flex items-center gap-1">
                      <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      거래 기준
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      국내 원화 직결제
                    </span>
                  </div>
                  <div className="text-right text-[11px] sm:text-xs font-semibold text-[var(--fg-muted)] truncate">
                    {parsedQty !== 0 && parsedPrice > 0 ? (
                      <span className="text-[var(--fg)]">
                        ₩ {parsedPrice.toLocaleString()} × {Math.abs(parsedQty).toLocaleString()}주
                      </span>
                    ) : (
                      <span>환율 미적용 (1.00)</span>
                    )}
                  </div>
                </div>
              )}

              {/* 2단: 총 거래금액 및 결제액 행 (h-10 완전 일치 2열 그리드) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 border-t border-emerald-500/15 dark:border-emerald-500/25 pt-1.5 sm:pt-2 text-xs">
                {currency !== 'KRW' ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-[11px] text-[var(--fg-muted)] font-medium">총 거래금액 ({currency})</span>
                      <span className={`font-bold text-xs sm:text-sm truncate ${rawTotal < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {rawTotal < 0 ? '- ' : ''}{currency === 'USD' ? '$ ' : `${currency} `}
                        {parsedQty !== 0 && parsedPrice > 0 ? Math.abs(rawTotal).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] sm:text-[11px] text-[var(--fg-muted)] font-medium">원화 환산 금액 (KRW)</span>
                      <span className={`font-bold text-xs sm:text-sm truncate ${krwTotal < 0 ? 'text-red-500' : 'text-[var(--fg)]'}`}>
                        {krwTotal < 0 ? '- ' : ''}₩ {parsedQty !== 0 && parsedPrice > 0 ? Math.round(Math.abs(krwTotal)).toLocaleString() : '0'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-[11px] text-[var(--fg-muted)] font-medium">총 거래금액 (KRW)</span>
                      <span className={`font-bold text-xs sm:text-sm truncate ${rawTotal < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {rawTotal < 0 ? '- ' : ''}₩ {parsedQty !== 0 && parsedPrice > 0 ? Math.abs(rawTotal).toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] sm:text-[11px] text-[var(--fg-muted)] font-medium">원화 결제 총액</span>
                      <span className={`font-bold text-xs sm:text-sm text-[var(--fg)] truncate`}>
                        {rawTotal < 0 ? '- ' : ''}₩ {parsedQty !== 0 && parsedPrice > 0 ? Math.abs(rawTotal).toLocaleString() : '0'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* 3단: 하단 안내 문구 (한 줄 높이 leading-tight 완전 일치) */}
              <p className="text-[9.5px] sm:text-[10.5px] text-[var(--fg-muted)] pt-1 border-t border-emerald-500/15 dark:border-emerald-500/25 leading-tight truncate sm:whitespace-normal">
                {currency !== 'KRW'
                  ? '* 환율은 시간에 따라 변하고, 예측치이므로 실제 환산금액은 다를 수 있습니다.'
                  : '* 원화(KRW) 결제 종목으로 별도의 외화 환전 수수료 및 환율 변동이 발생하지 않습니다.'}
              </p>
            </div>
          </div>

          {/* 구분선 1 */}
          <div className="border-t border-[var(--border)]" />

          {/* 구역 2: 수수료 및 제세금 */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs font-bold text-[var(--fg-muted)]">
              수수료 및 제세금
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[var(--fg-muted)] mb-1">
                  수수료
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fee}
                  onChange={(e) => setFee(formatCommaString(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold text-right text-[var(--fg)] focus:outline-none shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--fg-muted)] mb-1">
                  제세금
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tax}
                  onChange={(e) => setTax(formatCommaString(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold text-right text-[var(--fg)] focus:outline-none shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--fg-muted)] mb-1">
                  외화수수료
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={foreignFee}
                  onChange={(e) => setForeignFee(formatCommaString(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold text-right text-[var(--fg)] focus:outline-none shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--fg-muted)] mb-1">
                  외화제세금
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={foreignTax}
                  onChange={(e) => setForeignTax(formatCommaString(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold text-right text-[var(--fg)] focus:outline-none shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* 구분선 2 */}
          <div className="border-t border-[var(--border)]" />

          {/* 구역 3: 비고 (메모) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--fg-muted)]">
              비고 (메모)
            </label>
            <input
              type="text"
              placeholder="예: ISA 계좌 매매, 분할 매수 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--fg-muted)] hover:bg-[var(--bg)] rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4.5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isSubmitting ? '저장 중...' : mode === 'create' ? '신규 등록' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
