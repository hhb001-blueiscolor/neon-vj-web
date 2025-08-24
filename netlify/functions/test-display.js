// Webページテスト専用API - 固定データ返却
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 固定テストデータを返却
  const testData = {
    event: {
      id: "test123",
      name: "WEB表示テスト",
      event_url: "",
      dj_display_mode: "chronological",
      device_id: "test-device",
      created_at: "2025-08-24T06:00:00.000Z",
      expires_at: "2025-09-24T06:00:00.000Z",
      is_active: true
    },
    songs: [
      {
        title: "テスト楽曲1",
        artist: "テストアーティスト1", 
        dj_name: "DJ Test",
        timestamp: "2025-08-24T06:01:00.000Z"
      },
      {
        title: "テスト楽曲2",
        artist: "テストアーティスト2",
        dj_name: "DJ Test",
        timestamp: "2025-08-24T06:02:00.000Z"
      }
    ],
    meta: {
      total_songs: 2,
      last_updated: "2025-08-24T06:02:00.000Z",
      debug_info: {
        source: "FIXED_TEST_DISPLAY_API",
        test_mode: true
      }
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(testData)
  };
};