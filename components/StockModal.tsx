'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Layers, Sparkles } from 'lucide-react';
import { CodeSelect } from '@/components/CodeSelect';
import { lookupTickerInfo, fetchRemoteTickerInfo } from '@/lib/stock-ticker';

export interface StockRecordData {
  id?: string;
  ticker: string;
  name: string;
  short_name?: string;
  type: string;
  currency: string;
  market: string;
  is_active?: boolean;
}

export interface StockModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: StockRecordData | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    ticker: string;
    name: string;
    short_name: string;
    type: string;
    currency: string;
    market: string;
    is_active: boolean;
  }) => Promise<void>;
}

export function StockModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: StockModalProps) {
  const [ticker, setTicker] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [shortName, setShortName] = useState<string>('');
  const [type, setType] = useState<string>('Growth');
  const [currency, setCurrency] = useState<string>('USD');
  const [market, setMarket] = useState<string>('NASDAQ');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);
  const [isSearchingTicker, setIsSearchingTicker] = useState<boolean>(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setTicker(initialData.ticker || '');
        setName(initialData.name || '');
        setShortName(initialData.short_name || initialData.name || '');
        setType(initialData.type || 'Growth');
        setCurrency(initialData.currency || 'USD');
        setMarket(initialData.market || 'NASDAQ');
        setIsActive(initialData.is_active ?? true);
      } else {
        setTicker('');
        setName('');
        setShortName('');
        setType('Growth');
        setCurrency('USD');
        setMarket('NASDAQ');
        setIsActive(true);
      }
      setAutoFillNotice(null);
    }
  }, [isOpen, mode, initialData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleTickerChange = async (value: string) => {
    const uppercaseTicker = value.toUpperCase().trim();
    setTicker(uppercaseTicker);

    if (mode === 'edit') return;

    if (!uppercaseTicker) {
      setName('');
      setShortName('');
      setType('Growth');
      setCurrency('USD');
      setMarket('NASDAQ');
      setAutoFillNotice(null);
      return;
    }

    // 1차: 로컬 프리셋 즉시 반영
    const local = lookupTickerInfo(uppercaseTicker);
    if (local) {
      setName(local.name);
      setShortName(local.short_name);
      setType(local.type);
      setCurrency(local.currency);
      setMarket(local.market);
      setAutoFillNotice(`티커 '${local.ticker}' 정보가 로컬 프리셋으로 자동 반영되었습니다.`);
      return;
    }

    // 2차: 티커 길이가 2자 이상일 때 백엔드 API 실시간 조회
    if (uppercaseTicker.length >= 2) {
      setIsSearchingTicker(true);
      setAutoFillNotice('실시간 파이낸스 API에서 종목 정보를 조회하고 있습니다...');
      const remote = await fetchRemoteTickerInfo(uppercaseTicker);
      setIsSearchingTicker(false);

      if (remote) {
        setName(remote.name);
        setShortName(remote.short_name || remote.name);
        setType(remote.type || 'Growth');
        setCurrency(remote.currency || 'USD');
        setMarket(remote.market || 'NASDAQ');
        setAutoFillNotice(`티커 '${remote.ticker}' 실시간 수집 정보가 자동 추천 반영되었습니다.`);
      } else {
        // 티커 수정/삭제 시 조회가 안되면 이전 자동채움 정보 리셋
        setName('');
        setShortName('');
        setAutoFillNotice(null);
      }
    } else {
      // 1자 이하로 지워졌을 때는 이전 자동채움 정보 클리어
      setName('');
      setShortName('');
      setAutoFillNotice(null);
    }
  };

  const handleApplyPreset = async () => {
    if (!ticker) return;
    setIsSearchingTicker(true);
    setAutoFillNotice('종목 정보를 실시간 재조회 중입니다...');
    const info = await fetchRemoteTickerInfo(ticker);
    setIsSearchingTicker(false);
    if (info) {
      setName(info.name);
      setShortName(info.short_name || info.name);
      setType(info.type || 'Growth');
      setCurrency(info.currency || 'USD');
      setMarket(info.market || 'NASDAQ');
      setAutoFillNotice(`티커 '${info.ticker}' 표준 실시간 정보가 반영되었습니다.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const finalShortName = shortName.trim() ? shortName.trim() : name.trim();
      await onSave({
        id: initialData?.id,
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        short_name: finalShortName,
        type,
        currency,
        market,
        is_active: isActive,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchedPreset = lookupTickerInfo(ticker);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 cursor-default text-[var(--fg)] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold">
              {mode === 'create' ? '종목 마스터 신규 등록' : '종목 마스터 정보 수정'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {/* Ticker Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--fg-muted)]">
                티커 코드 <span className="text-red-500">*</span>
              </label>
              {matchedPreset && (
                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  표준 종목 정보 추천 적용
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="예: AAPL, 005930, NVDA"
              value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
              required
            />
            {/* Reserved Fixed Height Notice Block to Prevent Layout Jitter */}
            <div className="mt-1 h-5 flex items-center">
              {isSearchingTicker ? (
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  실시간 파이낸스 API에서 종목 정보를 조회하고 있습니다...
                </p>
              ) : autoFillNotice ? (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓</span> {autoFillNotice}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--fg-muted)]">
                  티커를 입력하시면 종목이 자동으로 검색됩니다.
                </p>
              )}
            </div>
          </div>

          {/* Full Stock Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              종목명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: Apple Inc., 삼성전자"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!shortName) setShortName(e.target.value);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
              required
            />
          </div>

          {/* Short Stock Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              짧은 종목명
            </label>
            <input
              type="text"
              placeholder="미입력 시 종목명과 동일하게 설정됨"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-inner"
            />
            <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
              화면 공간이 좁거나 통계표 표출 시 사용할 간결한 종목명입니다.
            </p>
          </div>

          {/* Stock Type Select */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              종목 유형
            </label>
            <CodeSelect
              groupId="STOCK_TYPE"
              value={type}
              onChange={(val) => setType(val)}
            />
          </div>

          {/* Currency & Market Select */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                거래 통화
              </label>
              <CodeSelect
                groupId="CURRENCY_CODE"
                value={currency}
                onChange={(val) => setCurrency(val)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
                상장 시장
              </label>
              <CodeSelect
                groupId="MARKET_TYPE"
                value={market}
                onChange={(val) => setMarket(val)}
              />
            </div>
          </div>

          {/* Usage Status Toggle */}
          <div>
            <label className="block text-xs font-bold text-[var(--fg-muted)] mb-1">
              종목 사용 상태
            </label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full h-[40px] rounded-xl font-bold text-sm transition-colors cursor-pointer border flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-500 border-red-500/30'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {isActive ? '사용중 (정상)' : '사용중지 (신규 배당 등 등록 제한)'}
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--fg)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : mode === 'create' ? '종목 추가하기' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
