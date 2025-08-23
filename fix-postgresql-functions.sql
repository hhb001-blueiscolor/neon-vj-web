-- PostgreSQL Functions Fix for NeoN VJ Setlist System
-- 使用量制限チェック関数の修正

-- 制限チェック関数（修正版）
CREATE OR REPLACE FUNCTION check_usage_limit(
    counter_type VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    limit_row RECORD;
    current_usage INTEGER := 0;
    monthly_usage INTEGER := 0;
    result JSON;
BEGIN
    -- 制限値取得
    SELECT * INTO limit_row FROM system_limits WHERE limit_type = counter_type;
    
    IF NOT FOUND THEN
        RETURN '{"allowed": false, "error": "Invalid counter type"}'::JSON;
    END IF;
    
    -- 今日の使用量統計レコードを確実に作成
    INSERT INTO usage_stats (date) VALUES (current_date)
    ON CONFLICT (date) DO NOTHING;
    
    -- 今日の使用量取得（COALESCEで確実に0を取得）
    CASE counter_type
        WHEN 'api_calls' THEN
            SELECT COALESCE(api_calls_count, 0) INTO current_usage 
            FROM usage_stats WHERE date = current_date;
        WHEN 'events_created' THEN
            SELECT COALESCE(events_created, 0) INTO current_usage 
            FROM usage_stats WHERE date = current_date;
        WHEN 'songs_added' THEN
            SELECT COALESCE(songs_added, 0) INTO current_usage 
            FROM usage_stats WHERE date = current_date;
        WHEN 'data_retrieved' THEN
            SELECT COALESCE(data_retrieved, 0) INTO current_usage 
            FROM usage_stats WHERE date = current_date;
    END CASE;
    
    -- SELECTが何も返さない場合の保証
    IF current_usage IS NULL THEN
        current_usage := 0;
    END IF;
    
    -- 月間使用量計算（当月1日から現在まで）
    CASE counter_type
        WHEN 'api_calls' THEN
            SELECT COALESCE(SUM(api_calls_count), 0) INTO monthly_usage 
            FROM usage_stats WHERE date >= DATE_TRUNC('month', current_date);
        WHEN 'events_created' THEN
            SELECT COALESCE(SUM(events_created), 0) INTO monthly_usage 
            FROM usage_stats WHERE date >= DATE_TRUNC('month', current_date);
        WHEN 'songs_added' THEN
            SELECT COALESCE(SUM(songs_added), 0) INTO monthly_usage 
            FROM usage_stats WHERE date >= DATE_TRUNC('month', current_date);
        WHEN 'data_retrieved' THEN
            SELECT COALESCE(SUM(data_retrieved), 0) INTO monthly_usage 
            FROM usage_stats WHERE date >= DATE_TRUNC('month', current_date);
    END CASE;
    
    -- 月間使用量のNULLチェック
    IF monthly_usage IS NULL THEN
        monthly_usage := 0;
    END IF;
    
    -- 制限チェック結果生成（Boolean値を確実に生成）
    result := json_build_object(
        'allowed', 
        CASE 
            WHEN limit_row.daily_limit IS NULL OR limit_row.monthly_limit IS NULL THEN true
            ELSE (current_usage < limit_row.daily_limit AND monthly_usage < limit_row.monthly_limit)
        END,
        'daily_usage', current_usage,
        'daily_limit', limit_row.daily_limit,
        'monthly_usage', monthly_usage,
        'monthly_limit', limit_row.monthly_limit,
        'warning_threshold', limit_row.warning_threshold,
        'warning_triggered', CASE 
            WHEN limit_row.warning_threshold IS NULL THEN false
            ELSE (monthly_usage >= limit_row.warning_threshold)
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 使用量カウンター関数（修正版）
CREATE OR REPLACE FUNCTION increment_usage_counter(
    counter_type VARCHAR(50),
    increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    limit_row RECORD;
BEGIN
    -- 制限値取得
    SELECT * INTO limit_row FROM system_limits WHERE limit_type = counter_type;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 今日の使用量統計レコードを確実に作成
    INSERT INTO usage_stats (date) VALUES (current_date)
    ON CONFLICT (date) DO NOTHING;
    
    -- カウンター更新（CASE文で確実に更新）
    CASE counter_type
        WHEN 'api_calls' THEN
            UPDATE usage_stats SET 
                api_calls_count = COALESCE(api_calls_count, 0) + increment_by, 
                updated_at = NOW()
            WHERE date = current_date;
        WHEN 'events_created' THEN
            UPDATE usage_stats SET 
                events_created = COALESCE(events_created, 0) + increment_by, 
                updated_at = NOW()
            WHERE date = current_date;
        WHEN 'songs_added' THEN
            UPDATE usage_stats SET 
                songs_added = COALESCE(songs_added, 0) + increment_by, 
                updated_at = NOW()
            WHERE date = current_date;
        WHEN 'data_retrieved' THEN
            UPDATE usage_stats SET 
                data_retrieved = COALESCE(data_retrieved, 0) + increment_by, 
                updated_at = NOW()
            WHERE date = current_date;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;