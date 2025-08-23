// Netlify Functions: Event Creation API
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
  checkUsageLimit,
  cleanupExpiredEvents 
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
    const eventLimitCheck = await checkUsageLimit(supabase, 'events_created');

    if (!apiLimitCheck.allowed || !eventLimitCheck.allowed) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Usage limit exceeded',
          details: {
            api_calls: apiLimitCheck,
            events_created: eventLimitCheck
          }
        })
      };
    }

    // 90%警告チェック
    if (apiLimitCheck.warning_triggered || eventLimitCheck.warning_triggered) {
      console.warn('Usage approaching limit:', {
        api_calls: apiLimitCheck,
        events_created: eventLimitCheck
      });
    }

    // Phase 2: リクエスト検証
    const requestBody = JSON.parse(event.body || '{}');
    const { eventName, eventURL, djDisplayMode, deviceId } = requestBody;

    if (!eventName || !deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Phase 3: 期限切れイベントクリーンアップ
    await cleanupExpiredEvents(supabase);

    // Phase 4: イベント作成
    const eventId = generateEventId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          id: eventId,
          name: eventName,
          event_url: eventURL || "",
          dj_display_mode: djDisplayMode || "chronological", 
          device_id: deviceId,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Event creation failed:', error);
      await incrementUsageCounter(supabase, 'api_calls');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Event creation failed' })
      };
    }

    // Phase 5: 使用量カウンター更新
    await Promise.all([
      incrementUsageCounter(supabase, 'api_calls'),
      incrementUsageCounter(supabase, 'events_created')
    ]);

    // Phase 6: 成功レスポンス
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        eventId: eventId,
        eventURL: `https://web.neondjneon.com/live.html?event=${eventId}`,
        event: data[0],
        usage: {
          api_calls: apiLimitCheck,
          events_created: eventLimitCheck
        }
      })
    };

  } catch (error) {
    console.error('Event creation error:', error);
    
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

function generateEventId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 8;
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}