'use client';

import React, { useEffect, useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { X, Layers, Calculator, Sparkles } from 'lucide-react';
import { CodeSelect } from '@/components/CodeSelect';

export interface StockOption {
  id?: string;
  ticker: string;
  name: string;
  short_name: string;
  currency: string;
  is_active: boolean;
}

export interface TradeRecordData {
  id?: string;
  trade_date: string;
  ticker?: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
  exchange_rate?: number;
  total_amount?: number;
  total_amount_krw?: number;
  fee?: number;
  tax?: number;
  notes?: string;
  created_at?: string;
}

export interface TradeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: TradeRecordData | null;
  stocks: StockOption[];
  onClose: () => void;
  onSave: (data: TradeRecordData) => Promise<void>;
}

export function TradeModal({
  isOpen,
  mode,
  initialData,
  stocks = [],
  onClose,
  onSave,
}: TradeModalProps) {
  const [tradeDate, setTradeDate] = useState<Date>(new Date());
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [ticker, setTicker] = useState<string>('');
  const [stockName, setStockName] = useState<string>('');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY'>('USD');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [fee, setFee] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setTradeDate(initialData.trade_date ? new Date(initialData.trade_date) : new Date());
        setTicker(initialData.ticker || '');
        setStockName(initialData.stock_name || '');
        setTradeType(initialData.trade_type || 'BUY');
        setQuantity(initialData.quantity ? String(initialData.quantity) : '');
        setPrice(initialData.price ? String(initialData.price) : '');
        setCurrency(initialData.currency || 'USD');
        setExchangeRate(initialData.exchange_rate ? String(initialData.exchange_rate) : '1');
        setFee(initialData.fee ? String(initialData.fee) : '0');
        setTax(initialData.tax ? String(initialData.tax) : '0');
        setNotes(initialData.notes || '');

        // Match stock in list
        const matched = stocks.find((s) => s.ticker === initialData.ticker || s.name === initialData.stock_name || s.short_name === initialData.stock_name);
        if (matched) {
          setSelectedStockId(matched.ticker);
        } else {
          setSelectedStockId('custom');
        }
      } else {
        setTradeDate(new Date());
        setSelectedStockId('');
        setTicker('');
        setStockName('');
        setTradeType('BUY');
        setQuantity('');
        setPrice('');
        setCurrency('USD');
        setExchangeRate('1450');
        setFee('0');
        setTax('0');
        setNotes('');
      }
    }
  }, [isOpen, mode, initialData, stocks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto fetch exchange rate when date or currency changes
  useEffect(() => {
    if (!isOpen || currency === 'KRW') {
      if (currency === 'KRW') setExchangeRate('1');
      return;
    }

    const fetchRate = async () => {
      const dateStr = format(tradeDate, 'yyyy-MM-dd');
      setIsFetchingRate(true);
      try {
        const res = await fetch(`/api/exchange-rate?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.usd_krw) {
            setExchangeRate(String(data.usd_krw));
          }
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchRate();
  }, [isOpen, tradeDate, currency]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleStockSelect = (stockTicker: string) => {
    setSelectedStockId(stockTicker);
    if (stockTicker === 'custom') {
      return;
    }
    const matched = stocks.find((s) => s.ticker === stockTicker);
    if (matched) {
      setTicker(matched.ticker);
      setStockName(matched.short_name || matched.name);
      setCurrency((matched.currency as any) || 'USD');
    }
  };

  const parsedQty = parseFloat(quantity) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const parsedRate = parseFloat(exchangeRate) || (currency === 'KRW' ? 1 : 1450);
  const parsedFee = parseFloat(fee) || 0;
  const parsedTax = parseFloat(tax) || 0;

  const rawTotal = parsedQty * parsedPrice;
  const krwTotal = currency === 'KRW' ? rawTotal : rawTotal * parsedRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName.trim() || parsedQty <= 0 || parsedPrice <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        trade_date: format(tradeDate, 'yyyy-MM-dd'),
        ticker: ticker.trim().toUpperCase(),
        stock_name: stockName.trim(),
        trade_type: tradeType,
        quantity: parsedQty,
        price: parsedPrice,
        currency,
        exchange_rate: currency === 'KRW' ? 1 : parsedRate,
        total_amount: rawTotal,
        total_amount_krw: krwTotal,
        fee: parsedFee,
        tax: parsedTax,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('TradeModal save error:', err);
      alert(`매매 내역 저장 중 오류가 발생했습니다: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !stockName.trim() || parsedQty <= 0 || parsedPrice <= 0;

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
              {mode === 'create' ? '매매 내역 신규 등록' : '매매 내역 정보 수정'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Trade Date & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                거래 일자 <span className="text-red-500">*</span>
              </label>
              <DatePicker
                selected={tradeDate}
                onChange={(date: Date | null) => date && setTradeDate(date)}
                dateFormat="yyyy-MM-dd"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-center font-semibold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                거래 구분 <span className="text-red-500">*</span>
              </label>
              <CodeSelect
                groupId="TRADE_TYPE"
                value={tradeType}
                onChange={(val) => setTradeType(val as any)}
              />
            </div>
          </div>

          {/* Stock Master Selection */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              종목 선택 (종목 마스터 연동) <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStockId}
              onChange={(e) => handleStockSelect(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer shadow-inner"
            >
              <option value="">-- 종목 마스터에서 선택 --</option>
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  [{s.ticker}] {s.short_name || s.name} ({s.currency}){!s.is_active ? ' [사용중지]' : ''}
                </option>
              ))}
              <option value="custom">+ 기타 수동 직접 입력</option>
            </select>
          </div>

          {/* Stock Name & Ticker Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                짧은 종목명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: 애플, 삼성전자"
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                티커 코드
              </label>
              <input
                type="text"
                placeholder="예: AAPL, 005930"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold uppercase text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
              />
            </div>
          </div>

          {/* Quantity, Price, Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm font-bold text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                단가 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="185.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm font-bold text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
                required
              />
            </div>
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
          </div>

          {/* Exchange Rate (Conditional display for Foreign currencies) */}
          {currency !== 'KRW' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  적용 환율 ({currency} ➔ KRW)
                </label>
                {isFetchingRate && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                    실시간 환율 수집 중...
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                placeholder="1450.0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm font-bold text-right text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
              />
              <p className="text-[10px] text-[var(--fg-muted)]">
                거래일자 기준 환율이 자동 반영되며, 수동으로 수정할 수 있습니다.
              </p>
            </div>
          )}

          {/* Live Calculated Total Summary Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3.5 space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[var(--fg-muted)] flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5 text-emerald-500" />
                원화 외화 거래금액 (원본):
              </span>
              <span className="text-sm font-bold text-[var(--fg)]">
                {currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}{' '}
                {rawTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {currency !== 'KRW' && (
              <div className="flex items-center justify-between font-bold border-t border-[var(--border)] pt-1 text-emerald-600 dark:text-emerald-400">
                <span>원화 환산 예상 총금액 (KRW):</span>
                <span className="text-sm font-bold">
                  ₩ {Math.round(krwTotal).toLocaleString()} 원
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              비고 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 분할매수, 손절, 해외대체입고 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--fg)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장 중...' : mode === 'create' ? '매매 내역 추가' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
