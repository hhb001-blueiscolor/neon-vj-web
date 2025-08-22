// Supabase Usage Check API for iOS Client
const { 
  createSupabaseClient, 
  checkUsageLimit 
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
    // Phase 1: パラメーター検証
    const { type } = req.query;
    
    const validTypes = ['api_calls', 'events_created', 'songs_added', 'data_retrieved'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid or missing type parameter',
        validTypes: validTypes 
      });
    }

    // Phase 2: 制限チェック実行
    const limitCheck = await checkUsageLimit(supabase, type);

    if (!limitCheck || typeof limitCheck !== 'object') {
      return res.status(500).json({ error: 'Failed to check usage limit' });
    }

    // Phase 3: レスポンス返却
    res.status(200).json(limitCheck);

  } catch (error) {
    console.error('Usage check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};