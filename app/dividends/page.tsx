'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Plus, Trash2, Layers, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CodeSelect } from '@/components/CodeSelect';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useCounts } from '@/components/CountsProvider';
import { useToast } from '@/components/ToastProvider';

interface DividendRecord {
  id?: string;
  user_id?: string;
  payment_date: string;
  stock_name: string;
  amount: number;
  tax: number;
  currency: 'KRW' | 'USD' | 'EUR';
}

export default function DividendsPage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Mobile Form Collapsible Toggle State
  const [isMobileFormOpen, setIsMobileFormOpen] = useState<boolean>(false);

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

  const [activeStocks, setActiveStocks] = useState<{ ticker: string; name: string; short_name: string }[]>([]);

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchDividends();
      fetchActiveStocks();
    });
  }, [router]);

  const fetchActiveStocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('stocks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .order('ticker', { ascending: true });

    if (data) {
      setActiveStocks(
        data.map((s: any) => ({
          ticker: s.ticker,
          name: s.name,
          short_name: s.short_name || s.name,
        }))
      );
    }
  };

  const fetchDividends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('dividends')
      .select('*')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setDividends(data as DividendRecord[]);
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendForm.stock_name) {
      toast.warning('종목을 선택해 주세요.');
      return;
    }
    if (!dividendForm.amount || parseFloat(dividendForm.amount) <= 0) {
      toast.warning('배당금을 0보다 큰 금액으로 입력해 주세요.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      router.replace('/?error=unauthorized');
      return;
    }

    const newRecord: Partial<DividendRecord> = {
      user_id: user.id,
      payment_date: format(dividendForm.payment_date, 'yyyy-MM-dd'),
      stock_name: dividendForm.stock_name,
      amount: parseFloat(dividendForm.amount),
      tax: parseFloat(dividendForm.tax || '0'),
      currency: dividendForm.currency
    };

    const { data, error } = await supabase.from('dividends').insert([newRecord]).select();
    if (error) {
      console.error('Failed to insert dividend:', error);
      toast.error(`배당 내역 저장 중 오류가 발생했습니다: ${error.message}`);
      return;
    }

    if (data) {
      setDividends([data[0] as DividendRecord, ...dividends]);
      setDividendForm({ ...dividendForm, stock_name: '', amount: '', tax: '0' });
      setIsMobileFormOpen(false);
      refreshCounts();
      toast.success('배당 내역이 등록되었습니다.');
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from('dividends').delete().eq('id', deleteTargetId);
    if (error) {
      console.error('Failed to delete dividend:', error);
      toast.error(`배당 내역 삭제 중 오류가 발생했습니다: ${error.message}`);
    } else {
      setDividends(dividends.filter((d) => d.id !== deleteTargetId));
      refreshCounts();
      toast.success('배당 내역이 삭제되었습니다.');
    }
    setDeleteTargetId(null);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  const renderFlagEmoji = (curr: string) => {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        {curr}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="배당 원장" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Info Banner Card (Desktop Only - Hidden on Mobile) */}
          <div className="hidden sm:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                배당 수령 원장
              </h3>
              <p className="text-sm text-[var(--fg-muted)] mt-1">
                주식 종목별 배당금 지급 일자 및 지급 금액/세금 내역을 기록하고 관리하는 원장입니다.
              </p>
            </div>
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
                  배당 수령 신규 등록
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFormOpen(false)}
                  className="lg:hidden text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] p-1"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddDividend} className="space-y-3.5 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">지급 일자</label>
                  <DatePicker
                    selected={dividendForm.payment_date}
                    onChange={(date: Date | null) => date && setDividendForm({ ...dividendForm, payment_date: date })}
                    dateFormat="yyyy-MM-dd"
                    onKeyDown={(e) => e.preventDefault()}
                    popperPlacement="bottom-start"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-center text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">종목 선택</label>
                  <select
                    value={dividendForm.stock_name}
                    onChange={(e) => setDividendForm({ ...dividendForm, stock_name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-semibold"
                    required
                  >
                    <option value="" disabled>
                      종목을 선택해 주세요
                    </option>
                    {activeStocks.map((stock) => (
                      <option key={stock.ticker} value={`${stock.short_name || stock.name} (${stock.ticker})`}>
                        {stock.short_name || stock.name} ({stock.ticker})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">통화</label>
                  <CodeSelect
                    groupId="CURRENCY_CODE"
                    value={dividendForm.currency}
                    onChange={(val) => setDividendForm({ ...dividendForm, currency: val as any })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">배당금 (세전)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="25.5"
                      value={dividendForm.amount}
                      onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[var(--fg-muted)] mb-1 sm:mb-1.5">원천징수 세금</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="3.8"
                      value={dividendForm.tax}
                      onChange={(e) => setDividendForm({ ...dividendForm, tax: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-2.5 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500 active:scale-98"
                >
                  배당 수령 기록 추가하기
                </button>
              </form>
            </div>

            {/* Right Panel: High Density Dividend List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <span>배당 수령 기록 목록</span>
                  <span className="text-xs sm:text-sm text-[var(--fg-muted)] font-normal">총 {dividends.length}건</span>
                </h3>

                {/* Circular Green Add Button for Mobile & Desktop List Header */}
                <button
                  onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                  title="신규 배당 수령 등록"
                  aria-label="신규 배당 수령 등록"
                >
                  <Plus className={`h-5 w-5 stroke-[2.5] transition-transform ${isMobileFormOpen ? 'rotate-45' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                    <tr>
                      <th className="py-2.5 px-3 text-center">지급일</th>
                      <th className="py-2.5 px-2.5 text-center">통화</th>
                      <th className="py-2.5 px-3 text-left">종목명</th>
                      <th className="py-2.5 px-3 text-right">배당금 (세전)</th>
                      <th className="hidden sm:table-cell py-2.5 px-3 text-right">세금</th>
                      <th className="py-2.5 px-3 text-right font-bold">실수령액</th>
                      <th className="py-2.5 px-2 text-center w-12">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-medium">
                    {dividends.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-[var(--fg-muted)]">
                          등록된 배당 내역이 없습니다. "+ 버튼"을 눌러 수령 내역을 기록해 주세요.
                        </td>
                      </tr>
                    ) : (
                      dividends.map((item) => {
                        const netAmount = item.amount - (item.tax || 0);
                        return (
                          <tr key={item.id} className="hover:bg-[var(--bg)]/70 transition-colors">
                            <td className="py-2.5 px-3 text-center text-[11px] sm:text-xs text-[var(--fg-muted)] font-semibold">{item.payment_date}</td>
                            <td className="py-2.5 px-2.5 text-center">{renderFlagEmoji(item.currency)}</td>
                            <td className="py-2.5 px-3 text-left font-bold text-[var(--fg)] text-xs sm:text-sm">{item.stock_name}</td>
                            <td className="py-2.5 px-3 text-right text-xs sm:text-sm font-semibold">{item.amount.toLocaleString()}</td>
                            <td className="hidden sm:table-cell py-2.5 px-3 text-right text-xs sm:text-sm text-[var(--fg-muted)] font-semibold">
                              {item.tax ? item.tax.toLocaleString() : '0'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                              {netAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => setDeleteTargetId(item.id || null)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTargetId}
        title="배당 기록 삭제 확인"
        message={`선택하신 배당 기록을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
