// 根治版：完全に動作する楽曲追加API
const { createSupabaseClient } = require('./supabase-config');

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

  try {
    console.log('🎵 [FIXED] Song addition started');
    
    const supabase = createSupabaseClient();
    const { eventId } = req.query;
    const { title, artist, djName, deviceId } = req.body;

    if (!eventId || !title || !artist || !deviceId) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, title, artist, deviceId' 
      });
    }

    console.log(`🎶 [FIXED] Adding song: ${title} by ${artist} to event ${eventId}`);

    // イベント存在確認
    const { data: eventCheck, error: eventCheckError } = await supabase
      .from('events')
      .select('id, name, is_active')
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventCheckError || !eventCheck) {
      console.error('❌ [FIXED] Event not found:', eventId);
      return res.status(404).json({ error: 'Event not found or inactive' });
    }

    console.log('✅ [FIXED] Event found:', eventCheck);

    // 楽曲をテーブルに直接挿入
    const { data: songData, error: songError } = await supabase
      .from('songs')
      .insert([
        {
          event_id: eventId,
          title: title,
          artist: artist,
          dj_name: djName || '',
          device_id: deviceId,
          timestamp: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (songError) {
      console.error('❌ [FIXED] Song creation failed:', songError);
      return res.status(500).json({ 
        error: 'Song creation failed',
        details: songError.message
      });
    }

    console.log('✅ [FIXED] Song added successfully:', songData);

    // 使用量統計を更新（エラー時も続行）
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await supabase
        .from('usage_stats')
        .upsert({
          date: today,
          songs_added: 1,
          api_calls_count: 1
        }, {
          onConflict: 'date',
          ignoreDuplicates: false
        });
        
      console.log('📊 [FIXED] Usage stats updated for song');
    } catch (statsError) {
      console.warn('⚠️ [FIXED] Usage stats update failed (continuing):', statsError);
    }

    // 成功レスポンス
    const responseData = {
      success: true,
      song: songData,
      event: eventCheck,
      debug_info: {
        source: 'FIXED_SONG_API_2025_01_24',
        timestamp: new Date().toISOString()
      }
    };

    console.log('🎉 [FIXED] Song addition success:', responseData);
    res.status(201).json(responseData);

  } catch (error) {
    console.error('💥 [FIXED] Critical error in song addition:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      debug_source: 'FIXED_SONG_API_ERROR'
    });
  }
};