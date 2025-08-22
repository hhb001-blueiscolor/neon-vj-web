// Supabase設定ファイル
// Vercel環境変数問題の回避的解決（直接接続）

const { createClient } = require('@supabase/supabase-js');

// 直接接続情報（Vercel環境変数が認識されないため）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rvblfsgpjoypfdfmvmfw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Ymxmc2dwam95cGZkZm12bWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjU3NzAsImV4cCI6MjA3MTQwMTc3MH0.AsynLa8p16fdq3Kkq_PvqojlvAwtr3g2nRgv-Z5H5OU';

// Supabaseクライアント初期化
function createSupabaseClient() {
    // 環境変数が認識されない場合はフォールバックを使用
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_ANON_KEY;
    
    console.log('Supabase connection using:', {
        url: supabaseUrl.substring(0, 30) + '...',
        keyLength: supabaseKey.length,
        isFromEnv: !!process.env.SUPABASE_URL
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
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