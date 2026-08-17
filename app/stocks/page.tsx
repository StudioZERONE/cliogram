'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CodeSelect } from '@/components/CodeSelect';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useCounts } from '@/components/CountsProvider';

interface StockRecord {
  id?: string;
  user_id?: string;
  ticker: string;
  name: string;
  type: string;
  currency: string;
  market: string;
}

export default function StocksPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [deleteTargetTicker, setDeleteTargetTicker] = useState<string | null>(null);

  const [stockForm, setStockForm] = useState<StockRecord>({
    ticker: '',
    name: '',
    type: 'Growth',
    currency: 'USD',
    market: 'NASDAQ'
  });

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/');
        return;
      }
      fetchStocks();
    });
  }, [router]);

  const fetchStocks = async () => {
    const { data } = await supabase.from('stocks').select('*').order('name', { ascending: true });
    if (data) setStocks(data as StockRecord[]);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.ticker || !stockForm.name) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/');
      return;
    }

    const newStock: Partial<StockRecord> = {
      user_id: user.id,
      ticker: stockForm.ticker.toUpperCase(),
      name: stockForm.name,
      type: stockForm.type,
      currency: stockForm.currency,
      market: stockForm.market
    };

    const { data, error } = await supabase.from('stocks').insert([newStock]).select();
    if (!error && data) {
      setStocks([...stocks, data[0] as StockRecord]);
      setStockForm({ ticker: '', name: '', type: 'Growth', currency: 'USD', market: 'NASDAQ' });
      refreshCounts();
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetTicker) return;
    const { error } = await supabase.from('stocks').delete().eq('ticker', deleteTargetTicker);
    if (!error) {
      setStocks(stocks.filter((s) => s.ticker !== deleteTargetTicker));
      refreshCounts();
    }
    setDeleteTargetTicker(null);
  };

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
        <Header title="종목 마스터" />

        <main className="p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" />
                주식 종목 마스터 신규 등록
              </h3>
              <form onSubmit={handleAddStock} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">티커 코드 (Ticker)</label>
                  <input
                    type="text"
                    placeholder="예: AAPL, 005930"
                    value={stockForm.ticker}
                    onChange={(e) => setStockForm({ ...stockForm, ticker: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-center font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">종목명 (Stock Name)</label>
                  <input
                    type="text"
                    placeholder="예: Apple, 삼성전자"
                    value={stockForm.name}
                    onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">종목 유형</label>
                  <CodeSelect groupId="STOCK_TYPE" value={stockForm.type} onChange={(val) => setStockForm({ ...stockForm, type: val })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">통화</label>
                    <CodeSelect groupId="CURRENCY" value={stockForm.currency} onChange={(val) => setStockForm({ ...stockForm, currency: val })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">상장 시장</label>
                    <CodeSelect groupId="MARKET_TYPE" value={stockForm.market} onChange={(val) => setStockForm({ ...stockForm, market: val })} />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500">
                  종목 추가하기
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-xl font-bold mb-5 flex items-center justify-between">
                <span>등록된 주식 종목 목록</span>
                <span className="text-sm text-[var(--fg-muted)] font-normal">총 {stocks.length}개</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left">종목명</th>
                      <th className="py-3 px-4 text-center">티커</th>
                      <th className="py-3 px-4 text-center">유형</th>
                      <th className="py-3 px-4 text-center">통화</th>
                      <th className="py-3 px-4 text-center">상장 시장</th>
                      <th className="py-3 px-4 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {stocks.map((item) => (
                      <tr key={item.ticker} className="hover:bg-[var(--bg)]/50 transition-colors">
                        <td className="py-3.5 px-4 text-left font-bold text-[var(--fg)]">{item.name}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.ticker}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">{item.type}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{renderFlagEmoji(item.currency)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-[var(--fg-muted)]">{item.market}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => setDeleteTargetTicker(item.ticker)} className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-5 w-5 mx-auto" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTargetTicker}
        title="종목 마스터 삭제 확인"
        message={`선택하신 종목 (${deleteTargetTicker})을 정말 삭제하시겠습니까?\n삭제 후에는 등록된 종목 정보가 제거됩니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetTicker(null)}
      />
    </div>
  );
}
