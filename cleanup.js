#!/usr/bin/env node

/**
 * 30日以上前のイベントJSONファイルを削除するスクリプト
 * GitHub Actionsから毎日自動実行される
 */

const fs = require('fs');
const path = require('path');

const EVENTS_DIR = './data/events';
const MAX_AGE_DAYS = 30;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function cleanupOldEvents() {
    console.log(`🧹 Starting cleanup (removing events older than ${MAX_AGE_DAYS} days)...`);
    
    if (!fs.existsSync(EVENTS_DIR)) {
        console.log('Events directory not found. Nothing to clean.');
        return;
    }
    
    const now = Date.now();
    let deletedCount = 0;
    let keptCount = 0;
    
    const files = fs.readdirSync(EVENTS_DIR);
    
    files.forEach(filename => {
        if (!filename.endsWith('.json')) return;
        
        const filepath = path.join(EVENTS_DIR, filename);
        
        try {
            // JSONファイルを読み込み
            const content = fs.readFileSync(filepath, 'utf8');
            const data = JSON.parse(content);
            
            // 作成日時を確認
            const createdAt = data.event?.created_at;
            if (!createdAt) {
                console.log(`⚠️  ${filename}: No created_at field, keeping file`);
                keptCount++;
                return;
            }
            
            // 経過時間を計算
            const age = now - new Date(createdAt).getTime();
            const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));
            
            if (age > MAX_AGE_MS) {
                // 30日以上経過 → 削除
                fs.unlinkSync(filepath);
                console.log(`🗑️  Deleted: ${filename} (${ageDays} days old)`);
                deletedCount++;
            } else {
                // まだ期限内 → 保持
                console.log(`✅ Kept: ${filename} (${ageDays} days old)`);
                keptCount++;
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${filename}:`, error.message);
        }
    });
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   - Deleted: ${deletedCount} events`);
    console.log(`   - Kept: ${keptCount} events`);
    console.log(`   - Total processed: ${deletedCount + keptCount} files`);
}

// 実行
cleanupOldEvents();