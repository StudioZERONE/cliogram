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

interface TradeRecord {
  id?: string;
  user_id?: string;
  trade_date: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR';
  fee: number;
  tax: number;
  notes?: string;
}

export default function TradesPage() {
  const router = useRouter();
  const { refreshCounts } = useCounts();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [tradeForm, setTradeForm] = useState<{
    trade_date: Date;
    stock_name: string;
    trade_type: 'BUY' | 'SELL';
    quantity: string;
    price: string;
    currency: 'KRW' | 'USD' | 'EUR';
    fee: string;
    tax: string;
    notes: string;
  }>({
    trade_date: new Date(),
    stock_name: '',
    trade_type: 'BUY',
    quantity: '',
    price: '',
    currency: 'USD',
    fee: '0',
    tax: '0',
    notes: ''
  });

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      setIsAuthChecking(false);
      fetchTrades();
    });
  }, [router]);

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Explicitly filter by user_id to prevent unassigned (user_id IS NULL) data leak
    const { data } = await supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false });
    if (data) setTrades(data as TradeRecord[]);
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeForm.stock_name || !tradeForm.quantity || !tradeForm.price) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/?error=unauthorized');
      return;
    }

    const newRecord: Partial<TradeRecord> = {
      user_id: user.id,
      trade_date: format(tradeForm.trade_date, 'yyyy-MM-dd'),
      stock_name: tradeForm.stock_name,
      trade_type: tradeForm.trade_type,
      quantity: parseFloat(tradeForm.quantity),
      price: parseFloat(tradeForm.price),
      currency: tradeForm.currency,
      fee: parseFloat(tradeForm.fee || '0'),
      tax: parseFloat(tradeForm.tax || '0'),
      notes: tradeForm.notes
    };

    const { data, error } = await supabase.from('trades').insert([newRecord]).select();
    if (!error && data) {
      setTrades([data[0] as TradeRecord, ...trades]);
      setTradeForm({ ...tradeForm, stock_name: '', quantity: '', price: '', notes: '' });
      refreshCounts();
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from('trades').delete().eq('id', deleteTargetId);
    if (!error) {
      setTrades(trades.filter((t) => t.id !== deleteTargetId));
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
        <Header title="매매 내역" />

        <main className="p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs h-fit">
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" />
                매매 내역 신규 등록
              </h3>
              <form onSubmit={handleAddTrade} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">거래 일자</label>
                  <DatePicker
                    selected={tradeForm.trade_date}
                    onChange={(date: Date | null) => date && setTradeForm({ ...tradeForm, trade_date: date })}
                    dateFormat="yyyy-MM-dd"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-center text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">거래 유형</label>
                    <CodeSelect groupId="TRADE_TYPE" value={tradeForm.trade_type} onChange={(val) => setTradeForm({ ...tradeForm, trade_type: val as any })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">통화</label>
                    <CodeSelect groupId="CURRENCY_CODE" value={tradeForm.currency} onChange={(val) => setTradeForm({ ...tradeForm, currency: val as any })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">종목명 / 티커</label>
                  <input
                    type="text"
                    placeholder="예: Apple (AAPL)"
                    value={tradeForm.stock_name}
                    onChange={(e) => setTradeForm({ ...tradeForm, stock_name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">거래 수량</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="10"
                      value={tradeForm.quantity}
                      onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">거래 단가</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="180.5"
                      value={tradeForm.price}
                      onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">비고 (선택)</label>
                  <input
                    type="text"
                    placeholder="손절, 해외대체입고 등"
                    value={tradeForm.notes}
                    onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500">
                  매매 내역 추가하기
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-xl font-bold mb-5 flex items-center justify-between">
                <span>전체 매매 내역 목록</span>
                <span className="text-sm text-[var(--fg-muted)] font-normal">총 {trades.length}건</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-center">날짜</th>
                      <th className="py-3 px-4 text-center">구분</th>
                      <th className="py-3 px-4 text-center">통화</th>
                      <th className="py-3 px-4 text-left">종목명</th>
                      <th className="py-3 px-4 text-right">수량</th>
                      <th className="py-3 px-4 text-right">단가</th>
                      <th className="py-3 px-4 text-right font-semibold">총 금액</th>
                      <th className="py-3 px-4 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {trades.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-sm">{item.trade_date}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${item.trade_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>{item.trade_type}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{renderFlagEmoji(item.currency)}</td>
                        <td className="py-3.5 px-4 text-left font-semibold">{item.stock_name}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{item.quantity.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{item.price.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{(item.quantity * item.price).toLocaleString()}</td>
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
        title="매매 내역 삭제 확인"
        message={`선택하신 매매 내역을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
