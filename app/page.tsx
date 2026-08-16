'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  Coins,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Sparkles,
  Receipt,
  Wallet,
} from 'lucide-react';

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

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  // 탭 상태: 'trade' (매매 내역 입력) | 'dividend' (배당 내역 입력)
  const [activeTab, setActiveTab] = useState<'trade' | 'dividend'>('trade');
  const [listFilter, setListFilter] = useState<'all' | 'trade' | 'dividend'>('all');

  // 환율 상태
  const [exchangeRate, setExchangeRate] = useState<{
    rate_date: string;
    usd_krw: number;
    source: string;
  } | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  // 알림 토스트
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 매매 내역 폼 상태
  const [tradeForm, setTradeForm] = useState({
    trade_date: getTodayString(),
    stock_name: '',
    trade_type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    fee: '0',
    tax: '0',
    currency: 'USD' as 'KRW' | 'USD',
  });

  // 배당 내역 폼 상태
  const [dividendForm, setDividendForm] = useState({
    payment_date: getTodayString(),
    stock_name: '',
    amount: '',
    tax: '0',
    currency: 'USD' as 'KRW' | 'USD',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 데이터 목록 상태
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. 환율 조회 함수
  const fetchExchangeRate = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setRateLoading(true);
    try {
      const res = await fetch(`/api/exchange-rate?date=${dateStr}`);
      if (!res.ok) throw new Error('환율 정보를 불러올 수 없습니다.');
      const data = await res.json();
      setExchangeRate({
        rate_date: data.rate_date,
        usd_krw: data.usd_krw,
        source: data.source,
      });
    } catch (err: any) {
      console.error('환율 조회 오류:', err);
    } finally {
      setRateLoading(false);
    }
  }, []);

  // 2. DB 데이터 조회 (매매 + 배당 목록)
  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [tradesRes, dividendsRes] = await Promise.all([
        supabase.from('trades').select('*').order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('dividends').select('*').order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
      ]);

      if (tradesRes.data) setTrades(tradesRes.data as Trade[]);
      if (dividendsRes.data) setDividends(dividendsRes.data as Dividend[]);
    } catch (err: any) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchExchangeRate(getTodayString());
    refreshData();
  }, [fetchExchangeRate, refreshData]);

  // 활성 탭 변경 또는 날짜 변경 시 해당 날짜의 환율 자동 조회
  useEffect(() => {
    const selectedDate = activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date;
    fetchExchangeRate(selectedDate);
  }, [activeTab, tradeForm.trade_date, dividendForm.payment_date, fetchExchangeRate]);

  // 3. 매매 내역 저장 핸들러
  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeForm.stock_name.trim()) {
      showToast('종목명을 입력해 주세요.', 'error');
      return;
    }
    const qty = parseFloat(tradeForm.quantity);
    const price = parseFloat(tradeForm.price);
    if (!qty || qty <= 0) {
      showToast('올바른 수량을 입력해 주세요.', 'error');
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast('올바른 단가를 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trades').insert([
        {
          trade_date: tradeForm.trade_date,
          stock_name: tradeForm.stock_name.trim().toUpperCase(),
          trade_type: tradeForm.trade_type,
          quantity: qty,
          price: price,
          currency: tradeForm.currency,
          fee: parseFloat(tradeForm.fee) || 0,
          tax: parseFloat(tradeForm.tax) || 0,
        },
      ]);

      if (error) throw error;

      showToast(`${tradeForm.stock_name.toUpperCase()} 매매 내역이 저장되었습니다.`);
      // 폼 초기화
      setTradeForm((prev) => ({
        ...prev,
        stock_name: '',
        quantity: '',
        price: '',
        fee: '0',
        tax: '0',
      }));
      // 목록 새로고침
      await refreshData();
    } catch (err: any) {
      console.error('매매 내역 저장 오류:', err);
      showToast(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 배당 내역 저장 핸들러
  const handleDividendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendForm.stock_name.trim()) {
      showToast('종목명을 입력해 주세요.', 'error');
      return;
    }
    const amt = parseFloat(dividendForm.amount);
    if (!amt || amt <= 0) {
      showToast('올바른 배당금액을 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('dividends').insert([
        {
          payment_date: dividendForm.payment_date,
          stock_name: dividendForm.stock_name.trim().toUpperCase(),
          amount: amt,
          tax: parseFloat(dividendForm.tax) || 0,
          currency: dividendForm.currency,
        },
      ]);

      if (error) throw error;

      showToast(`${dividendForm.stock_name.toUpperCase()} 배당 내역이 저장되었습니다.`);
      // 폼 초기화
      setDividendForm((prev) => ({
        ...prev,
        stock_name: '',
        amount: '',
        tax: '0',
      }));
      // 목록 새로고침
      await refreshData();
    } catch (err: any) {
      console.error('배당 내역 저장 오류:', err);
      showToast(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. 내역 삭제 핸들러
  const handleDeleteTrade = async (id: string, name: string) => {
    if (!confirm(`정말 "${name}" 매매 내역을 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
      showToast('매매 내역이 삭제되었습니다.');
      refreshData();
    } catch (err: any) {
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteDividend = async (id: string, name: string) => {
    if (!confirm(`정말 "${name}" 배당 내역을 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from('dividends').delete().eq('id', id);
      if (error) throw error;
      showToast('배당 내역이 삭제되었습니다.');
      refreshData();
    } catch (err: any) {
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // 실시간 예상 총액 계산
  const tradeQuantityNum = parseFloat(tradeForm.quantity) || 0;
  const tradePriceNum = parseFloat(tradeForm.price) || 0;
  const tradeFeeNum = parseFloat(tradeForm.fee) || 0;
  const tradeTaxNum = parseFloat(tradeForm.tax) || 0;
  const tradeTotal = tradeQuantityNum * tradePriceNum + tradeFeeNum + tradeTaxNum;

  const dividendAmountNum = parseFloat(dividendForm.amount) || 0;
  const dividendTaxNum = parseFloat(dividendForm.tax) || 0;
  const dividendNet = Math.max(0, dividendAmountNum - dividendTaxNum);

  // 통합 통계 계산
  const totalTradeCount = trades.length;
  const totalDividendCount = dividends.length;
  const totalDividendKRW = dividends.reduce((acc, curr) => {
    const net = curr.amount - curr.tax;
    if (curr.currency === 'USD') {
      return acc + net * (exchangeRate?.usd_krw || 1400);
    }
    return acc + net;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-200 text-sm font-medium bg-slate-900/90 border-slate-700 text-slate-100">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CLIO <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">자산 관리</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">실시간 환율 연동 주식 매매 & 배당금 포트폴리오</p>
            </div>
          </div>

          {/* 환율 퀵 배지 (헤더) */}
          <button
            onClick={() => fetchExchangeRate(activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date)}
            disabled={rateLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>USD/KRW:</span>
            <span className="font-bold text-white">
              {rateLoading ? '조회중...' : exchangeRate ? `${exchangeRate.usd_krw.toLocaleString()}원` : '-'}
            </span>
            <RefreshCw className={`w-3 h-3 text-slate-400 ${rateLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* 요약 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>총 매매 기록</span>
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-white">
              {totalTradeCount} <span className="text-xs font-normal text-slate-400">건</span>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>총 배당 수령</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-white">
              {totalDividendCount} <span className="text-xs font-normal text-slate-400">건</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-blue-950/40 to-slate-900/60 border border-blue-800/30 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-300 text-xs font-medium">
              <span>누적 세후 배당금 (원화환산)</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-emerald-400">
              ≈ {Math.round(totalDividendKRW).toLocaleString()} <span className="text-xs font-normal text-slate-400">원</span>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('trade')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'trade'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>매매 내역 입력</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dividend')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'dividend'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>배당 내역 입력</span>
          </button>
        </div>

        {/* 입력 폼 컨테이너 */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
          {/* 환율 자동 표시 배너 */}
          <div className="mb-6 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">
                선택 일자 ({activeTab === 'trade' ? tradeForm.trade_date : dividendForm.payment_date})
              </span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="text-slate-400">적용 환율:</span>
              <span className="text-sm font-bold text-emerald-400">
                {rateLoading
                  ? '조회 중...'
                  : exchangeRate
                  ? `${exchangeRate.usd_krw.toLocaleString()}원`
                  : '환율 정보 없음'}
              </span>
              {exchangeRate?.source && (
                <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-700 text-slate-300">
                  {exchangeRate.source === 'database'
                    ? 'DB 저장값'
                    : exchangeRate.source === 'frankfurter_cached'
                    ? '자동 캐시됨'
                    : '실시간'}
                </span>
              )}
            </div>
          </div>

          {/* 1. 매매 내역 입력 폼 */}
          {activeTab === 'trade' && (
            <form onSubmit={handleTradeSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 거래일자 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">거래일자 *</label>
                  <input
                    type="date"
                    required
                    value={tradeForm.trade_date}
                    onChange={(e) => setTradeForm({ ...tradeForm, trade_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* 매매 구분 (BUY / SELL) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">매매 구분 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTradeForm({ ...tradeForm, trade_type: 'BUY' })}
                      className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        tradeForm.trade_type === 'BUY'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      매수 (BUY)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeForm({ ...tradeForm, trade_type: 'SELL' })}
                      className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        tradeForm.trade_type === 'SELL'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      매도 (SELL)
                    </button>
                  </div>
                </div>

                {/* 종목명 */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">종목명 (또는 티커) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: AAPL, TSLA, 삼성전자, NVDA"
                    value={tradeForm.stock_name}
                    onChange={(e) => setTradeForm({ ...tradeForm, stock_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors uppercase"
                  />
                </div>

                {/* 통화 선택 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">거래 통화 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTradeForm({ ...tradeForm, currency: 'USD' })}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        tradeForm.currency === 'USD'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeForm({ ...tradeForm, currency: 'KRW' })}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        tradeForm.currency === 'KRW'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      KRW (₩)
                    </button>
                  </div>
                </div>

                {/* 수량 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">수량 *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.000001"
                    required
                    placeholder="예: 10"
                    value={tradeForm.quantity}
                    onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* 단가 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    단가 ({tradeForm.currency === 'USD' ? '$' : '₩'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder={tradeForm.currency === 'USD' ? '예: 185.50' : '예: 75000'}
                    value={tradeForm.price}
                    onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* 수수료 & 세금 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      수수료 ({tradeForm.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={tradeForm.fee}
                      onChange={(e) => setTradeForm({ ...tradeForm, fee: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      세금 ({tradeForm.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={tradeForm.tax}
                      onChange={(e) => setTradeForm({ ...tradeForm, tax: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 실시간 계산 합계 미리보기 */}
              {tradeTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-blue-200 font-medium">예상 거래 총액:</span>
                  <div className="text-right">
                    <span className="font-bold text-white text-base">
                      {tradeForm.currency === 'USD' ? `$${tradeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₩${Math.round(tradeTotal).toLocaleString()}`}
                    </span>
                    {tradeForm.currency === 'USD' && exchangeRate && (
                      <span className="block text-[11px] text-slate-400">
                        ≈ ₩{Math.round(tradeTotal * exchangeRate.usd_krw).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 저장 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    <span>매매 내역 저장</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. 배당 내역 입력 폼 */}
          {activeTab === 'dividend' && (
            <form onSubmit={handleDividendSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 지급일자 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">지급일자 *</label>
                  <input
                    type="date"
                    required
                    value={dividendForm.payment_date}
                    onChange={(e) => setDividendForm({ ...dividendForm, payment_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* 통화 선택 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">배당 통화 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDividendForm({ ...dividendForm, currency: 'USD' })}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        dividendForm.currency === 'USD'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDividendForm({ ...dividendForm, currency: 'KRW' })}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        dividendForm.currency === 'KRW'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      KRW (₩)
                    </button>
                  </div>
                </div>

                {/* 종목명 */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">종목명 (또는 티커) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: SCHD, JEPI, O, 삼성전자우"
                    value={dividendForm.stock_name}
                    onChange={(e) => setDividendForm({ ...dividendForm, stock_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors uppercase"
                  />
                </div>

                {/* 배당금액 (세전) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    배당금액 (세전 {dividendForm.currency === 'USD' ? '$' : '₩'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.000001"
                    required
                    placeholder={dividendForm.currency === 'USD' ? '예: 25.50' : '예: 35000'}
                    value={dividendForm.amount}
                    onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* 배당 세금 (배당소득세) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    원천징수 세금 ({dividendForm.currency === 'USD' ? '$' : '₩'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="예: 3.82"
                    value={dividendForm.tax}
                    onChange={(e) => setDividendForm({ ...dividendForm, tax: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* 실시간 세후 수령액 계산 미리보기 */}
              {dividendAmountNum > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-amber-200 font-medium">세후 실수령 배당금:</span>
                  <div className="text-right">
                    <span className="font-bold text-white text-base">
                      {dividendForm.currency === 'USD'
                        ? `$${dividendNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `₩${Math.round(dividendNet).toLocaleString()}`}
                    </span>
                    {dividendForm.currency === 'USD' && exchangeRate && (
                      <span className="block text-[11px] text-slate-400">
                        ≈ ₩{Math.round(dividendNet * exchangeRate.usd_krw).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 저장 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    <span>배당 내역 저장</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* 하단 데이터 목록 리스트 */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">기록된 내역 목록</h2>
            </div>

            {/* 필터 탭 */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setListFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  listFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setListFilter('trade')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  listFilter === 'trade' ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                매매 ({trades.length})
              </button>
              <button
                onClick={() => setListFilter('dividend')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  listFilter === 'dividend' ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                배당 ({dividends.length})
              </button>
              <button
                onClick={refreshData}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors ml-1"
                title="목록 새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 목록 표시 */}
          {loadingData ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-sm">데이터를 불러오는 중입니다...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 매매 내역 렌더링 */}
              {(listFilter === 'all' || listFilter === 'trade') &&
                trades.map((trade) => {
                  const isBuy = trade.trade_type === 'BUY';
                  const total = trade.quantity * trade.price + (trade.fee || 0) + (trade.tax || 0);

                  return (
                    <div
                      key={trade.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm sm:text-base">{trade.stock_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {isBuy ? '매수' : '매도'}
                            </span>
                            <span className="text-xs text-slate-400">{trade.trade_date}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {trade.quantity.toLocaleString()}주 × {trade.currency === 'USD' ? `$${trade.price}` : `₩${trade.price.toLocaleString()}`}
                            {trade.fee > 0 && ` (수수료: ${trade.fee})`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-sm sm:text-base text-white">
                            {trade.currency === 'USD'
                              ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `₩${Math.round(total).toLocaleString()}`}
                          </div>
                          <div className="text-[11px] text-slate-400 uppercase font-medium">{trade.currency}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteTrade(trade.id, trade.stock_name)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* 배당 내역 렌더링 */}
              {(listFilter === 'all' || listFilter === 'dividend') &&
                dividends.map((div) => {
                  const net = div.amount - (div.tax || 0);

                  return (
                    <div
                      key={div.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm sm:text-base">{div.stock_name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              배당금
                            </span>
                            <span className="text-xs text-slate-400">{div.payment_date}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            세전: {div.currency === 'USD' ? `$${div.amount}` : `₩${div.amount.toLocaleString()}`}
                            {div.tax > 0 && ` | 세금: ${div.currency === 'USD' ? `$${div.tax}` : `₩${div.tax.toLocaleString()}`}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-sm sm:text-base text-amber-400">
                            +{div.currency === 'USD'
                              ? `$${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `₩${Math.round(net).toLocaleString()}`}
                          </div>
                          <div className="text-[11px] text-slate-400 uppercase font-medium">세후 실수령 ({div.currency})</div>
                        </div>
                        <button
                          onClick={() => handleDeleteDividend(div.id, div.stock_name)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {trades.length === 0 && dividends.length === 0 && (
                <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
                  <p className="text-sm">등록된 매매 또는 배당 내역이 없습니다.</p>
                  <p className="text-xs text-slate-600 mt-1">상단 폼에서 첫 거래 또는 배당 내역을 입력해 보세요!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
