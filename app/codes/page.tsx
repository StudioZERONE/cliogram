'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpDown,
  GripVertical,
  ArrowLeft,
  Layers,
  Code2,
  MoreVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkSessionExpiry } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CodeGroupModal } from '@/components/CodeGroupModal';
import { CommonCodeModal } from '@/components/CommonCodeModal';

interface CodeGroup {
  group_id: string;
  group_name: string;
  description?: string;
  created_at?: string;
}

interface CommonCode {
  id: string;
  group_id: string;
  code: string;
  code_name: string;
  sort_order: number;
  is_active: boolean;
}

type GroupSortOption = 'name_asc' | 'name_desc' | 'id_asc' | 'id_desc';

export default function CodesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Responsive desktop check to disable HTML5 draggable on mobile
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Search & Sorting state for Code Groups
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [groupSort, setGroupSort] = useState<GroupSortOption>('name_asc');

  // Mobile Master-Detail view state ('groups' | 'codes')
  const [mobileView, setMobileView] = useState<'groups' | 'codes'>('groups');
  const [activeMobileActionId, setActiveMobileActionId] = useState<string | null>(null);
  
  // Smart Fixed Popover Positioning State
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);

  // Modals state
  const [groupModal, setGroupModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData: CodeGroup | null;
  }>({
    isOpen: false,
    mode: 'create',
    initialData: null,
  });

  const [codeModal, setCodeModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData: {
      id?: string;
      code: string;
      code_name: string;
      sort_order: number;
      is_active?: boolean;
    } | null;
  }>({
    isOpen: false,
    mode: 'create',
    initialData: null,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'group' | 'code';
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'code',
    targetId: '',
    targetName: '',
  });

  // Drag and Drop state for Common Codes
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('common_code_groups')
      .select('*')
      .order('group_name', { ascending: true });
    if (data) {
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroupId((prev) => {
          if (prev && data.some((g) => g.group_id === prev)) {
            return prev;
          }
          return data[0].group_id;
        });
      } else {
        setSelectedGroupId('');
      }
    }
  };

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('common_codes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setCodes(data);
  };

  // Group Save handler (Create / Edit)
  const handleSaveGroup = async (groupData: {
    group_id: string;
    group_name: string;
    description?: string;
  }) => {
    if (groupModal.mode === 'create') {
      const { error } = await supabase.from('common_code_groups').insert([groupData]);
      if (!error) {
        setSelectedGroupId(groupData.group_id);
        fetchGroups();
      }
    } else {
      const { error } = await supabase
        .from('common_code_groups')
        .update({
          group_name: groupData.group_name,
          description: groupData.description,
        })
        .eq('group_id', groupData.group_id);

      if (!error) {
        fetchGroups();
      }
    }
  };

  // Common Code Save handler (Create / Edit)
  const handleSaveCode = async (codeData: {
    id?: string;
    group_id: string;
    code: string;
    code_name: string;
    sort_order: number;
    is_active: boolean;
  }) => {
    if (codeModal.mode === 'create') {
      const { error } = await supabase.from('common_codes').insert([
        {
          group_id: codeData.group_id,
          code: codeData.code,
          code_name: codeData.code_name,
          sort_order: codeData.sort_order,
          is_active: codeData.is_active,
        },
      ]);
      if (!error) fetchCodes();
    } else if (codeData.id) {
      const { error } = await supabase
        .from('common_codes')
        .update({
          code_name: codeData.code_name,
          sort_order: codeData.sort_order,
          is_active: codeData.is_active,
        })
        .eq('id', codeData.id);

      if (!error) fetchCodes();
    }
  };

  // Inline Active status toggle
  const toggleCodeActive = async (id: string, currentStatus: boolean) => {
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
    );
    await supabase.from('common_codes').update({ is_active: !currentStatus }).eq('id', id);
  };

  // Deletion Execution
  const handleConfirmDelete = async () => {
    if (deleteConfirm.type === 'code') {
      const { error } = await supabase.from('common_codes').delete().eq('id', deleteConfirm.targetId);
      if (!error) fetchCodes();
    } else if (deleteConfirm.type === 'group') {
      const { error } = await supabase.from('common_code_groups').delete().eq('group_id', deleteConfirm.targetId);
      if (!error) {
        fetchGroups();
        fetchCodes();
      }
    }
  };

  // Filter & Sort Groups
  const filteredGroups = groups
    .filter((g) => {
      const search = groupSearch.trim().toLowerCase();
      if (!search) return true;
      return (
        g.group_name.toLowerCase().includes(search) ||
        g.group_id.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (groupSort === 'name_asc') return a.group_name.localeCompare(b.group_name, 'ko');
      if (groupSort === 'name_desc') return b.group_name.localeCompare(a.group_name, 'ko');
      if (groupSort === 'id_asc') return a.group_id.localeCompare(b.group_id);
      if (groupSort === 'id_desc') return b.group_id.localeCompare(a.group_id);
      return 0;
    });

  // Filtered Detail Codes for selected group (Strictly ordered by sort_order)
  const currentGroupCodes = codes
    .filter((c) => c.group_id === selectedGroupId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Drag and Drop reordering logic for Desktop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...currentGroupCodes];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, movedItem);

    const reindexed = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setCodes((prev) => {
      const others = prev.filter((c) => c.group_id !== selectedGroupId);
      return [...others, ...reindexed];
    });

    setDraggedIndex(null);
    setDragOverIndex(null);

    for (const item of reindexed) {
      await supabase
        .from('common_codes')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
    }
  };

  // Mobile Precision Order Movement Helper (Up / Down)
  const moveCodeOrder = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentGroupCodes.length) return;

    const updated = [...currentGroupCodes];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reindexed = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setCodes((prev) => {
      const others = prev.filter((c) => c.group_id !== selectedGroupId);
      return [...others, ...reindexed];
    });

    for (const item of reindexed) {
      await supabase
        .from('common_codes')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
    }
  };

  // Smart Mobile Action Menu Toggle Handler with Fixed Screen Boundary Detection
  const handleToggleMobileAction = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
    e.stopPropagation();
    if (activeMobileActionId === itemId) {
      setActiveMobileActionId(null);
      setActionMenuPos(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    // Float UPWARD if the button is in the lower 45% of the screen
    const openUp = rect.top > windowHeight * 0.55;

    setActionMenuPos({
      top: rect.top,
      right: window.innerWidth - rect.right,
      openUp,
    });
    setActiveMobileActionId(itemId);
  };

  const closeMobileAction = () => {
    setActiveMobileActionId(null);
    setActionMenuPos(null);
  };

  const selectedGroup = groups.find((g) => g.group_id === selectedGroupId);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="공통코드" />

        <main className="p-3.5 sm:p-8 space-y-4 sm:space-y-6 flex-1">
          {/* Top Header Card (Desktop Only - Hidden on Mobile) */}
          <div className="hidden sm:flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#057a5d] dark:text-emerald-400" />
                시스템 공통 코드 관리
              </h3>
              <p className="text-sm text-[var(--fg-muted)] mt-1">
                통화, 거래 유형, 종목 유형 등 시스템 전반에서 활용되는 마스터 코드를 등록하고 관리합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
            {/* Left Panel: Code Groups */}
            <div
              className={`space-y-3 sm:space-y-4 lg:col-span-5 ${
                mobileView === 'codes' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
                {/* Header & Create Group Button */}
                <div className="flex items-center justify-between">
                  <h4 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Code2 className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#057a5d] dark:text-emerald-400" />
                    코드 그룹 목록
                  </h4>
                  <button
                    onClick={() =>
                      setGroupModal({ isOpen: true, mode: 'create', initialData: null })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                    title="그룹 추가"
                    aria-label="그룹 추가"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Distinct Search Bar (Recessed Inset) & Sort Dropdown (Raised Action Button) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Recessed Inset Search Box */}
                  <div className="relative sm:col-span-7">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--fg-muted)]" />
                    <input
                      type="text"
                      placeholder="그룹명/ID 검색..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-900/90 pl-8 pr-3 py-1.5 sm:py-2 text-xs font-medium text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                    />
                  </div>

                  {/* Elevated Floating Sort Dropdown */}
                  <div className="relative sm:col-span-5">
                    <select
                      value={groupSort}
                      onChange={(e) => setGroupSort(e.target.value as GroupSortOption)}
                      className="w-full rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1.5 sm:py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer appearance-none pr-7 shadow-xs hover:bg-emerald-500/15 dark:hover:bg-emerald-500/25 transition-all"
                    >
                      <option value="name_asc" className="bg-[var(--surface)] text-[var(--fg)] font-medium">그룹명 순 (A-Z)</option>
                      <option value="name_desc" className="bg-[var(--surface)] text-[var(--fg)] font-medium">그룹명 역순 (Z-A)</option>
                      <option value="id_asc" className="bg-[var(--surface)] text-[var(--fg)] font-medium">그룹 ID 순</option>
                      <option value="id_desc" className="bg-[var(--surface)] text-[var(--fg)] font-medium">그룹 ID 역순</option>
                    </select>
                    <ArrowUpDown className="absolute right-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                  </div>
                </div>

                {/* Group Selector Cards */}
                <div className="space-y-1.5 sm:space-y-2 max-h-[560px] overflow-y-auto pr-0.5">
                  {filteredGroups.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-xl">
                      검색된 코드 그룹이 없습니다.
                    </div>
                  ) : (
                    filteredGroups.map((group) => {
                      const count = codes.filter((c) => c.group_id === group.group_id).length;
                      const isSelected = selectedGroupId === group.group_id;

                      return (
                        <div
                          key={group.group_id}
                          onClick={() => {
                            setSelectedGroupId(group.group_id);
                            setMobileView('codes');
                          }}
                          className={`group/card flex items-center justify-between rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                              : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs sm:text-sm font-bold truncate">{group.group_name}</p>
                              <span className="text-[10px] rounded-full bg-[var(--surface)] px-2 py-0.5 font-bold border border-[var(--border)] shrink-0">
                                {count}개
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[var(--fg-muted)] truncate mt-0.5 font-semibold">
                              {group.group_id}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Edit Group Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupModal({
                                  isOpen: true,
                                  mode: 'edit',
                                  initialData: group,
                                });
                              }}
                              className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="그룹 수정"
                            >
                              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>

                            {/* Delete Group Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({
                                  isOpen: true,
                                  type: 'group',
                                  targetId: group.group_id,
                                  targetName: group.group_name,
                                });
                              }}
                              className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-red-500 transition-colors"
                              title="그룹 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Detail Common Codes */}
            <div
              className={`space-y-3 sm:space-y-4 lg:col-span-7 ${
                mobileView === 'groups' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
                {/* Header Line 1: Mobile Back Button, Title & Add Code Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setMobileView('groups')}
                      className="lg:hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 text-[var(--fg)] hover:bg-[var(--surface)] cursor-pointer shrink-0"
                      title="코드그룹 목록으로 돌아가기"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap">
                        <span className="shrink-0">상세 코드 목록</span>
                        {/* Desktop Group Badge with Explicit Baseline Alignment */}
                        {selectedGroup && (
                          <span className="hidden sm:inline-flex items-baseline gap-1 text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 font-bold shrink-0">
                            <span>{selectedGroup.group_name.replace(/\s+/g, ' ')}</span>
                            <span className="text-[11px] font-semibold opacity-80">
                              ({selectedGroupId})
                            </span>
                          </span>
                        )}
                      </h4>
                      <p className="hidden sm:block text-xs text-[var(--fg-muted)] mt-0.5">
                        마우스 드래그 앤 드롭으로 정렬 순서를 변경할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* Create Code Button */}
                  <button
                    onClick={() =>
                      setCodeModal({
                        isOpen: true,
                        mode: 'create',
                        initialData: {
                          code: '',
                          code_name: '',
                          sort_order: currentGroupCodes.length + 1,
                        },
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                    title="상세코드 추가"
                    aria-label="상세코드 추가"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Mobile Subheader Row: Full Unclipped Group Name Banner with Explicit Baseline Alignment */}
                {selectedGroup && (
                  <div className="sm:hidden flex items-baseline gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 shadow-xs">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedGroup.group_name.replace(/\s+/g, ' ')}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                      ({selectedGroupId})
                    </span>
                  </div>
                )}

                {/* Detail Codes Table with Clean Flow (No table-internal scrollbars) */}
                <div className="rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] font-bold text-[11px] sm:text-xs">
                      <tr>
                        <th className="hidden sm:table-cell py-2.5 px-2 text-center w-10">이동</th>
                        <th className="hidden sm:table-cell py-2.5 px-3 text-center w-14">순서</th>
                        <th className="py-2.5 px-2.5 sm:px-3 text-left">코드 (Code)</th>
                        <th className="py-2.5 px-2.5 sm:px-4 text-left">코드명</th>
                        <th className="hidden sm:table-cell py-2.5 px-3 text-center w-20">상태</th>
                        <th className="hidden sm:table-cell py-2.5 px-3 text-center w-24">작업</th>
                        <th className="sm:hidden py-2.5 px-2 text-center w-12">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-medium">
                      {currentGroupCodes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-xs text-[var(--fg-muted)]"
                          >
                            등록된 상세 코드가 없습니다. "+ 버튼"을 눌러 등록해 주세요.
                          </td>
                        </tr>
                      ) : (
                        currentGroupCodes.map((item, index) => {
                          const isBeingDragged = isDesktop && draggedIndex === index;
                          const isTargetDragOver = isDesktop && dragOverIndex === index;

                          return (
                            <tr
                              key={item.id}
                              draggable={isDesktop}
                              onDragStart={() => isDesktop && handleDragStart(index)}
                              onDragOver={(e) => isDesktop && handleDragOver(e, index)}
                              onDrop={() => isDesktop && handleDrop(index)}
                              className={`transition-colors ${
                                isDesktop ? 'cursor-grab active:cursor-grabbing' : ''
                              } ${
                                isBeingDragged
                                  ? 'opacity-30 bg-emerald-500/20'
                                  : isTargetDragOver
                                  ? 'bg-emerald-500/10 border-t-2 border-emerald-500'
                                  : 'hover:bg-[var(--bg)]/70'
                              }`}
                            >
                              {/* Drag Grip Handle (Desktop Only) */}
                              <td className="hidden sm:table-cell py-2.5 px-2 text-center text-[var(--fg-muted)]">
                                <GripVertical className="h-4 w-4 mx-auto cursor-grab active:cursor-grabbing hover:text-emerald-500" />
                              </td>

                              {/* Sort Order (Desktop Only) */}
                              <td className="hidden sm:table-cell py-2.5 px-3 text-center text-xs text-[var(--fg-muted)] font-semibold">
                                {item.sort_order}
                              </td>

                              {/* Code */}
                              <td className="py-2.5 px-2.5 sm:px-3 text-left font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                {item.code}
                              </td>

                              {/* Code Name */}
                              <td className="py-2.5 px-2.5 sm:px-4 text-left font-semibold text-[var(--fg)] text-xs sm:text-sm">
                                {item.code_name}
                              </td>

                              {/* Desktop Active Status Toggle */}
                              <td className="hidden sm:table-cell py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCodeActive(item.id, item.is_active)}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer border ${
                                    item.is_active
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                      : 'bg-red-500/10 text-red-500 border-red-500/30'
                                  }`}
                                >
                                  {item.is_active ? '사용중' : '중지'}
                                </button>
                              </td>

                              {/* Desktop Actions (Edit & Delete) */}
                              <td className="hidden sm:table-cell py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCodeModal({
                                        isOpen: true,
                                        mode: 'edit',
                                        initialData: item,
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                    title="코드 수정"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'code',
                                        targetId: item.id,
                                        targetName: `${item.code_name} (${item.code})`,
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-red-500 transition-colors cursor-pointer"
                                    title="코드 삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>

                              {/* Mobile Only: Smart Action Button & Fixed Floating Popover */}
                              <td className="sm:hidden py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleMobileAction(e, item.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--fg-muted)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer mx-auto shrink-0"
                                  title="작업 메뉴"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {activeMobileActionId === item.id && actionMenuPos && (
                                  <>
                                    {/* Transparent Backdrop */}
                                    <div
                                      className="fixed inset-0 z-40 bg-transparent cursor-default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        closeMobileAction();
                                      }}
                                    />
                                    {/* Smart Fixed Floating Popover */}
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: 'fixed',
                                        right: `${actionMenuPos.right}px`,
                                        ...(actionMenuPos.openUp
                                          ? { bottom: `${window.innerHeight - actionMenuPos.top + 6}px` }
                                          : { top: `${actionMenuPos.top + 32}px` }),
                                      }}
                                      className="z-50 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl backdrop-blur-md text-left text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95 cursor-default"
                                    >
                                      {/* Reorder Order Up */}
                                      <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => {
                                          moveCodeOrder(index, 'up');
                                          closeMobileAction();
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[var(--fg)] hover:bg-[var(--bg)] disabled:opacity-40 disabled:pointer-events-none"
                                      >
                                        <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>위로 이동</span>
                                      </button>

                                      {/* Reorder Order Down */}
                                      <button
                                        type="button"
                                        disabled={index === currentGroupCodes.length - 1}
                                        onClick={() => {
                                          moveCodeOrder(index, 'down');
                                          closeMobileAction();
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[var(--fg)] hover:bg-[var(--bg)] disabled:opacity-40 disabled:pointer-events-none"
                                      >
                                        <ArrowDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>아래로 이동</span>
                                      </button>

                                      <div className="border-t border-[var(--border)] my-1" />

                                      {/* Status Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          toggleCodeActive(item.id, item.is_active);
                                          closeMobileAction();
                                        }}
                                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-bold transition-colors hover:bg-[var(--bg)]"
                                      >
                                        <span>상태</span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                                            item.is_active
                                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-red-500/10 text-red-500'
                                          }`}
                                        >
                                          {item.is_active ? '사용중' : '중지'}
                                        </span>
                                      </button>

                                      <div className="border-t border-[var(--border)] my-1" />

                                      {/* Edit */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCodeModal({
                                            isOpen: true,
                                            mode: 'edit',
                                            initialData: item,
                                          });
                                          closeMobileAction();
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[var(--fg)] hover:bg-[var(--bg)]"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>코드 수정</span>
                                      </button>

                                      {/* Delete */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteConfirm({
                                            isOpen: true,
                                            type: 'code',
                                            targetId: item.id,
                                            targetName: `${item.code_name} (${item.code})`,
                                          });
                                          closeMobileAction();
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-red-500 hover:bg-[var(--bg)]"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        <span>코드 삭제</span>
                                      </button>
                                    </div>
                                  </>
                                )}
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
          </div>
        </main>
      </div>

      {/* Code Group Modal (Create / Edit) */}
      <CodeGroupModal
        isOpen={groupModal.isOpen}
        mode={groupModal.mode}
        initialData={groupModal.initialData}
        onClose={() => setGroupModal({ ...groupModal, isOpen: false })}
        onSave={handleSaveGroup}
      />

      {/* Common Code Modal (Create / Edit) */}
      <CommonCodeModal
        isOpen={codeModal.isOpen}
        mode={codeModal.mode}
        groupId={selectedGroupId}
        initialData={codeModal.initialData}
        onClose={() => setCodeModal({ ...codeModal, isOpen: false })}
        onSave={handleSaveCode}
      />

      {/* Defensive Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'group' ? '코드 그룹 삭제' : '상세 코드 삭제'}
        message={`'${deleteConfirm.targetName}' 항목을 정말 삭제하시겠습니까?\n삭제 후에는 다시 복구할 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
      />
    </div>
  );
}
