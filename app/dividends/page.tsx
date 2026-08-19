'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CodeSelect } from '@/components/CodeSelect';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useCounts } from '@/components/CountsProvider';

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
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchDividends();
    });
  }, [router]);

  const fetchDividends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Explicitly filter by user_id
    const { data } = await supabase.from('dividends').select('*').eq('user_id', user.id).order('payment_date', { ascending: false });
    if (data) setDividends(data as DividendRecord[]);
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendForm.stock_name || !dividendForm.amount) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
    if (!error && data) {
      setDividends([data[0] as DividendRecord, ...dividends]);
      setDividendForm({ ...dividendForm, stock_name: '', amount: '', tax: '0' });
      refreshCounts();
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from('dividends').delete().eq('id', deleteTargetId);
    if (!error) {
      setDividends(dividends.filter((d) => d.id !== deleteTargetId));
      refreshCounts();
    }
    setDeleteTargetId(null);
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
        <Header title="배당 내역" />

        <main className="p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" />
                배당 내역 신규 등록
              </h3>
              <form onSubmit={handleAddDividend} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">지급 일자</label>
                  <DatePicker
                    selected={dividendForm.payment_date}
                    onChange={(date: Date | null) => date && setDividendForm({ ...dividendForm, payment_date: date })}
                    dateFormat="yyyy-MM-dd"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-center text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">통화</label>
                  <CodeSelect groupId="CURRENCY_CODE" value={dividendForm.currency} onChange={(val) => setDividendForm({ ...dividendForm, currency: val as any })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">종목명 / 티커</label>
                  <input
                    type="text"
                    placeholder="예: Apple (AAPL)"
                    value={dividendForm.stock_name}
                    onChange={(e) => setDividendForm({ ...dividendForm, stock_name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">세전 배당금액</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="25.5"
                      value={dividendForm.amount}
                      onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">세금</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="3.8"
                      value={dividendForm.tax}
                      onChange={(e) => setDividendForm({ ...dividendForm, tax: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500">
                  배당 내역 추가하기
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-xl font-bold mb-5 flex items-center justify-between">
                <span>전체 배당 내역 목록</span>
                <span className="text-sm text-[var(--fg-muted)] font-normal">총 {dividends.length}건</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
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
                        <td className="py-3.5 px-4 text-center font-mono text-sm">{item.payment_date}</td>
                        <td className="py-3.5 px-4 text-center">{renderFlagEmoji(item.currency)}</td>
                        <td className="py-3.5 px-4 text-left font-semibold text-emerald-600 dark:text-emerald-400">{item.stock_name}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{item.amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-red-600 dark:text-red-400">{item.tax.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{(item.amount - item.tax).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => setDeleteTargetId(item.id || null)} className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-5 w-5 mx-auto" /></button>
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
        isOpen={!!deleteTargetId}
        title="배당 내역 삭제 확인"
        message={`선택하신 배당 수령 내역을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
