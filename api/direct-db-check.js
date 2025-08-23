// Direct Database Check - bypassing environment variables for testing
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 直接接続（テスト用）
  const supabaseUrl = 'https://rvblfsgpjoypfdfmvmfw.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Ymxmc2dwam95cGZkZm12bWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0NzI2MDYsImV4cCI6MjA0MDA0ODYwNn0.Hq3EHXI7oNOGMSuuT0rqnBxnGvMxo_BEQCg3dS64jb8';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. system_limits テーブル確認
    console.log('🔍 Checking system_limits table...');
    const { data: limits, error: limitsError } = await supabase
      .from('system_limits')
      .select('*');

    if (limitsError) {
      console.error('❌ Limits query error:', limitsError);
      return res.status(500).json({ error: 'Limits query failed', details: limitsError.message });
    }

    console.log('✅ Limits found:', limits);

    // 2. usage_stats 今日のデータ
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Checking usage_stats for:', today);
    
    const { data: todayStats, error: statsError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('date', today);

    if (statsError) {
      console.error('❌ Stats query error:', statsError);
    } else {
      console.log('✅ Today stats:', todayStats);
    }

    // 3. レスポンス
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      system_limits: limits,
      today_date: today,
      today_stats: todayStats || [],
      connection_test: 'OK'
    };

    console.log('📊 Final response:', response);
    res.status(200).json(response);

  } catch (error) {
    console.error('💥 Direct DB check error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message,
      stack: error.stack
    });
  }
};