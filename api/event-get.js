// Supabase Event Data Retrieval API with Usage Monitoring
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
  checkUsageLimit,
  checkUsageLimitNew
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
    // Phase 1: 制限チェック（API呼び出し制限のみ）
    const apiLimitCheck = await checkUsageLimitNew(supabase, 'api_calls');

    if (!apiLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Usage limit exceeded',
        details: {
          api_calls: apiLimitCheck
        }
      });
    }

    // Phase 2: リクエスト検証
    const { eventId } = req.query;
    
    if (!eventId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Phase 3: イベントデータ取得
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(404).json({ error: 'Event not found' });
    }

    // 期限チェック
    const expiresAt = new Date(eventData.expires_at);
    if (expiresAt < new Date()) {
      // 期限切れイベントを非活性化
      await supabase
        .from('events')
        .update({ is_active: false })
        .eq('id', eventId);
        
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(404).json({ error: 'Event has expired' });
    }

    // Phase 4: 楽曲データ取得（新しい順）
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, dj_name, timestamp')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    if (songsError) {
      console.error('Songs fetch failed:', songsError);
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(500).json({ error: 'Songs fetch failed' });
    }

    // Phase 5: 使用量カウンター更新（API呼び出しのみ）
    await incrementUsageCounter(supabase, 'api_calls');

    // Phase 6: レガシー形式での返却（Web側の互換性保持）
    const responseData = {
      event: {
        id: eventData.id,
        name: eventData.name,
        event_url: eventData.event_url,
        dj_display_mode: eventData.dj_display_mode,
        device_id: eventData.device_id,
        created_at: eventData.created_at,
        expires_at: eventData.expires_at
      },
      songs: songsData.map(song => ({
        title: song.title,
        artist: song.artist,
        dj_name: song.dj_name,
        timestamp: song.timestamp
      })),
      usage: {
        api_calls: apiLimitCheck
      },
      meta: {
        total_songs: songsData.length,
        last_updated: new Date().toISOString()
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Event fetch error:', error);
    
    // エラー時も使用量カウンター更新
    try {
      await incrementUsageCounter(supabase, 'api_calls');
    } catch (counterError) {
      console.error('Counter update failed:', counterError);
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}