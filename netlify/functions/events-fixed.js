// 根治版：完全に動作するイベント作成API (Netlify Functions形式)
const { createSupabaseClient } = require('./supabase-config');

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
    console.log('🚀 [FIXED] Event creation started');
    
    const supabase = createSupabaseClient();
    const { eventName, eventURL, djDisplayMode, deviceId } = JSON.parse(event.body);

    if (!eventName || !deviceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: eventName and deviceId' })
      };
    }

    // イベントID生成
    const eventId = generateEventId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    console.log(`📝 [FIXED] Creating event: ${eventId} - ${eventName}`);

    // 直接テーブルにイベント挿入（RPC関数を使用しない）
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert([
        {
          id: eventId,
          name: eventName,
          event_url: eventURL || "",
          dj_display_mode: djDisplayMode || "chronological", 
          device_id: deviceId,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_at: now.toISOString()
        }
      ])
      .select()
      .single();

    if (eventError) {
      console.error('❌ [FIXED] Event creation failed:', eventError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Event creation failed',
          details: eventError.message
        })
      };
    }

    console.log('✅ [FIXED] Event created successfully:', eventData);

    // 使用量統計を更新（エラー時も続行）
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // usage_stats テーブルに直接upsert
      await supabase
        .from('usage_stats')
        .upsert({
          date: today,
          events_created: 1,
          api_calls_count: 1
        }, {
          onConflict: 'date',
          ignoreDuplicates: false
        });
        
      console.log('📊 [FIXED] Usage stats updated');
    } catch (statsError) {
      console.warn('⚠️ [FIXED] Usage stats update failed (continuing):', statsError);
    }

    // 成功レスポンス
    const responseData = {
      success: true,
      eventId: eventId,
      eventURL: `https://web.neondjneon.com/live.html?event=${eventId}`,
      event: eventData,
      debug_info: {
        source: 'FIXED_API_NETLIFY_2025_01_24',
        timestamp: new Date().toISOString(),
        event_count: 1
      }
    };

    console.log('🎉 [FIXED] Success response:', responseData);
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('💥 [FIXED] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        debug_source: 'FIXED_API_NETLIFY_ERROR'
      })
    };
  }
}

function generateEventId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 8;
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}