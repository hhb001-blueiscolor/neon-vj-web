// 最終診断API - コード実行確認
const { createSupabaseClient } = require('./supabase-config');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createSupabaseClient();
    
    // 直接テーブルから制限を確認
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const { data: usageData, error } = await supabase
      .from('usage_stats')
      .select('events_created')
      .gte('date', `${currentMonth}-01`)
      .lte('date', `${currentMonth}-31`);
    
    let monthlyUsage = 0;
    if (!error && usageData && usageData.length > 0) {
      monthlyUsage = usageData.reduce((sum, row) => sum + (row.events_created || 0), 0);
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      code_version: "FINAL_DEBUG_2025_01_23",
      execution_confirmed: true,
      direct_table_access: !error,
      monthly_usage_from_table: monthlyUsage,
      expected_monthly_limit: 300,
      table_data: usageData,
      error: error ? error.message : null
    });
    
  } catch (err) {
    res.status(500).json({
      error: err.message,
      code_version: "FINAL_DEBUG_2025_01_23",
      execution_confirmed: true
    });
  }
};