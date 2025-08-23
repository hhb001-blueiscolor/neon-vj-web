// Supabase設定ファイル
// 環境変数からSupabase接続情報を取得

const { createClient } = require('@supabase/supabase-js');

// 環境変数の検証
function validateEnvironmentVariables() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }
    
    console.log('Using environment variables for Supabase configuration');
    return {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY
    };
}

// Supabaseクライアント初期化
function createSupabaseClient() {
    const config = validateEnvironmentVariables();
    
    const supabase = createClient(config.url, config.key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    });
    
    return supabase;
}

// 使用量カウンター関数
async function incrementUsageCounter(supabase, counterType, incrementBy = 1) {
    try {
        const { data, error } = await supabase
            .rpc('increment_usage_counter', {
                counter_type: counterType,
                increment_by: incrementBy
            });
            
        if (error) {
            console.error('Usage counter increment failed:', error);
            return false;
        }
        
        return data;
    } catch (err) {
        console.error('Usage counter error:', err);
        return false;
    }
}

// 制限チェック関数（月間制限のみ）
async function checkUsageLimit(supabase, counterType) {
    try {
        // 月間制限のみをチェックする簡易版
        // Netlifyの無料枠: 月125,000リクエスト
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        // 今月の使用量を取得
        let selectField;
        switch (counterType) {
            case 'events_created':
                selectField = 'events_created';
                break;
            case 'songs_added':
                selectField = 'songs_added';
                break;
            case 'api_calls':
                selectField = 'api_calls_count';
                break;
            default:
                selectField = 'events_created';
        }
        
        const { data: usageData, error: usageError } = await supabase
            .from('usage_stats')
            .select(selectField)
            .gte('date', `${currentMonth}-01`)
            .lte('date', `${currentMonth}-31`);
            
        if (usageError) {
            console.error('Usage check error:', usageError);
            // エラー時は制限しない（サービスを止めない）
            return { allowed: true, monthly_usage: 0, monthly_limit: 125000 };
        }
        
        // 合計を計算
        let monthlyUsage = 0;
        if (usageData && usageData.length > 0) {
            monthlyUsage = usageData.reduce((sum, row) => sum + (row[selectField] || 0), 0);
        }
        
        // 月間制限（6時間イベント×240曲を想定）
        let monthlyLimit;
        switch (counterType) {
            case 'events_created':
                monthlyLimit = 500;
                break;
            case 'songs_added':
                monthlyLimit = 100000;
                break;
            case 'api_calls':
                monthlyLimit = 120000; // API呼び出し全体の制限
                break;
            default:
                monthlyLimit = 500;
        }
        
        return {
            allowed: monthlyUsage < monthlyLimit,
            daily_usage: 0, // 日次は無視
            daily_limit: 999999, // 実質無制限
            monthly_usage: monthlyUsage,
            monthly_limit: monthlyLimit,
            warning_threshold: Math.floor(monthlyLimit * 0.9),
            warning_triggered: monthlyUsage >= Math.floor(monthlyLimit * 0.9)
        };
        
    } catch (err) {
        console.error('Usage limit check error:', err);
        // エラー時は制限しない
        return { allowed: true, monthly_usage: 0, monthly_limit: 125000 };
    }
}

// 期限切れイベントクリーンアップ
async function cleanupExpiredEvents(supabase) {
    try {
        const { data, error } = await supabase
            .rpc('cleanup_expired_events');
            
        if (error) {
            console.error('Cleanup failed:', error);
            return 0;
        }
        
        return data;
    } catch (err) {
        console.error('Cleanup error:', err);
        return 0;
    }
}

// 使用量統計取得
async function getUsageStats(supabase, days = 7) {
    try {
        const { data, error } = await supabase
            .from('usage_stats')
            .select('*')
            .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false });
            
        if (error) {
            console.error('Usage stats fetch failed:', error);
            return [];
        }
        
        return data;
    } catch (err) {
        console.error('Usage stats error:', err);
        return [];
    }
}

// システム制限値取得
async function getSystemLimits(supabase) {
    try {
        const { data, error } = await supabase
            .from('system_limits')
            .select('*');
            
        if (error) {
            console.error('System limits fetch failed:', error);
            return [];
        }
        
        return data;
    } catch (err) {
        console.error('System limits error:', err);
        return [];
    }
}

module.exports = {
    createSupabaseClient,
    incrementUsageCounter,
    checkUsageLimit,
    cleanupExpiredEvents,
    getUsageStats,
    getSystemLimits
};