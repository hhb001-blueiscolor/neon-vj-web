// Netlify Functions: Event Data Retrieval API
// Route: /.netlify/functions/event-get?eventId={eventId}
const { createSupabaseClient } = require('./supabase-config');

exports.handler = async (event, context) => {
  // CORS handling
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const supabase = createSupabaseClient();
    
    // Phase 1: リクエスト検証
    const eventId = event.queryStringParameters?.eventId;
    
    if (!eventId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameter: eventId'
        })
      };
    }

    // Phase 2: イベント情報取得
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Event not found' })
      };
    }

    // 期限チェック
    const expiresAt = new Date(eventData.expires_at);
    if (expiresAt < new Date()) {
      // 期限切れイベントを非活性化
      await supabase
        .from('events')
        .update({ is_active: false })
        .eq('id', eventId);
        
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Event has expired' })
      };
    }

    // Phase 3: 楽曲リスト取得
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (songsError) {
      console.error('Songs fetch failed:', songsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch songs' })
      };
    }

    // Phase 4: 成功レスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        event: {
          id: eventData.id,
          name: eventData.name,
          eventURL: eventData.event_url,
          djDisplayMode: eventData.dj_display_mode,
          createdAt: eventData.created_at,
          expiresAt: eventData.expires_at
        },
        songs: songsData.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          djName: song.dj_name,
          createdAt: song.created_at
        })),
        totalSongs: songsData.length
      })
    };

  } catch (error) {
    console.error('Event retrieval error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};