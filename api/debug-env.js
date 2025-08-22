// 環境変数デバッグ用API
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 全環境変数を取得（値は一部のみ表示）
    const envDebug = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      
      // Supabase環境変数の存在確認
      SUPABASE_URL_EXISTS: !!process.env.SUPABASE_URL,
      SUPABASE_URL_LENGTH: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
      SUPABASE_URL_PREVIEW: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : null,
      
      SUPABASE_ANON_KEY_EXISTS: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY_LENGTH: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0,
      SUPABASE_ANON_KEY_PREVIEW: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : null,
      
      // その他の環境変数数
      TOTAL_ENV_VARS: Object.keys(process.env).length
    };

    res.status(200).json({
      message: 'Environment Variables Debug',
      timestamp: new Date().toISOString(),
      debug: envDebug
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Debug error',
      message: error.message 
    });
  }
};