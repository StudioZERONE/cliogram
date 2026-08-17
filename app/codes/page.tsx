'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

interface CodeGroup {
  group_id: string;
  group_name: string;
  description?: string;
}

interface CommonCode {
  id: string;
  group_id: string;
  code: string;
  code_name: string;
  sort_order: number;
  is_active: boolean;
}

export default function CodesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('CURRENCY');

  const [newGroup, setNewGroup] = useState({ group_id: '', group_name: '', description: '' });
  const [newCode, setNewCode] = useState({ code: '', code_name: '', sort_order: '1' });

  useEffect(() => {
    checkSessionExpiry().then((valid) => {
      if (!valid) {
        router.replace('/?error=unauthorized');
        return;
      }
      fetchGroups();
      fetchCodes();
    });
  }, [router]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('common_code_groups').select('*').order('group_id');
    if (data) setGroups(data);
  };

  const fetchCodes = async () => {
    const { data } = await supabase.from('common_codes').select('*').order('sort_order', { ascending: true });
    if (data) setCodes(data);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.group_id || !newGroup.group_name) return;
    const { error } = await supabase.from('common_code_groups').insert([{
      group_id: newGroup.group_id.toUpperCase(),
      group_name: newGroup.group_name,
      description: newGroup.description
    }]);

    if (!error) {
      setNewGroup({ group_id: '', group_name: '', description: '' });
      fetchGroups();
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code || !newCode.code_name || !selectedGroupId) return;
    const { error } = await supabase.from('common_codes').insert([{
      group_id: selectedGroupId,
      code: newCode.code.toUpperCase(),
      code_name: newCode.code_name,
      sort_order: parseInt(newCode.sort_order, 10) || 1,
      is_active: true
    }]);

    if (!error) {
      setNewCode({ code: '', code_name: '', sort_order: '1' });
      fetchCodes();
    }
  };

  const toggleCodeActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('common_codes').update({ is_active: !currentStatus }).eq('id', id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from('common_codes').delete().eq('id', id);
    fetchCodes();
  };

  const filteredCodes = codes.filter((c) => c.group_id === selectedGroupId);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="공통코드" />

        <main className="p-8 space-y-8 flex-1">
          {/* Top Info Header */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">시스템 공통 코드 관리</h3>
              <p className="text-sm text-[var(--fg-muted)] mt-1">통화, 거래 유형, 종목 유형 등 시스템 전반에서 활용되는 마스터 코드를 등록하고 관리합니다.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: Code Groups */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  코드 그룹 신규 등록
                </h4>
                <form onSubmit={handleAddGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">그룹 ID (Group ID)</label>
                    <input
                      type="text"
                      placeholder="예: ACCOUNT_TYPE"
                      value={newGroup.group_id}
                      onChange={(e) => setNewGroup({ ...newGroup, group_id: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">그룹명</label>
                    <input
                      type="text"
                      placeholder="예: 계좌 유형"
                      value={newGroup.group_name}
                      onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer hover:bg-emerald-500">
                    코드 그룹 추가
                  </button>
                </form>
              </div>

              {/* Group Selector List */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-3">
                <h4 className="text-lg font-bold mb-2">코드 그룹 목록</h4>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <button
                      key={group.group_id}
                      onClick={() => setSelectedGroupId(group.group_id)}
                      className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors cursor-pointer border ${
                        selectedGroupId === group.group_id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-emerald-500/30'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold">{group.group_name}</p>
                        <p className="text-xs font-mono text-[var(--fg-muted)]">{group.group_id}</p>
                      </div>
                      <span className="text-xs font-mono rounded-full bg-[var(--surface)] px-2.5 py-1 font-bold border border-[var(--border)]">
                        {codes.filter((c) => c.group_id === group.group_id).length}개
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Code Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  상세 코드 추가 ({selectedGroupId})
                </h4>
                <form onSubmit={handleAddCode} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">코드 (Code)</label>
                    <input
                      type="text"
                      placeholder="예: JPY"
                      value={newCode.code}
                      onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">코드명</label>
                    <input
                      type="text"
                      placeholder="예: 일본 엔화 (¥)"
                      value={newCode.code_name}
                      onChange={(e) => setNewCode({ ...newCode, code_name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer hover:bg-emerald-500">
                      상세 코드 추가
                    </button>
                  </div>
                </form>
              </div>

              {/* Detail Code Table */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <h4 className="text-lg font-bold mb-4">상세 코드 목록 ({selectedGroupId})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead className="border-b border-[var(--border)] text-[var(--fg-muted)] font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center">순서</th>
                        <th className="py-3 px-4 text-center">코드</th>
                        <th className="py-3 px-4 text-left">코드명</th>
                        <th className="py-3 px-4 text-center">상태</th>
                        <th className="py-3 px-4 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredCodes.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-sm">{item.sort_order}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.code}</td>
                          <td className="py-3.5 px-4 text-left font-semibold">{item.code_name}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleCodeActive(item.id, item.is_active)}
                              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}
                            >
                              {item.is_active ? '사용중' : '중지'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => deleteCode(item.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 cursor-pointer" title="삭제">
                              <Trash2 className="h-5 w-5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
