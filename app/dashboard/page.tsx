'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Globe2, Building2, Coins } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

interface StockRecord {
  ticker: string;
  name: string;
}

interface TradeRecord {
  id?: string;
  trade_date: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  price: number;
  currency: 'KRW' | 'USD' | 'EUR';
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
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1415);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchData();
    });

    fetch('/api/exchange-rate')
      .then((res) => res.json())
      .then((data) => {
        if (data.rate) setExchangeRate(data.rate);
      })
      .catch(() => {});
  }, [router]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Explicitly filter by current user's user_id to isolate data
    const [tradesRes, divRes, stocksRes] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }),
      supabase.from('dividends').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
      supabase.from('stocks').select('*').eq('user_id', user.id).order('name', { ascending: true })
    ]);

    if (tradesRes.data) setTrades(tradesRes.data as TradeRecord[]);
    if (divRes.data) setDividends(divRes.data as DividendRecord[]);
    if (stocksRes.data) setStocks(stocksRes.data as StockRecord[]);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  const renderFlagEmoji = (curr: string) => {
    if (curr === 'USD') return <span className="text-2xl leading-none inline-block align-middle" title="미국 달러 (USD)">🇺🇸</span>;
    if (curr === 'KRW') return <span className="text-2xl leading-none inline-block align-middle" title="대한민국 원 (KRW)">🇰🇷</span>;
    if (curr === 'EUR') return <span className="text-2xl leading-none inline-block align-middle" title="유로화 (EUR)">🇪🇺</span>;
    return <span className="text-sm font-bold text-[var(--fg-muted)]">{curr}</span>;
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="대시보드" />

        <main className="p-8 space-y-8 flex-1">
          {/* Top Stat KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-muted)]">보유 종목 마스터</p>
                  <h3 className="text-3xl font-bold mt-1.5">{stocks.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">개</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <Building2 className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-muted)]">총 매매 내역 기록</p>
                  <h3 className="text-3xl font-bold mt-1.5">{trades.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">건</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-muted)]">총 배당 수령 기록</p>
                  <h3 className="text-3xl font-bold mt-1.5">{dividends.length}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">건</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Coins className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-muted)]">실시간 환율 (USD)</p>
                  <h3 className="text-3xl font-bold mt-1.5">{exchangeRate.toLocaleString()}<span className="text-sm font-normal text-[var(--fg-muted)] ml-1">원</span></h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <Globe2 className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Recent Trades Table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">최근 매매 내역</h3>
                <Link href="/trades" className="text-sm font-semibold text-emerald-500 hover:underline cursor-pointer">전체보기 →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
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
                        <td className="py-3.5 px-4 text-center text-sm font-semibold">{item.trade_date}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${item.trade_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{item.trade_type}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{renderFlagEmoji(item.currency)}</td>
                        <td className="py-3.5 px-4 text-left font-semibold">{item.stock_name}</td>
                        <td className="py-3.5 px-4 text-right font-bold">{item.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Dividends Table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">최근 배당 내역</h3>
                <Link href="/dividends" className="text-sm font-semibold text-emerald-500 hover:underline cursor-pointer">전체보기 →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
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
                        <td className="py-3.5 px-4 text-center text-sm font-semibold">{item.payment_date}</td>
                        <td className="py-3.5 px-4 text-center">{renderFlagEmoji(item.currency)}</td>
                        <td className="py-3.5 px-4 text-left font-semibold text-emerald-500">{item.stock_name}</td>
                        <td className="py-3.5 px-4 text-right font-semibold">{item.amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-500">{(item.amount - item.tax).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
