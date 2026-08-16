import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// YYYY-MM-DD 형식 변환
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function handleFetchAndSaveRate() {
  const todayStr = formatDate(new Date());

  // 1. Frankfurter API에서 최신 환율 조회
  const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Frankfurter API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const usdKrw = data.rates?.KRW;
  const marketDate = data.date; // 금융 시장 기준일

  if (!usdKrw) {
    throw new Error('USD/KRW rate missing in Frankfurter response');
  }

  // 2. Supabase exchange_rates 테이블에 저장 (오늘 날짜 및 마켓 기준일 upsert)
  const recordsToUpsert = [
    { rate_date: todayStr, usd_krw: usdKrw },
  ];

  if (marketDate && marketDate !== todayStr) {
    recordsToUpsert.push({ rate_date: marketDate, usd_krw: usdKrw });
  }

  const { data: upsertedData, error: upsertError } = await supabase
    .from('exchange_rates')
    .upsert(recordsToUpsert, { onConflict: 'rate_date' })
    .select();

  if (upsertError) {
    throw new Error(`Failed to upsert to Supabase: ${upsertError.message}`);
  }

  return {
    success: true,
    message: 'Daily closing exchange rate successfully saved to database',
    saved_records: upsertedData || recordsToUpsert,
    fetched_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    // 선택 사항: Cron Secret 인증 (CRON_SECRET 환경변수가 설정되어 있는 경우 검증)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await handleFetchAndSaveRate();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron fetch-rate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
