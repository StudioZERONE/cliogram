-- =========================================================
-- Supabase PostgreSQL Schema DDL
-- Tables: trades, dividends, exchange_rates
-- =========================================================

-- 1. 매매내역 테이블 (trades)
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_date DATE NOT NULL,
    stock_name TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 제약조건 (Constraints)
    CONSTRAINT chk_trades_trade_type CHECK (trade_type IN ('BUY', 'SELL')),
    CONSTRAINT chk_trades_currency CHECK (currency IN ('KRW', 'USD')),
    CONSTRAINT chk_trades_quantity CHECK (quantity > 0),
    CONSTRAINT chk_trades_price CHECK (price >= 0),
    CONSTRAINT chk_trades_fee CHECK (fee >= 0),
    CONSTRAINT chk_trades_tax CHECK (tax >= 0)
);

-- 2. 배당내역 테이블 (dividends)
CREATE TABLE IF NOT EXISTS dividends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_date DATE NOT NULL,
    stock_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    tax NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 제약조건 (Constraints)
    CONSTRAINT chk_dividends_currency CHECK (currency IN ('KRW', 'USD')),
    CONSTRAINT chk_dividends_amount CHECK (amount > 0),
    CONSTRAINT chk_dividends_tax CHECK (tax >= 0)
);

-- 3. 환율 테이블 (exchange_rates)
CREATE TABLE IF NOT EXISTS exchange_rates (
    rate_date DATE PRIMARY KEY,
    usd_krw NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 제약조건 (Constraints)
    CONSTRAINT chk_exchange_rates_usd_krw CHECK (usd_krw > 0)
);

-- =========================================================
-- 성능 최적화를 위한 인덱스 (Indexes)
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades (trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_stock_name ON trades (stock_name);
CREATE INDEX IF NOT EXISTS idx_dividends_payment_date ON dividends (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_dividends_stock_name ON dividends (stock_name);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_rate_date ON exchange_rates (rate_date DESC);

-- =========================================================
-- Supabase Row Level Security (RLS) 활성화
-- =========================================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- 기본 개발/공개 정책 (필요 시 사용자별 user_id 기반 정책으로 교체 가능)
CREATE POLICY "Allow all access to authenticated users on trades" 
    ON trades FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to authenticated users on dividends" 
    ON dividends FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to exchange_rates" 
    ON exchange_rates FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- =========================================================
-- 테이블 및 컬럼 코멘트 (Supabase Studio 표시용)
-- =========================================================
COMMENT ON TABLE trades IS '주식 매매 내역 테이블';
COMMENT ON COLUMN trades.trade_type IS '매매 구분: BUY(매수), SELL(매도)';
COMMENT ON COLUMN trades.currency IS '거래 통화: KRW, USD';
COMMENT ON COLUMN trades.fee IS '거래 수수료 (기본값 0)';
COMMENT ON COLUMN trades.tax IS '거래세 및 제세공과금 (기본값 0)';

COMMENT ON TABLE dividends IS '배당금 입금 내역 테이블';
COMMENT ON COLUMN dividends.currency IS '배당 통화: KRW, USD';
COMMENT ON COLUMN dividends.tax IS '배당소득세 (기본값 0)';

COMMENT ON TABLE exchange_rates IS '일자별 USD/KRW 환율 테이블';
COMMENT ON COLUMN exchange_rates.rate_date IS '환율 기준일 (PK)';
COMMENT ON COLUMN exchange_rates.usd_krw IS '원/달러 환율';
