// Netlify Functions: Song Addition API
// Route: /.netlify/functions/event-songs?eventId={eventId}
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
  checkUsageLimit 
} = require('./supabase-config');

exports.handler = async (event, context) => {
  // CORS handling
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const supabase = createSupabaseClient();
    
    // Phase 1: 制限チェック（90%制限での拒否）
    const apiLimitCheck = await checkUsageLimit(supabase, 'api_calls');
    const songLimitCheck = await checkUsageLimit(supabase, 'songs_added');

    if (!apiLimitCheck.allowed || !songLimitCheck.allowed) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Usage limit exceeded',
          details: {
            api_calls: apiLimitCheck,
            songs_added: songLimitCheck
          }
        })
      };
    }

    // 90%警告チェック
    if (apiLimitCheck.warning_triggered || songLimitCheck.warning_triggered) {
      console.warn('Usage approaching limit:', {
        api_calls: apiLimitCheck,
        songs_added: songLimitCheck
      });
    }

    // Phase 2: リクエスト検証（NetlifyではqueryStringParametersからeventIdを取得）
    const eventId = event.queryStringParameters?.eventId;
    const requestBody = JSON.parse(event.body || '{}');
    const { title, artist, djName, deviceId } = requestBody;

    if (!eventId || !title || !artist || !deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['eventId (from query)', 'title', 'artist', 'deviceId']
        })
      };
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
        
      await incrementUsageCounter(supabase, 'api_calls');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Event has expired' })
      };
    }

    // デバイス認証
    if (eventData.device_id !== deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Song addition failed' })
      };
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
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        song: songData[0],
        totalSongs: totalSongs || 0,
        eventName: eventData.name,
        usage: {
          api_calls: apiLimitCheck,
          songs_added: songLimitCheck
        }
      })
    };

  } catch (error) {
    console.error('Song addition error:', error);
    
    // エラー時も使用量カウンター更新
    try {
      const supabase = createSupabaseClient();
      await incrementUsageCounter(supabase, 'api_calls');
    } catch (counterError) {
      console.error('Counter update failed:', counterError);
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};