// Supabase Song Addition API with Usage Monitoring
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
  checkUsageLimit 
} = require('./supabase-config');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseClient();

  try {
    // Phase 1: 制限チェック（月間制限のみ）
    const songLimitCheck = await checkUsageLimit(supabase, 'songs_added');

    if (!songLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Monthly usage limit exceeded',
        details: {
          songs_added: songLimitCheck
        }
      });
    }

    // 90%警告チェック
    if (songLimitCheck.warning_triggered) {
      console.warn('Monthly usage approaching limit:', {
        songs_added: songLimitCheck
      });
    }

    // Phase 2: リクエスト検証
    const { eventId } = req.query;
    const { title, artist, djName, deviceId } = req.body;

    if (!eventId || !title || !artist || !deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Phase 3: イベント存在確認と認証
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, device_id, expires_at, name')
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

    // デバイス認証
    if (eventData.device_id !== deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Phase 4: 楽曲追加
    const { data: songData, error: songError } = await supabase
      .from('songs')
      .insert([
        {
          event_id: eventId,
          title: title,
          artist: artist,
          dj_name: djName || "",
          device_id: deviceId
        }
      ])
      .select();

    if (songError) {
      console.error('Song addition failed:', songError);
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(500).json({ error: 'Song addition failed' });
    }

    // Phase 5: 楽曲総数取得
    const { count: totalSongs, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) {
      console.warn('Song count failed:', countError);
    }

    // Phase 6: 使用量カウンター更新
    await Promise.all([
      incrementUsageCounter(supabase, 'api_calls'),
      incrementUsageCounter(supabase, 'songs_added')
    ]);

    // Phase 7: 成功レスポンス
    res.status(201).json({
      success: true,
      song: songData[0],
      totalSongs: totalSongs || 0,
      eventName: eventData.name,
      usage: {
        api_calls: apiLimitCheck,
        songs_added: songLimitCheck
      }
    });

  } catch (error) {
    console.error('Song addition error:', error);
    
    // エラー時も使用量カウンター更新
    try {
      await incrementUsageCounter(supabase, 'api_calls');
    } catch (counterError) {
      console.error('Counter update failed:', counterError);
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}