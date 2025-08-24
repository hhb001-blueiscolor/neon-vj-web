// Debug version of event-get API to identify the exact error
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
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

  try {
    console.log('🔍 Starting debug event-get for eventId:', req.query.eventId);
    
    const supabase = createSupabaseClient();
    console.log('✅ Supabase client created');

    // Test usage limit check
    console.log('🔍 Testing usage limit check...');
    const apiLimitCheck = await checkUsageLimitNew(supabase, 'api_calls');
    console.log('✅ Usage limit check result:', apiLimitCheck);

    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required', debug: 'missing_eventId' });
    }

    console.log('🔍 Querying events table...');
    // Test event data fetch
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    console.log('📊 Event query result:', { eventData, eventError });

    if (eventError || !eventData) {
      return res.status(404).json({ 
        error: 'Event not found', 
        debug: { eventError, hasEventData: !!eventData } 
      });
    }

    console.log('🔍 Querying songs table...');
    // Test songs data fetch
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, dj_name, timestamp')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    console.log('📊 Songs query result:', { songsCount: songsData?.length, songsError });

    if (songsError) {
      console.error('Songs fetch failed:', songsError);
      return res.status(500).json({ 
        error: 'Songs fetch failed', 
        debug: { songsError } 
      });
    }

    // Success response
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
      },
      debug: {
        success: true,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Returning success response');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Debug event-get error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      debug: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}