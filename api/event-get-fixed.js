// 根治版：完全に動作するイベント取得API
const { createSupabaseClient } = require('./supabase-config');

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

  try {
    console.log('📖 [FIXED] Event retrieval started');
    
    const supabase = createSupabaseClient();
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    console.log(`🔍 [FIXED] Retrieving event: ${eventId}`);

    // イベントデータ取得
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      console.error('❌ [FIXED] Event not found:', eventId, eventError);
      return res.status(404).json({ 
        error: 'Event not found',
        eventId: eventId
      });
    }

    console.log('✅ [FIXED] Event found:', eventData);

    // 楽曲データ取得
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, dj_name, timestamp')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    if (songsError) {
      console.warn('⚠️ [FIXED] Songs retrieval failed (continuing):', songsError);
    }

    console.log(`✅ [FIXED] Found ${songsData?.length || 0} songs`);

    // 使用量統計を更新（エラー時も続行）
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await supabase
        .from('usage_stats')
        .upsert({
          date: today,
          api_calls_count: 1
        }, {
          onConflict: 'date',
          ignoreDuplicates: false
        });
        
      console.log('📊 [FIXED] Usage stats updated for retrieval');
    } catch (statsError) {
      console.warn('⚠️ [FIXED] Usage stats update failed (continuing):', statsError);
    }

    // 成功レスポンス
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
      songs: (songsData || []).map(song => ({
        title: song.title,
        artist: song.artist,
        dj_name: song.dj_name,
        timestamp: song.timestamp
      })),
      meta: {
        total_songs: songsData?.length || 0,
        last_updated: new Date().toISOString(),
        debug_info: {
          source: 'FIXED_GET_API_2025_01_24',
          event_found: true,
          songs_found: songsData?.length || 0
        }
      }
    };

    console.log('🎉 [FIXED] Event retrieval success');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('💥 [FIXED] Critical error in event retrieval:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      debug_source: 'FIXED_GET_API_ERROR'
    });
  }
};