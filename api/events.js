// Supabase Event Creation API with Usage Monitoring
const { 
  createSupabaseClient, 
  incrementUsageCounter, 
  checkUsageLimit,
  cleanupExpiredEvents 
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
    const apiLimitCheck = await checkUsageLimit(supabase, 'api_calls');
    const eventLimitCheck = await checkUsageLimit(supabase, 'events_created');

    if (!eventLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Monthly usage limit exceeded',
        details: {
          events_created: eventLimitCheck
        }
      });
    }

    // 90%警告チェック
    if (eventLimitCheck.warning_triggered) {
      console.warn('Monthly usage approaching limit:', {
        events_created: eventLimitCheck
      });
    }

    // Phase 2: リクエスト検証
    const { eventName, eventURL, djDisplayMode, deviceId } = req.body;

    if (!eventName || !deviceId) {
      await incrementUsageCounter(supabase, 'api_calls');
      return res.status(400).json({ error: 'Missing required fields' });
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
      return res.status(500).json({ error: 'Event creation failed' });
    }

    // Phase 5: 使用量カウンター更新
    await Promise.all([
      incrementUsageCounter(supabase, 'api_calls'),
      incrementUsageCounter(supabase, 'events_created')
    ]);

    // Phase 6: 成功レスポンス
    res.status(201).json({
      success: true,
      eventId: eventId,
      eventURL: `https://web.neondjneon.com/live.html?event=${eventId}`,
      event: data[0],
      usage: {
        api_calls: apiLimitCheck,
        events_created: eventLimitCheck
      }
    });

  } catch (error) {
    console.error('Event creation error:', error);
    
    // エラー時も使用量カウンター更新
    try {
      await incrementUsageCounter(supabase, 'api_calls');
    } catch (counterError) {
      console.error('Counter update failed:', counterError);
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateEventId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 8;
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}