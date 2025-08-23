// Usage Debug API for detailed investigation
const { 
  createSupabaseClient 
} = require('./supabase-config');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseClient();

  try {
    const results = {};

    // 1. 制限値テーブルの内容を確認
    console.log('🔍 Checking system_limits table...');
    const { data: limits, error: limitsError } = await supabase
      .from('system_limits')
      .select('*');

    if (limitsError) {
      console.error('❌ Limits query error:', limitsError);
      results.limits_error = limitsError.message;
    } else {
      console.log('✅ Limits data:', limits);
      results.system_limits = limits;
    }

    // 2. 使用量統計の確認（過去7日間）
    console.log('🔍 Checking usage_stats table...');
    const { data: stats, error: statsError } = await supabase
      .from('usage_stats')
      .select('*')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (statsError) {
      console.error('❌ Stats query error:', statsError);
      results.stats_error = statsError.message;
    } else {
      console.log('✅ Stats data:', stats);
      results.usage_stats = stats;
    }

    // 3. eventsテーブルの件数確認
    console.log('🔍 Checking events table count...');
    const { count: eventsCount, error: eventsCountError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (eventsCountError) {
      console.error('❌ Events count error:', eventsCountError);
      results.events_count_error = eventsCountError.message;
    } else {
      console.log('✅ Events count:', eventsCount);
      results.total_events_count = eventsCount;
    }

    // 4. songsテーブルの件数確認
    console.log('🔍 Checking songs table count...');
    const { count: songsCount, error: songsCountError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true });

    if (songsCountError) {
      console.error('❌ Songs count error:', songsCountError);
      results.songs_count_error = songsCountError.message;
    } else {
      console.log('✅ Songs count:', songsCount);
      results.total_songs_count = songsCount;
    }

    // 5. 今日の統計
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Checking today stats:', today);
    
    const { data: todayStats, error: todayError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('date', today)
      .single();

    if (todayError && todayError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Today stats error:', todayError);
      results.today_error = todayError.message;
    } else if (todayStats) {
      console.log('✅ Today stats:', todayStats);
      results.today_stats = todayStats;
    } else {
      console.log('ℹ️ No stats for today yet');
      results.today_stats = null;
    }

    // 6. 環境変数確認
    results.environment_check = {
      supabase_url_set: !!process.env.SUPABASE_URL,
      supabase_key_set: !!process.env.SUPABASE_ANON_KEY,
      supabase_url_length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
      supabase_key_length: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0
    };

    // 7. テーブル存在確認
    console.log('🔍 Checking table existence...');
    const tableChecks = {};
    
    const tables = ['system_limits', 'usage_stats', 'events', 'songs'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        tableChecks[table] = {
          exists: !error,
          error: error?.message,
          count: data === null ? 'unknown' : 'accessible'
        };
      } catch (e) {
        tableChecks[table] = {
          exists: false,
          error: e.message,
          count: 0
        };
      }
    }
    
    results.table_checks = tableChecks;

    // まとめ
    results.summary = {
      timestamp: new Date().toISOString(),
      total_checks: Object.keys(results).length,
      has_limits: !!results.system_limits,
      has_stats: !!results.usage_stats,
      events_exist: results.total_events_count > 0,
      songs_exist: results.total_songs_count > 0
    };

    console.log('📊 Debug results summary:', results.summary);

    res.status(200).json(results);

  } catch (error) {
    console.error('💥 Usage debug error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};