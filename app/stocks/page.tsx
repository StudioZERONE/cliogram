'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [deleteTargetTicker, setDeleteTargetTicker] = useState<string | null>(null);

  // Mobile Form Collapsible Toggle State
  const [isMobileFormOpen, setIsMobileFormOpen] = useState<boolean>(false);

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
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchStocks();
    });
  }, [router]);

  const fetchStocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Explicitly filter by user_id
    const { data } = await supabase.from('stocks').select('*').eq('user_id', user.id).order('name', { ascending: true });
    if (data) setStocks(data as StockRecord[]);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.ticker || !stockForm.name) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/?error=unauthorized');
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
      setIsMobileFormOpen(false);
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

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  const renderFlagEmoji = (curr: string) => {
    if (curr === 'USD') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="미국 달러 (USD)">🇺🇸</span>;
    if (curr === 'KRW') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="대한민국 원 (KRW)">🇰🇷</span>;
    if (curr === 'EUR') return <span className="text-xl sm:text-2xl leading-none inline-block align-middle" title="유로화 (EUR)">🇪🇺</span>;
    return <span className="text-xs sm:text-sm font-bold text-[var(--fg-muted)]">{curr}</span>;
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="종목 마스터" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                주식 종목 마스터 관리
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-0.5 sm:mt-1">
                매매 및 배당 관리를 위한 기본 주식 종목(티커) 목록을 등록하고 관리합니다.
              </p>
            </div>

            {/* Circular Green Add Button for Mobile Trigger / Header Action */}
            <button
              onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
              title="종목 등록 폼 열기/닫기"
              aria-label="종목 등록 폼 열기/닫기"
            >
              <Plus className={`h-5 w-5 stroke-[2.5] transition-transform ${isMobileFormOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
            {/* Left Panel: Registration Form */}
            <div
              className={`lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs h-fit ${
                isMobileFormOpen ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-500" />
                  종목 마스터 신규 등록
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFormOpen(false)}
                  className="lg:hidden text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] p-1"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddStock} className="space-y-3.5 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">티커 코드 (Ticker)</label>
                  <input
                    type="text"
                    placeholder="예: AAPL, 005930"
                    value={stockForm.ticker}
                    onChange={(e) => setStockForm({ ...stockForm, ticker: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-center font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">종목명 (Stock Name)</label>
                  <input
                    type="text"
                    placeholder="예: Apple, 삼성전자"
                    value={stockForm.name}
                    onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">종목 유형</label>
                  <CodeSelect groupId="STOCK_TYPE" value={stockForm.type} onChange={(val) => setStockForm({ ...stockForm, type: val })} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">통화</label>
                    <CodeSelect groupId="CURRENCY_CODE" value={stockForm.currency} onChange={(val) => setStockForm({ ...stockForm, currency: val })} />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">상장 시장</label>
                    <CodeSelect groupId="MARKET_TYPE" value={stockForm.market} onChange={(val) => setStockForm({ ...stockForm, market: val })} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-2.5 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500 active:scale-98"
                >
                  종목 추가하기
                </button>
              </form>
            </div>

            {/* Right Panel: High Density Stock List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <span>등록된 주식 종목 목록</span>
                  <span className="text-xs sm:text-sm font-mono text-[var(--fg-muted)] font-normal">총 {stocks.length}개</span>
                </h3>

                {/* Circular Green Add Button on Desktop List Header */}
                <button
                  onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
                  className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                  title="종목 추가"
                  aria-label="종목 추가"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                    <tr>
                      <th className="py-2.5 px-3 text-left">종목명</th>
                      <th className="py-2.5 px-2.5 text-center font-mono">티커</th>
                      <th className="py-2.5 px-2.5 text-center">유형</th>
                      <th className="py-2.5 px-2.5 text-center">통화</th>
                      <th className="hidden sm:table-cell py-2.5 px-3 text-center">상장 시장</th>
                      <th className="py-2.5 px-2 text-center w-12">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-medium">
                    {stocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-xs text-[var(--fg-muted)]">
                          등록된 종목이 없습니다. "+ 버튼"을 눌러 신규 종목을 추가해 주세요.
                        </td>
                      </tr>
                    ) : (
                      stocks.map((item) => (
                        <tr key={item.ticker} className="hover:bg-[var(--bg)]/70 transition-colors">
                          <td className="py-2.5 px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm">{item.name}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{item.ticker}</td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center">{renderFlagEmoji(item.currency)}</td>
                          <td className="hidden sm:table-cell py-2.5 px-3 text-center font-mono text-xs text-[var(--fg-muted)]">{item.market}</td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => setDeleteTargetTicker(item.ticker)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
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
