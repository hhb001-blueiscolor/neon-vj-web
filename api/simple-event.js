// Minimal event data retrieval API bypassing all usage checks
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
    const supabase = createSupabaseClient();
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get event data only
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      return res.status(404).json({ 
        error: 'Event not found',
        debug: { eventError }
      });
    }

    // Get songs data
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, dj_name, timestamp')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    // Return data even if songs query fails
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
      songs: songsError ? [] : songsData.map(song => ({
        title: song.title,
        artist: song.artist,
        dj_name: song.dj_name,
        timestamp: song.timestamp
      })),
      meta: {
        total_songs: songsError ? 0 : songsData.length,
        last_updated: new Date().toISOString(),
        songs_error: songsError ? songsError.message : null
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Simple event API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};