// Netlify Functions用 Supabase設定ファイル
// 環境変数から安全にSupabase接続情報を取得

const { createClient } = require('@supabase/supabase-js');

// 環境変数の検証（Netlify環境変数システム使用）
function validateEnvironmentVariables() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    
    return {
        url: supabaseUrl,
        key: supabaseKey
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

// 制限チェック関数
async function checkUsageLimit(supabase, counterType) {
    try {
        const { data, error } = await supabase
            .rpc('check_usage_limit', {
                counter_type: counterType
            });
            
        if (error) {
            console.error('Usage limit check failed:', error);
            return { allowed: false, error: error.message };
        }
        
        return data;
    } catch (err) {
        console.error('Usage limit check error:', err);
        return { allowed: false, error: err.message };
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