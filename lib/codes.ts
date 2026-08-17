import { supabase } from './supabase';

export interface CommonCodeGroup {
  group_id: string;
  group_name: string;
  description?: string;
}

export interface CommonCode {
  id?: string;
  group_id: string;
  code: string;
  code_name: string;
  sort_order: number;
  is_active: boolean;
}

// Fallback initial common codes to ensure smooth UX even before SQL execution
export const FALLBACK_CODES: Record<string, CommonCode[]> = {
  CURRENCY: [
    { group_id: 'CURRENCY', code: 'USD', code_name: '미국 달러 ($)', sort_order: 1, is_active: true },
    { group_id: 'CURRENCY', code: 'KRW', code_name: '대한민국 원 (₩)', sort_order: 2, is_active: true },
    { group_id: 'CURRENCY', code: 'EUR', code_name: '유로화 (€)', sort_order: 3, is_active: true },
  ],
  STOCK_TYPE: [
    { group_id: 'STOCK_TYPE', code: 'Growth', code_name: '성장주', sort_order: 1, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'Dividend', code_name: '배당주', sort_order: 2, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'ISA', code_name: 'ISA 계좌', sort_order: 3, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'Save', code_name: '예적금 / 파킹', sort_order: 4, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'Old.Growth', code_name: '구 성장주', sort_order: 5, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'Old.Dividend', code_name: '구 배당주', sort_order: 6, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'Index', code_name: '지수 ETF', sort_order: 7, is_active: true },
    { group_id: 'STOCK_TYPE', code: 'RIA', code_name: '퇴직연금 / RIA', sort_order: 8, is_active: true },
  ],
  MARKET_TYPE: [
    { group_id: 'MARKET_TYPE', code: 'NASDAQ', code_name: '나스닥 (NASDAQ)', sort_order: 1, is_active: true },
    { group_id: 'MARKET_TYPE', code: 'NYSE', code_name: '뉴욕증시 (NYSE)', sort_order: 2, is_active: true },
    { group_id: 'MARKET_TYPE', code: 'NYSEARCA', code_name: 'NYSE 아카 (ETF)', sort_order: 3, is_active: true },
    { group_id: 'MARKET_TYPE', code: 'KRX', code_name: '한국거래소 (KOSPI/KOSDAQ)', sort_order: 4, is_active: true },
    { group_id: 'MARKET_TYPE', code: 'ETR', code_name: '독일 프랑크푸르트 (ETR)', sort_order: 5, is_active: true },
  ],
  TRADE_TYPE: [
    { group_id: 'TRADE_TYPE', code: 'BUY', code_name: '매수 (BUY)', sort_order: 1, is_active: true },
    { group_id: 'TRADE_TYPE', code: 'SELL', code_name: '매도 (SELL)', sort_order: 2, is_active: true },
  ],
};

export async function getCommonCodes(groupId: string): Promise<CommonCode[]> {
  try {
    const { data, error } = await supabase
      .from('common_codes')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_CODES[groupId] || [];
    }
    return data as CommonCode[];
  } catch {
    return FALLBACK_CODES[groupId] || [];
  }
}
