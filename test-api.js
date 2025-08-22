// Supabase API Test Script
// 使用方法: node test-api.js

const https = require('https');

// テスト設定
const API_BASE_URL = 'https://web.neondjneon.com/api';  // 本番環境
// const API_BASE_URL = 'http://localhost:3000/api';    // ローカル環境

const TEST_CONFIG = {
    testEventName: "Test Event " + new Date().toISOString(),
    testDeviceId: "test-device-" + Math.random().toString(36).substr(2, 9),
    testSong: {
        title: "Test Song",
        artist: "Test Artist",
        djName: "Test DJ"
    }
};

// API呼び出しヘルパー
async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE_URL + endpoint);
        
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const client = url.protocol === 'https:' ? https : require('http');
        const req = client.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonResponse,
                        headers: res.headers
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData,
                        headers: res.headers,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// テスト関数群
async function testUsageCheck() {
    console.log('\n=== 使用量チェックテスト ===');
    
    const limitTypes = ['api_calls', 'events_created', 'songs_added', 'data_retrieved'];
    
    for (const type of limitTypes) {
        try {
            const response = await callAPI(`/usage/check?type=${type}`);
            console.log(`${type}: ${response.statusCode === 200 ? '✅' : '❌'} (${response.statusCode})`);
            
            if (response.statusCode === 200) {
                const usage = response.data;
                console.log(`  月間使用量: ${usage.monthly_usage}/${usage.monthly_limit} (${(usage.monthly_usage/usage.monthly_limit*100).toFixed(1)}%)`);
                console.log(`  制限状態: ${usage.allowed ? '許可' : '制限中'}`);
                console.log(`  警告: ${usage.warning_triggered ? 'あり' : 'なし'}`);
            } else {
                console.log(`  エラー: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.log(`${type}: ❌ エラー - ${error.message}`);
        }
    }
}

async function testEventCreation() {
    console.log('\n=== イベント作成テスト ===');
    
    try {
        const eventData = {
            eventName: TEST_CONFIG.testEventName,
            eventURL: "https://example.com/test-event",
            djDisplayMode: "chronological",
            deviceId: TEST_CONFIG.testDeviceId
        };
        
        const response = await callAPI('/events', 'POST', eventData);
        console.log(`イベント作成: ${response.statusCode === 201 ? '✅' : '❌'} (${response.statusCode})`);
        
        if (response.statusCode === 201) {
            const result = response.data;
            console.log(`  イベントID: ${result.eventId}`);
            console.log(`  URL: ${result.eventURL}`);
            console.log(`  使用量: API=${result.usage?.api_calls?.monthly_usage}, イベント=${result.usage?.events_created?.monthly_usage}`);
            return result.eventId;
        } else {
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
            return null;
        }
    } catch (error) {
        console.log(`イベント作成: ❌ エラー - ${error.message}`);
        return null;
    }
}

async function testSongAddition(eventId) {
    if (!eventId) {
        console.log('\n=== 楽曲追加テスト ===');
        console.log('楽曲追加: ❌ イベントIDが必要');
        return;
    }
    
    console.log('\n=== 楽曲追加テスト ===');
    
    try {
        const songData = {
            title: TEST_CONFIG.testSong.title,
            artist: TEST_CONFIG.testSong.artist,
            djName: TEST_CONFIG.testSong.djName,
            deviceId: TEST_CONFIG.testDeviceId
        };
        
        const response = await callAPI(`/events/${eventId}/songs`, 'POST', songData);
        console.log(`楽曲追加: ${response.statusCode === 201 ? '✅' : '❌'} (${response.statusCode})`);
        
        if (response.statusCode === 201) {
            const result = response.data;
            console.log(`  楽曲: ${result.song.title} / ${result.song.artist}`);
            console.log(`  DJ: ${result.song.dj_name}`);
            console.log(`  総楽曲数: ${result.totalSongs}`);
            console.log(`  使用量: API=${result.usage?.api_calls?.monthly_usage}, 楽曲=${result.usage?.songs_added?.monthly_usage}`);
        } else {
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        console.log(`楽曲追加: ❌ エラー - ${error.message}`);
    }
}

async function testEventRetrieval(eventId) {
    if (!eventId) {
        console.log('\n=== イベントデータ取得テスト ===');
        console.log('データ取得: ❌ イベントIDが必要');
        return;
    }
    
    console.log('\n=== イベントデータ取得テスト ===');
    
    try {
        const response = await callAPI(`/events/${eventId}`);
        console.log(`データ取得: ${response.statusCode === 200 ? '✅' : '❌'} (${response.statusCode})`);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log(`  イベント: ${result.event.name}`);
            console.log(`  楽曲数: ${result.songs.length}`);
            console.log(`  最新楽曲: ${result.songs[0]?.title || 'なし'} / ${result.songs[0]?.artist || ''}`);
            console.log(`  使用量: API=${result.usage?.api_calls?.monthly_usage}, データ=${result.usage?.data_retrieved?.monthly_usage}`);
        } else {
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        console.log(`データ取得: ❌ エラー - ${error.message}`);
    }
}

async function testInvalidRequests() {
    console.log('\n=== 無効リクエストテスト ===');
    
    // 無効な制限タイプ
    try {
        const response = await callAPI('/usage/check?type=invalid_type');
        console.log(`無効制限タイプ: ${response.statusCode === 400 ? '✅' : '❌'} (${response.statusCode})`);
    } catch (error) {
        console.log(`無効制限タイプ: ❌ エラー - ${error.message}`);
    }
    
    // 無効なイベント作成
    try {
        const response = await callAPI('/events', 'POST', { eventName: '' });
        console.log(`無効イベント作成: ${response.statusCode === 400 ? '✅' : '❌'} (${response.statusCode})`);
    } catch (error) {
        console.log(`無効イベント作成: ❌ エラー - ${error.message}`);
    }
    
    // 存在しないイベント取得
    try {
        const response = await callAPI('/events/nonexistent');
        console.log(`存在しないイベント: ${response.statusCode === 404 ? '✅' : '❌'} (${response.statusCode})`);
    } catch (error) {
        console.log(`存在しないイベント: ❌ エラー - ${error.message}`);
    }
}

// メイン実行
async function runTests() {
    console.log('🧪 Supabase API テスト開始');
    console.log(`📡 API Base URL: ${API_BASE_URL}`);
    console.log(`🔧 テスト設定:`);
    console.log(`   イベント名: ${TEST_CONFIG.testEventName}`);
    console.log(`   デバイスID: ${TEST_CONFIG.testDeviceId}`);
    
    try {
        // Phase 1: 使用量チェック
        await testUsageCheck();
        
        // Phase 2: イベント作成
        const eventId = await testEventCreation();
        
        // Phase 3: 楽曲追加
        await testSongAddition(eventId);
        
        // Phase 4: データ取得
        await testEventRetrieval(eventId);
        
        // Phase 5: 無効リクエスト
        await testInvalidRequests();
        
        console.log('\n✅ すべてのテストが完了しました');
        
    } catch (error) {
        console.error('\n❌ テスト実行中にエラーが発生:', error);
    }
}

// 実行
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testUsageCheck,
    testEventCreation,
    testSongAddition,
    testEventRetrieval,
    testInvalidRequests
};