-- KLIOGRAM PostgreSQL DDL Script for Supabase

-- 1. profiles (회원 프로필 확장 테이블)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_logout_at TIMESTAMPTZ DEFAULT NULL,
  user_level INTEGER DEFAULT NULL
);

-- 2. trades (매매 내역 테이블)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  stock_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'USD')),
  fee NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. dividends (배당 내역 테이블)
CREATE TABLE IF NOT EXISTS public.dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  stock_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  tax NUMERIC DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'USD')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. exchange_rates (환율 정보 캐싱 테이블)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  rate_date DATE PRIMARY KEY,
  usd_krw NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Google SSO 로그인 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, created_at, last_logout_at, user_level)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nickname = COALESCE(EXCLUDED.nickname, profiles.nickname);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS) 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
CREATE POLICY "Public profiles are viewable by owner" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own dividends" ON public.dividends
  FOR ALL USING (auth.uid() = user_id);
