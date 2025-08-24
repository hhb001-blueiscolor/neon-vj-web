// 最小限のテストAPI
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = {
      status: 'working',
      timestamp: new Date().toISOString(),
      env_check: {
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_ANON_KEY
      }
    };

    // ライブラリテスト
    try {
      require('@supabase/supabase-js');
      result.supabase_lib = 'available';
    } catch (e) {
      result.supabase_lib = 'missing';
      result.lib_error = e.message;
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message 
    });
  }
};