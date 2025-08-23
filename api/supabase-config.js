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

// 使用量カウンター関数（RPC関数バイパス版）
async function incrementUsageCounter(supabase, counterType, incrementBy = 1) {
    console.log(`📊 [DIRECT_INCREMENT] ${counterType} by ${incrementBy}`);
    
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // usage_statsテーブルに直接挿入/更新
        let updateField;
        switch (counterType) {
            case 'events_created':
                updateField = 'events_created';
                break;
            case 'songs_added':
                updateField = 'songs_added';
                break;
            case 'api_calls':
                updateField = 'api_calls_count';
                break;
            default:
                console.warn(`Unknown counter type: ${counterType}`);
                return true; // 不明な種類でもエラーにしない
        }
        
        // upsert操作で今日のレコードを更新または作成
        const { data, error } = await supabase
            .from('usage_stats')
            .upsert({
                date: today,
                [updateField]: incrementBy
            }, {
                onConflict: 'date',
                ignoreDuplicates: false
            })
            .select();
            
        if (error) {
            console.error('Direct usage counter increment failed:', error);
            // RPC失敗時のフォールバック - エラーにはせずログのみ
            return true;
        }
        
        console.log(`✅ [DIRECT_INCREMENT] Success: ${counterType}`);
        return data;
    } catch (err) {
        console.error('Direct usage counter error:', err);
        // エラー時もシステムを停止させない
        return true;
    }
}

// 制限チェック関数（完全リニューアル版 - 2025/01/23修正）
async function checkUsageLimitNew(supabase, counterType) {
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
        
        // 今月の使用量を直接テーブルから取得
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
        
        let monthlyUsage = 0;
        if (!usageError && usageData && usageData.length > 0) {
            monthlyUsage = usageData.reduce((sum, row) => sum + (row[selectField] || 0), 0);
        }
        
        console.log(`📈 [NEW_CODE] Monthly usage for ${counterType}: ${monthlyUsage}/${monthlyLimit}`);
        
        const result = {
            allowed: monthlyUsage < monthlyLimit,
            daily_usage: 0, // 日次制限は廃止
            daily_limit: 999999, // 日次制限は実質無制限
            monthly_usage: monthlyUsage,
            monthly_limit: monthlyLimit,
            warning_threshold: Math.floor(monthlyLimit * 0.9),
            warning_triggered: monthlyUsage >= Math.floor(monthlyLimit * 0.9),
            debug_source: "PROPER_NEW_CODE_2025_01_23",
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

// 使用制限チェック関数（安全な制限付きバージョン）
async function checkUsageLimit(supabase, counterType) {
    console.log(`🔍 [SAFE_LIMIT_CHECK] Checking ${counterType}`);
    
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        // 安全な月間制限（Netlify無料枠に配慮）
        let monthlyLimit;
        switch (counterType) {
            case 'events_created':
                monthlyLimit = 300; // 500→300に縮小（安全マージン）
                break;
            case 'songs_added':
                monthlyLimit = 50000; // 100000→50000に縮小
                break;
            case 'api_calls':
                monthlyLimit = 60000; // 120000→60000に縮小
                break;
            default:
                monthlyLimit = 300;
        }
        
        // 直接テーブルから使用量を取得
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
        
        let monthlyUsage = 0;
        if (!usageError && usageData && usageData.length > 0) {
            monthlyUsage = usageData.reduce((sum, row) => sum + (row[selectField] || 0), 0);
        }
        
        const result = {
            allowed: monthlyUsage < monthlyLimit,
            daily_usage: 0,
            daily_limit: 999999,
            monthly_usage: monthlyUsage,
            monthly_limit: monthlyLimit,
            warning_threshold: Math.floor(monthlyLimit * 0.8), // 80%で警告
            warning_triggered: monthlyUsage >= Math.floor(monthlyLimit * 0.8),
            debug_source: "SAFE_DIRECT_ACCESS_2025_01_23"
        };
        
        console.log(`📊 [SAFE_LIMIT_CHECK] ${counterType}: ${monthlyUsage}/${monthlyLimit}`, result);
        return result;
        
    } catch (err) {
        console.error('❌ [SAFE_LIMIT_CHECK] Error:', err);
        // エラー時は制限を許可（システム継続優先）
        return { 
            allowed: true, 
            monthly_usage: 0, 
            monthly_limit: 999999,
            debug_source: "ERROR_FALLBACK_SAFE_MODE" 
        };
    }
}

module.exports = {
    createSupabaseClient,
    incrementUsageCounter,
    checkUsageLimit,
    checkUsageLimitNew,
    cleanupExpiredEvents,
    getUsageStats,
    getSystemLimits
};