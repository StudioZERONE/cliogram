-- =========================================================
-- CLIOGRAM MIGRATION SCRIPT (c_migration_stocks_short_name_is_active.sql)
-- stocks 테이블에 짧은 종목명(short_name) 및 사용상태(is_active) 필드 추가
-- =========================================================

-- 1. short_name 컬럼 추가 (기존 테이블 존재 시)
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS short_name TEXT;

-- 2. is_active 컬럼 추가 (기존 테이블 존재 시)
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. 기존 종목 데이터 short_name 누락 건 name 값으로 자동 채움
UPDATE public.stocks 
SET short_name = name 
WHERE short_name IS NULL OR short_name = '';

-- 4. 기존 종목 데이터 is_active NULL 건 true 설정
UPDATE public.stocks 
SET is_active = true 
WHERE is_active IS NULL;
