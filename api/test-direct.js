// 直接接続テスト用API（環境変数を使わない）
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 直接接続情報を指定
    const supabaseUrl = 'https://rvblfsgpjoypfdfmvmfw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Ymxmc2dwam95cGZkZm12bWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjU3NzAsImV4cCI6MjA3MTQwMTc3MH0.AsynLa8p16fdq3Kkq_PvqojlvAwtr3g2nRgv-Z5H5OU';
    
    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // system_limits テーブルにアクセスしてテスト
    const { data, error } = await supabase
      .from('system_limits')
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      message: 'Supabase接続成功！',
      timestamp: new Date().toISOString(),
      connectionTest: '✅ 成功',
      systemLimitsData: data,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定'
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Supabase接続エラー',
      message: error.message,
      details: error
    });
  }
};