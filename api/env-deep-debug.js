// 徹底的な環境変数デバッグ
module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 🧪 基本的な検証
        console.log('All env keys containing SUPA:');
        console.log(Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPA')));

        console.log('Exact match check:');
        console.log('SUPABASE_URL' in process.env);
        console.log('SUPABASE_ANON_KEY' in process.env);

        console.log('Raw values with quotes:');
        console.log(`URL: "${process.env.SUPABASE_URL}"`);
        console.log(`KEY: "${process.env.SUPABASE_ANON_KEY}"`);
        
        // 全環境変数をダンプ
        const allEnvVars = Object.keys(process.env).reduce((acc, key) => {
            // セキュリティ上、値の最初の20文字のみ表示
            const value = process.env[key];
            acc[key] = {
                exists: true,
                length: value.length,
                preview: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
                type: typeof value
            };
            return acc;
        }, {});

        // Vercel固有環境変数を詳細チェック
        const vercelInfo = {
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
            VERCEL_REGION: process.env.VERCEL_REGION,
            VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID
        };

        // Supabase環境変数の詳細分析
        const supabaseAnalysis = {
            SUPABASE_URL: {
                exists: !!process.env.SUPABASE_URL,
                value: process.env.SUPABASE_URL,
                type: typeof process.env.SUPABASE_URL,
                length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0
            },
            SUPABASE_ANON_KEY: {
                exists: !!process.env.SUPABASE_ANON_KEY,
                value: process.env.SUPABASE_ANON_KEY,
                type: typeof process.env.SUPABASE_ANON_KEY,
                length: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0
            }
        };

        // プロセス情報
        const processInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            cwd: process.cwd(),
            argv: process.argv
        };

        // ランタイム情報
        const runtimeInfo = {
            isVercel: !!process.env.VERCEL,
            isProduction: process.env.NODE_ENV === 'production',
            totalEnvVars: Object.keys(process.env).length,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
        };

        // 🧪 基本検証結果
        const basicVerification = {
            supaKeysFound: Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPA')),
            exactMatchCheck: {
                SUPABASE_URL: 'SUPABASE_URL' in process.env,
                SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY' in process.env
            },
            rawValues: {
                URL: `"${process.env.SUPABASE_URL}"`,
                KEY: `"${process.env.SUPABASE_ANON_KEY}"`.substring(0, 30) + '...'
            }
        };
        
        res.status(200).json({
            message: '徹底的な環境変数デバッグ結果',
            basicVerification,
            supabaseAnalysis,
            vercelInfo,
            processInfo,
            runtimeInfo,
            envVarCount: Object.keys(allEnvVars).length,
            // セキュリティを考慮して全環境変数は含めない
            // allEnvVars: allEnvVars
        });

    } catch (error) {
        res.status(500).json({
            error: 'Deep debug error',
            message: error.message,
            stack: error.stack
        });
    }
};