'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CommonCode, FALLBACK_CODES } from '@/lib/codes';

export default function CodesPage() {
  const router = useRouter();

  const [selectedGroupId, setSelectedGroupId] = useState<'CURRENCY' | 'STOCK_TYPE' | 'MARKET_TYPE' | 'TRADE_TYPE'>('CURRENCY');
  const [commonCodesList, setCommonCodesList] = useState<CommonCode[]>([]);
  const [deleteTargetItem, setDeleteTargetItem] = useState<CommonCode | null>(null);

  const [codeForm, setCodeForm] = useState<{
    code: string;
    code_name: string;
    sort_order: string;
  }>({
    code: '',
    code_name: '',
    sort_order: '1'
  });

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.push('/');
        return;
      }
      fetchCommonCodesByGroup(selectedGroupId);
    });
  }, [router, selectedGroupId]);

  const fetchCommonCodesByGroup = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('common_codes')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setCommonCodesList(data as CommonCode[]);
      } else {
        setCommonCodesList(FALLBACK_CODES[groupId] || []);
      }
    } catch {
      setCommonCodesList(FALLBACK_CODES[groupId] || []);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeForm.code || !codeForm.code_name) return;

    const newCode: Partial<CommonCode> = {
      group_id: selectedGroupId,
      code: codeForm.code.trim(),
      code_name: codeForm.code_name.trim(),
      sort_order: parseInt(codeForm.sort_order || '1', 10),
      is_active: true
    };

    const { data, error } = await supabase.from('common_codes').insert([newCode]).select();
    if (!error && data) {
      setCommonCodesList([...commonCodesList, data[0] as CommonCode]);
      setCodeForm({ code: '', code_name: '', sort_order: '1' });
    } else {
      setCommonCodesList([...commonCodesList, newCode as CommonCode]);
      setCodeForm({ code: '', code_name: '', sort_order: '1' });
    }
  };

  const handleToggleCodeActive = async (item: CommonCode) => {
    const nextStatus = !item.is_active;
    if (item.id) {
      await supabase.from('common_codes').update({ is_active: nextStatus }).eq('id', item.id);
    }
    setCommonCodesList(
      commonCodesList.map((c) => (c.code === item.code ? { ...c, is_active: nextStatus } : c))
    );
  };

  const executeDelete = async () => {
    if (!deleteTargetItem) return;
    if (deleteTargetItem.id) {
      await supabase.from('common_codes').delete().eq('id', deleteTargetItem.id);
    }
    setCommonCodesList(commonCodesList.filter((c) => c.code !== deleteTargetItem.code));
    setDeleteTargetItem(null);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="공통코드" />

        <main className="p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Group Selection & Form */}
            <div className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-6 h-fit">
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-emerald-500" />
                  코드 그룹 선택
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'CURRENCY', label: '통화 (CURRENCY)' },
                    { id: 'STOCK_TYPE', label: '종목유형 (STOCK_TYPE)' },
                    { id: 'MARKET_TYPE', label: '상장시장 (MARKET_TYPE)' },
                    { id: 'TRADE_TYPE', label: '거래유형 (TRADE_TYPE)' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id as any)}
                      className={`rounded-xl border p-3 text-xs font-bold transition-colors cursor-pointer ${
                        selectedGroupId === g.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-5">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  신규 공통 코드 등록 ({selectedGroupId})
                </h4>
                <form onSubmit={handleAddCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">코드 (Code)</label>
                    <input
                      type="text"
                      placeholder="예: GBP, Crypto"
                      value={codeForm.code}
                      onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-center font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">코드명 (Code Name)</label>
                    <input
                      type="text"
                      placeholder="예: 영국 파운드 (£)"
                      value={codeForm.code_name}
                      onChange={(e) => setCodeForm({ ...codeForm, code_name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-left text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg-muted)] mb-1.5">정렬 순서</label>
                    <input
                      type="number"
                      value={codeForm.sort_order}
                      onChange={(e) => setCodeForm({ ...codeForm, sort_order: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base text-right text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors shadow-xs cursor-pointer hover:bg-emerald-500">
                    공통 코드 추가하기
                  </button>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-xl font-bold mb-5 flex items-center justify-between">
                <span>[{selectedGroupId}] 그룹 코드 목록</span>
                <span className="text-sm text-[var(--fg-muted)] font-normal">총 {commonCodesList.length}개</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-center">코드 (Code)</th>
                      <th className="py-3 px-4 text-left">코드명 (Code Name)</th>
                      <th className="py-3 px-4 text-right">정렬 순서</th>
                      <th className="py-3 px-4 text-center">상태</th>
                      <th className="py-3 px-4 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {commonCodesList.map((item) => (
                      <tr key={item.code} className="hover:bg-[var(--bg)]/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-500">{item.code}</td>
                        <td className="py-3.5 px-4 text-left font-medium">{item.code_name}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-[var(--fg-muted)]">{item.sort_order}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleCodeActive(item)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer ${
                              item.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            {item.is_active ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> 사용중
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" /> 중지됨
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => setDeleteTargetItem(item)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="삭제"><Trash2 className="h-5 w-5 mx-auto" /></button>
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

      {/* Confirm Delete Defense Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetItem}
        title="공통 코드 삭제 확인"
        message={`선택하신 공통 코드 (${deleteTargetItem?.code_name})를 정말 삭제하시겠습니까? 삭제 후에는 공통 코드 목록에서 제거됩니다.`}
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetItem(null)}
      />
    </div>
  );
}
