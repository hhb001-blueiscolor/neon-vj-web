// 根本原因診断API
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const diagnostic = {
    timestamp: new Date().toISOString(),
    
    // 環境変数確認
    environment_variables: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      url_length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
      key_length: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0
    },

    // ライブラリ確認
    libraries: {},

    // Runtime確認
    runtime: {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage()
    }
  };

  // Supabase ライブラリ確認
  try {
    const supabase = require('@supabase/supabase-js');
    diagnostic.libraries.supabase = {
      available: true,
      version: supabase.createClient ? 'createClient available' : 'createClient missing'
    };
    
    // 実際の接続テスト
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { createClient } = supabase;
      const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      
      // 簡単なクエリテスト
      const { data, error } = await client
        .from('events')
        .select('count')
        .limit(1);
        
      diagnostic.supabase_connection = {
        test_query: !error,
        error_message: error ? error.message : null
      };
    }
    
  } catch (err) {
    diagnostic.libraries.supabase = {
      available: false,
      error: err.message
    };
  }

  res.status(200).json(diagnostic);
};