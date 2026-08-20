-- =========================================================
-- CLIOGRAM ENHANCED MULTI-TENANT DB SCHEMA (a_schema.sql)
-- (통합 데이터베이스 스키마 및 Row Level Security 보안 정책)
-- =========================================================

-- 1. common_code_groups (공통 코드 그룹)
CREATE TABLE IF NOT EXISTS public.common_code_groups (
  group_id VARCHAR(50) PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. common_codes (공통 코드 상세)
CREATE TABLE IF NOT EXISTS public.common_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR(50) NOT NULL REFERENCES public.common_code_groups(group_id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  code_name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, code)
);

-- 3. profiles (회원 프로필 마스터 - Supabase auth.users 1:1 연결)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_logout_at TIMESTAMPTZ DEFAULT NULL,
  user_level INTEGER DEFAULT NULL
);

-- 4. stocks (종목 마스터 - 회원별 1:N 연결)
CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  sort_code TEXT,
  name TEXT NOT NULL,
  sort_name TEXT,
  type TEXT,
  currency TEXT DEFAULT 'USD',
  market TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ticker)
);

-- 5. trades (매매 내역 - 회원별 1:N 필수 연결)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  ticker TEXT,
  stock_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY')),
  exchange_rate NUMERIC DEFAULT 1,
  total_amount NUMERIC,
  total_amount_krw NUMERIC,
  fee NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  foreign_fee NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. dividends (배당 내역 - 회원별 1:N 필수 연결)
CREATE TABLE IF NOT EXISTS public.dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  ticker TEXT,
  stock_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  tax NUMERIC DEFAULT 0,
  net_amount_krw NUMERIC DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY')),
  exchange_rate NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. exchange_rates (환율 정보 - 통화코드 다변화 지원)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  rate_date DATE NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  rate NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (rate_date, currency)
);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- =========================================================

-- RLS 활성화
ALTER TABLE public.common_code_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- 기존 정책 깔끔한 제거 후 재설정
DROP POLICY IF EXISTS "Public common_code_groups policy" ON public.common_code_groups;
DROP POLICY IF EXISTS "Public common_codes policy" ON public.common_codes;
DROP POLICY IF EXISTS "Public exchange_rates policy" ON public.exchange_rates;
DROP POLICY IF EXISTS "User profiles policy" ON public.profiles;
DROP POLICY IF EXISTS "User stocks policy" ON public.stocks;
DROP POLICY IF EXISTS "User trades policy" ON public.trades;
DROP POLICY IF EXISTS "User dividends policy" ON public.dividends;

-- 1) 공용 읽기 허용 정책 (공통코드, 환율)
CREATE POLICY "Public common_code_groups policy" ON public.common_code_groups FOR ALL USING (true);
CREATE POLICY "Public common_codes policy" ON public.common_codes FOR ALL USING (true);
CREATE POLICY "Public exchange_rates policy" ON public.exchange_rates FOR ALL USING (true);

-- 2) 회원 본인 데이터 격리 RLS 정책 (Multi-Tenant User Data Isolation)
CREATE POLICY "User profiles policy" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "User stocks policy" ON public.stocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User trades policy" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User dividends policy" ON public.dividends FOR ALL USING (auth.uid() = user_id);

-- =================================================================
-- 10. auth.users ➔ public.profiles 자동 생성 트리거 (Auto Profile Trigger)
-- 신규 유저가 Supabase Auth로 가입 시 public.profiles에 1:1 자동 프로필을 생성합니다.
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 신규 생성 시 이벤트 트리거 바인딩
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 가입되어 있는 auth.users 계정 profiles 일괄 동기화
INSERT INTO public.profiles (id, email, nickname)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
