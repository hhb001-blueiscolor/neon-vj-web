// フォールバック機能のテスト API
const { createSupabaseClient } = require('./supabase-config');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('=== Fallback Test API Start ===');
        
        // 環境変数の状況を確認
        const envStatus = {
            SUPABASE_URL: {
                exists: !!process.env.SUPABASE_URL,
                value: process.env.SUPABASE_URL || 'undefined',
                type: typeof process.env.SUPABASE_URL
            },
            SUPABASE_ANON_KEY: {
                exists: !!process.env.SUPABASE_ANON_KEY,
                value: process.env.SUPABASE_ANON_KEY ? 'SET (hidden)' : 'undefined',
                type: typeof process.env.SUPABASE_ANON_KEY
            }
        };
        
        console.log('Environment Variables Status:', envStatus);
        
        // Supabaseクライアント作成をテスト
        console.log('Attempting to create Supabase client...');
        const supabase = createSupabaseClient();
        console.log('Supabase client created successfully');
        
        // 簡単なクエリをテスト
        console.log('Testing database connection...');
        const { data, error } = await supabase
            .from('system_limits')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database query failed',
                details: error.message,
                envStatus
            });
        }
        
        console.log('Database query successful:', data);
        
        res.status(200).json({
            success: true,
            message: 'Fallback mechanism working correctly',
            envStatus,
            databaseConnection: 'OK',
            queryResult: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fallback test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
};