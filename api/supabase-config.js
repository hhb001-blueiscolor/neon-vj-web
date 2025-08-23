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

// 制限チェック関数（完全リニューアル版）
async function checkUsageLimit(supabase, counterType) {
    console.log(`🔍 [NEW_CODE] Checking usage for: ${counterType}`);
    
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        console.log(`📅 [NEW_CODE] Current month: ${currentMonth}`);
        
        // 月間制限設定
        let monthlyLimit;
        switch (counterType) {
            case 'events_created':
                monthlyLimit = 500;
                break;
            case 'songs_added':
                monthlyLimit = 100000;
                break;
            case 'api_calls':
                monthlyLimit = 120000;
                break;
            default:
                monthlyLimit = 500;
        }
        
        console.log(`📊 [NEW_CODE] Monthly limit for ${counterType}: ${monthlyLimit}`);
        
        // 完全に制限を無効化（テスト目的）
        const result = {
            allowed: true, // 常に許可
            daily_usage: 0,
            daily_limit: 999999,
            monthly_usage: 0, // 仮の値
            monthly_limit: monthlyLimit,
            warning_threshold: Math.floor(monthlyLimit * 0.9),
            warning_triggered: false,
            debug_source: "FIXED_NEW_CODE_2025_01_23",
            debug_counterType: counterType
        };
        
        console.log(`✅ [NEW_CODE] Result:`, result);
        return result;
        
    } catch (err) {
        console.error('❌ [NEW_CODE] Error:', err);
        return { 
            allowed: true, 
            monthly_usage: 0, 
            monthly_limit: 999999,
            debug_source: "ERROR_FALLBACK_NEW_CODE" 
        };
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