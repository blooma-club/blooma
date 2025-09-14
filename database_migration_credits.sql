-- 사용자 테이블에 크레딧 관련 필드 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise'));

-- 기존 사용자들에게 초기 크레딧 설정
UPDATE users 
SET credits = 100, 
    credits_used = 0, 
    credits_reset_date = (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'),
    subscription_tier = 'basic'
WHERE credits IS NULL;

-- AI 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('text_generation', 'image_generation', 'script_generation', 'image_edit')),
    provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'fal-ai', 'openai')),
    model_name TEXT,
    credits_consumed INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER,
    output_tokens INTEGER,
    image_count INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 크레딧 거래 내역 테이블
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'reset')),
    amount INTEGER NOT NULL, -- 양수: 충전, 음수: 사용
    description TEXT NOT NULL,
    ai_usage_id UUID REFERENCES ai_usage(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation_type ON ai_usage(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_success ON ai_usage(success);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- RLS (Row Level Security) 정책
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 볼 수 있음
CREATE POLICY "Users can view their own AI usage" ON ai_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 서비스 롤은 모든 작업 가능 (API에서 사용)
CREATE POLICY "Service role can manage AI usage" ON ai_usage
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage credit transactions" ON credit_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- 월간 크레딧 리셋을 위한 함수 (선택사항)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET credits_used = 0,
        credits_reset_date = date_trunc('month', CURRENT_DATE) + INTERVAL '1 month',
        updated_at = CURRENT_TIMESTAMP
    WHERE credits_reset_date <= CURRENT_DATE;
    
    -- 리셋 거래 내역 추가
    INSERT INTO credit_transactions (user_id, type, amount, description)
    SELECT id, 'reset', 0, 'Monthly credit usage reset'
    FROM users 
    WHERE credits_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크레딧 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_user_credits(
    p_user_id UUID,
    p_credits_to_subtract INTEGER
)
RETURNS TABLE (
    credits INTEGER
) AS $$
DECLARE
    current_credits INTEGER;
    current_used INTEGER;
BEGIN
    -- 현재 크레딧과 사용량 조회
    SELECT u.credits, u.credits_used INTO current_credits, current_used
    FROM users u
    WHERE u.id = p_user_id;
    
    -- 크레딧 차감 및 사용량 증가
    UPDATE users 
    SET credits = current_credits - p_credits_to_subtract,
        credits_used = current_used + p_credits_to_subtract,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- 업데이트된 크레딧 반환
    RETURN QUERY 
    SELECT u.credits
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크레딧 부족 체크 함수
CREATE OR REPLACE FUNCTION check_user_credits(
    p_user_id UUID,
    p_operation_type TEXT,
    p_tier TEXT DEFAULT 'free'
)
RETURNS TABLE (
    has_credits BOOLEAN,
    current_credits INTEGER,
    required_credits INTEGER
) AS $$
DECLARE
    credit_cost INTEGER;
    user_credits INTEGER;
BEGIN
    -- 티어별 비용 계산
    CASE p_tier
        WHEN 'pro' THEN
            CASE p_operation_type
                WHEN 'text_generation' THEN credit_cost := 1;
                WHEN 'image_generation' THEN credit_cost := 8;
                WHEN 'script_generation' THEN credit_cost := 4;
                WHEN 'image_edit' THEN credit_cost := 12;
                ELSE credit_cost := 1;
            END CASE;
        WHEN 'enterprise' THEN
            CASE p_operation_type
                WHEN 'text_generation' THEN credit_cost := 1;
                WHEN 'image_generation' THEN credit_cost := 6;
                WHEN 'script_generation' THEN credit_cost := 3;
                WHEN 'image_edit' THEN credit_cost := 10;
                ELSE credit_cost := 1;
            END CASE;
        ELSE -- 'basic'
            CASE p_operation_type
                WHEN 'text_generation' THEN credit_cost := 1;
                WHEN 'image_generation' THEN credit_cost := 10;
                WHEN 'script_generation' THEN credit_cost := 5;
                WHEN 'image_edit' THEN credit_cost := 15;
                ELSE credit_cost := 1;
            END CASE;
    END CASE;
    
    -- 사용자 크레딧 조회
    SELECT credits INTO user_credits
    FROM users 
    WHERE id = p_user_id;
    
    -- 결과 반환
    RETURN QUERY SELECT 
        user_credits >= credit_cost as has_credits,
        user_credits as current_credits,
        credit_cost as required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;