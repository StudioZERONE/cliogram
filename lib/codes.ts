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

/**
 * Supabase DB에서 특정 그룹 ID의 활성화된 상세 공통코드 목록을 조회합니다.
 * (하드코딩 덤미 데이터나 조용한 자동 매핑 없이, DB에 있는 실제 데이터만을 직관적으로 반환합니다)
 */
export async function getCommonCodes(groupId: string): Promise<CommonCode[]> {
  try {
    const { data, error } = await supabase
      .from('common_codes')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as CommonCode[];
  } catch {
    return [];
  }
}
