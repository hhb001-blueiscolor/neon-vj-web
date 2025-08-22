// Simple Event Test API (without usage limits)
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

  const supabase = createSupabaseClient();

  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // イベントデータ取得
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      return res.status(404).json({ error: 'Event not found', details: eventError });
    }

    // 楽曲データ取得
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, dj_name, timestamp')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    if (songsError) {
      console.error('Songs fetch failed:', songsError);
      return res.status(500).json({ error: 'Songs fetch failed', details: songsError });
    }

    // レスポンス
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
      meta: {
        total_songs: songsData.length,
        last_updated: new Date().toISOString()
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Event test fetch error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}