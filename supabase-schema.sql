-- NeoN VJ Setlist Database Schema
-- Supabase PostgreSQL用スキーマ定義

-- 1. イベントテーブル
CREATE TABLE events (
    id VARCHAR(8) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_url VARCHAR(500),
    dj_display_mode VARCHAR(20) DEFAULT 'chronological',
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 2. 楽曲テーブル
CREATE TABLE songs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(8) REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    dj_name VARCHAR(255) DEFAULT '',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_id VARCHAR(255) NOT NULL
);

-- 3. 使用量統計テーブル（監視システム用）
CREATE TABLE usage_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    api_calls_count INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    songs_added INTEGER DEFAULT 0,
    data_retrieved INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. システム制限値管理テーブル
CREATE TABLE system_limits (
    id BIGSERIAL PRIMARY KEY,
    limit_type VARCHAR(50) NOT NULL UNIQUE,
    daily_limit INTEGER,
    monthly_limit INTEGER,
    current_usage INTEGER DEFAULT 0,
    warning_threshold INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期制限値設定
INSERT INTO system_limits (limit_type, daily_limit, monthly_limit, warning_threshold) VALUES
('api_calls', 2000, 50000, 45000),
('events_created', 5, 120, 100),
('songs_added', 1500, 30000, 27000),
('data_retrieved', 500, 15000, 13500);

-- 5. インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_events_device_id ON events(device_id);
CREATE INDEX idx_events_expires_at ON events(expires_at);
CREATE INDEX idx_songs_event_id ON songs(event_id);
CREATE INDEX idx_songs_timestamp ON songs(timestamp);
CREATE INDEX idx_usage_stats_date ON usage_stats(date);

-- 6. RLS (Row Level Security) 設定
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_limits ENABLE ROW LEVEL SECURITY;

-- 7. 公開アクセスポリシー（API経由のアクセス用）
-- eventsテーブル：デバイスIDベース認証
CREATE POLICY "events_insert_policy" ON events
    FOR INSERT WITH CHECK (true);
    
CREATE POLICY "events_select_policy" ON events
    FOR SELECT USING (true);
    
CREATE POLICY "events_update_policy" ON events
    FOR UPDATE USING (device_id = current_setting('request.jwt.claims', true)::json->>'device_id');

-- songsテーブル：イベント関連付けベース
CREATE POLICY "songs_insert_policy" ON songs
    FOR INSERT WITH CHECK (true);
    
CREATE POLICY "songs_select_policy" ON songs
    FOR SELECT USING (true);

-- usage_statsテーブル：読み取り専用
CREATE POLICY "usage_stats_select_policy" ON usage_stats
    FOR SELECT USING (true);
    
CREATE POLICY "usage_stats_insert_policy" ON usage_stats
    FOR INSERT WITH CHECK (true);
    
CREATE POLICY "usage_stats_update_policy" ON usage_stats
    FOR UPDATE USING (true);

-- system_limitsテーブル：読み取り専用（管理用）
CREATE POLICY "system_limits_select_policy" ON system_limits
    FOR SELECT USING (true);

-- 8. 自動クリーンアップ関数（期限切れイベント削除）
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 使用量カウンター関数
CREATE OR REPLACE FUNCTION increment_usage_counter(
    counter_type VARCHAR(50),
    increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    limit_row system_limits%ROWTYPE;
    current_count INTEGER;
BEGIN
    -- 制限値取得
    SELECT * INTO limit_row FROM system_limits WHERE limit_type = counter_type;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 今日の使用量統計取得または作成
    INSERT INTO usage_stats (date) VALUES (current_date)
    ON CONFLICT (date) DO NOTHING;
    
    -- カウンター更新
    CASE counter_type
        WHEN 'api_calls' THEN
            UPDATE usage_stats SET api_calls_count = api_calls_count + increment_by, updated_at = NOW()
            WHERE date = current_date;
        WHEN 'events_created' THEN
            UPDATE usage_stats SET events_created = events_created + increment_by, updated_at = NOW()
            WHERE date = current_date;
        WHEN 'songs_added' THEN
            UPDATE usage_stats SET songs_added = songs_added + increment_by, updated_at = NOW()
            WHERE date = current_date;
        WHEN 'data_retrieved' THEN
            UPDATE usage_stats SET data_retrieved = data_retrieved + increment_by, updated_at = NOW()
            WHERE date = current_date;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. 制限チェック関数
CREATE OR REPLACE FUNCTION check_usage_limit(
    counter_type VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    limit_row system_limits%ROWTYPE;
    current_usage INTEGER := 0;
    monthly_usage INTEGER := 0;
    result JSON;
BEGIN
    -- 制限値取得
    SELECT * INTO limit_row FROM system_limits WHERE limit_type = counter_type;
    
    IF NOT FOUND THEN
        RETURN '{"allowed": false, "error": "Invalid counter type"}'::JSON;
    END IF;
    
    -- 今日の使用量取得
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
    
    -- 制限チェック結果生成
    result := json_build_object(
        'allowed', 
        (current_usage < limit_row.daily_limit AND monthly_usage < limit_row.monthly_limit),
        'daily_usage', current_usage,
        'daily_limit', limit_row.daily_limit,
        'monthly_usage', monthly_usage,
        'monthly_limit', limit_row.monthly_limit,
        'warning_threshold', limit_row.warning_threshold,
        'warning_triggered', monthly_usage >= limit_row.warning_threshold
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. 日次使用量統計のunique制約
ALTER TABLE usage_stats ADD CONSTRAINT unique_daily_stats UNIQUE (date);

-- Schema作成完了
-- 次のステップ: Supabaseコンソールでこのスキーマを実行