-- =========================================================
-- KLIOGRAM SYSTEM MASTER & SEED DATA (b_data_system.sql)
-- (시스템 운용에 필요한 공통코드 그룹, 공통코드, 초기 환율 시드)
-- =========================================================

-- 0. 레거시 구그룹 정리 (Legacy Clean-up)
DELETE FROM public.common_codes WHERE group_id = 'CURRENCY';
DELETE FROM public.common_code_groups WHERE group_id = 'CURRENCY';

-- 1. 공통코드 그룹 (common_code_groups)
INSERT INTO public.common_code_groups (group_id, group_name, description)
VALUES 
  ('THEME_CONFIG', '스크린 테마 설정', '스크린 테마 수동설정 만료기간(시간)'),
  ('TRADE_TYPE', '거래 유형', '매매 내역 거래 구분 (매수/매도)'),
  ('CURRENCY_CODE', '통화 코드', '시스템 지원 통화 (KRW, USD, EUR, JPY, CNY)'),
  ('STOCK_TYPE', '종목 유형', '주식/ETF 자산 분류 (성장주, 배당주, ISA, 파킹 등)'),
  ('MARKET_TYPE', '상장 시장', '글로벌 거래소/상장 시장 구분')
ON CONFLICT (group_id) DO UPDATE 
SET group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 2. 공통코드 상세 (common_codes)

-- 2-1. 테마 설정 (THEME_CONFIG)
INSERT INTO public.common_codes (group_id, code, code_name, sort_order, is_active)
VALUES 
  ('THEME_CONFIG', 'THEME_EXPIRE_HOURS', '12', 1, true)
ON CONFLICT (group_id, code) DO UPDATE 
SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 2-2. 거래 유형 (TRADE_TYPE)
INSERT INTO public.common_codes (group_id, code, code_name, sort_order, is_active)
VALUES 
  ('TRADE_TYPE', 'BUY', '매수 (BUY)', 1, true),
  ('TRADE_TYPE', 'SELL', '매도 (SELL)', 2, true)
ON CONFLICT (group_id, code) DO UPDATE 
SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 2-3. 통화 코드 (CURRENCY_CODE)
INSERT INTO public.common_codes (group_id, code, code_name, sort_order, is_active)
VALUES 
  ('CURRENCY_CODE', 'USD', '미국 달러 ($)', 1, true),
  ('CURRENCY_CODE', 'KRW', '대한민국 원 (₩)', 2, true),
  ('CURRENCY_CODE', 'EUR', '유로 (€)', 3, true),
  ('CURRENCY_CODE', 'JPY', '일본 엔 (¥)', 4, true),
  ('CURRENCY_CODE', 'CNY', '중국 위안 (¥)', 5, true)
ON CONFLICT (group_id, code) DO UPDATE 
SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 2-4. 종목 유형 (STOCK_TYPE)
INSERT INTO public.common_codes (group_id, code, code_name, sort_order, is_active)
VALUES 
  ('STOCK_TYPE', 'Growth', '성장주', 1, true),
  ('STOCK_TYPE', 'Dividend', '배당주', 2, true),
  ('STOCK_TYPE', 'ISA', 'ISA계좌', 3, true),
  ('STOCK_TYPE', 'RIA', '국내시장복귀계좌', 4, true),
  ('STOCK_TYPE', 'Save', '예적금 / 파킹', 5, true),
  ('STOCK_TYPE', 'Old.Growth', '구 성장주', 6, true),
  ('STOCK_TYPE', 'Old.Dividend', '구 배당주', 7, true)
ON CONFLICT (group_id, code) DO UPDATE 
SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 2-5. 상장 시장 (MARKET_TYPE)
INSERT INTO public.common_codes (group_id, code, code_name, sort_order, is_active)
VALUES 
  ('MARKET_TYPE', 'KRX', '한국거래소 (KOSPI/KOSDAQ)', 1, true),
  ('MARKET_TYPE', 'NASDAQ', '나스닥 (NASDAQ)', 2, true),
  ('MARKET_TYPE', 'NYSE', '뉴욕증권거래소 (NYSE)', 3, true),
  ('MARKET_TYPE', 'NYSEARCA', 'NYSE 아카 (ETF)', 4, true),
  ('MARKET_TYPE', 'ETR', '독일 증권거래소 (XETRA)', 5, true)
ON CONFLICT (group_id, code) DO UPDATE 
SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 3. 기본 환율 초기 시드 데이터 (exchange_rates)
INSERT INTO public.exchange_rates (rate_date, currency, rate)
VALUES 
  (CURRENT_DATE, 'USD', 1415.00),
  (CURRENT_DATE, 'EUR', 1540.00),
  (CURRENT_DATE, 'JPY', 9.45),
  (CURRENT_DATE, 'CNY', 198.50),
  (CURRENT_DATE, 'KRW', 1.00)
ON CONFLICT (rate_date, currency) DO UPDATE 
SET rate = EXCLUDED.rate;
