// Simple Limits Check API
const { createSupabaseClient } = require('./supabase-config');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createSupabaseClient();

  try {
    // 1. system_limits テーブル確認
    const { data: limits, error: limitsError } = await supabase
      .from('system_limits')
      .select('*');

    if (limitsError) {
      return res.status(500).json({ error: 'Limits query failed', details: limitsError.message });
    }

    // 2. usage_stats 今日のデータ
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats, error: statsError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('date', today)
      .single();

    // 3. 簡潔な結果返却
    res.status(200).json({
      limits: limits,
      today_date: today,
      today_stats: todayStats || null,
      stats_error: statsError?.code === 'PGRST116' ? 'No data for today' : statsError?.message || null
    });

  } catch (error) {
    console.error('Simple limits check error:', error);
    res.status(500).json({ error: error.message });
  }
};