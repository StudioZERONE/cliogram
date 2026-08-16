import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// YYYY-MM-DD 형식 문자열 변환 함수
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const todayObj = new Date();
    const todayStr = formatDate(todayObj);

    const yesterdayObj = new Date(todayObj);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = formatDate(yesterdayObj);

    const targetDate = dateParam || todayStr;

    // 날짜 형식 유효성 검사 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // 1. 오늘(D) 또는 어제(D-1)인 경우 -> 최신 실시간 환율 조회
    if (targetDate >= yesterdayStr) {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
        next: { revalidate: 300 }, // 5분 캐시
      });

      if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const usdKrw = data.rates?.KRW;

      if (!usdKrw) {
        throw new Error('USD/KRW rate not found in latest Frankfurter response');
      }

      return NextResponse.json({
        rate_date: targetDate,
        usd_krw: usdKrw,
        source: 'frankfurter_latest',
        api_date: data.date,
      });
    }

    // 2. 그제(D-2) 이전 과거 일자인 경우
    // 2-1. Supabase exchange_rates 테이블에서 먼저 조회
    const { data: dbData, error: dbError } = await supabase
      .from('exchange_rates')
      .select('rate_date, usd_krw')
      .eq('rate_date', targetDate)
      .maybeSingle();

    if (dbError) {
      console.error('Supabase query error:', dbError);
    }

    // DB에 데이터가 존재하면 즉시 반환
    if (dbData) {
      return NextResponse.json({
        rate_date: dbData.rate_date,
        usd_krw: Number(dbData.usd_krw),
        source: 'database',
      });
    }

    // 2-2. DB에 없으면 Frankfurter 과거 환율 API 호출
    const response = await fetch(
      `https://api.frankfurter.app/${targetDate}?from=USD&to=KRW`
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API error for date ${targetDate}: ${response.statusText}`);
    }

    const data = await response.json();
    const usdKrw = data.rates?.KRW;

    if (!usdKrw) {
      throw new Error(`USD/KRW rate not available for ${targetDate}`);
    }

    // 2-3. 조회된 과거 환율을 Supabase exchange_rates 테이블에 자동 캐싱 (upsert)
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .upsert(
        {
          rate_date: targetDate,
          usd_krw: usdKrw,
        },
        { onConflict: 'rate_date' }
      );

    if (insertError) {
      console.error('Failed to cache exchange rate to Supabase:', insertError);
    }

    return NextResponse.json({
      rate_date: targetDate,
      usd_krw: usdKrw,
      source: 'frankfurter_cached',
      api_date: data.date,
    });
  } catch (error: any) {
    console.error('Exchange rate API handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
