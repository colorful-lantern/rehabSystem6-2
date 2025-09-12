// 自主トレーニング機能テスト用スクリプト
// ブラウザのコンソールで実行してテストできます

// テスト関数群
const SelfTrainingTest = {
    // 基本設定テスト
    testBasicConfig: function() {
        console.log('=== 基本設定テスト ===');
        console.log('SELF_TRAINING_CONFIG:', SELF_TRAINING_CONFIG);
        console.log('REHAB_IDS:', REHAB_IDS);
        console.log('自主トレーニング用ID:', REHAB_IDS[4]);
        
        if (REHAB_IDS[4] === 'each4' && SELF_TRAINING_CONFIG.REHAB_KEY === 'rehabilitation5') {
            console.log('✅ 基本設定正常');
            return true;
        } else {
            console.log('❌ 基本設定エラー');
            return false;
        }
    },
    
    // 設定管理テスト
    testSettings: function() {
        console.log('=== 設定管理テスト ===');
        
        // デフォルト設定確認
        console.log('デフォルトポイント設定:', SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS);
        
        // 設定変更テスト
        SelfTrainingSettings.setIncludeInPoints(true);
        console.log('設定変更後:', SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS);
        
        // 設定保存・読み込みテスト
        SelfTrainingSettings.saveSettings();
        SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS = false; // 一時的に変更
        SelfTrainingSettings.loadSettings();
        console.log('設定読み込み後:', SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS);
        
        // 設定リセット
        SelfTrainingSettings.resetSettings();
        console.log('リセット後:', SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS);
        
        console.log('✅ 設定管理テスト完了');
        return true;
    },
    
    // データ管理テスト
    testDataManagement: function() {
        console.log('=== データ管理テスト ===');
        
        const testDate = '2025-09-12';
        const testText = 'テスト用の自主トレーニング内容です。今日は30分間のストレッチを行いました。';
        
        // 記録保存テスト
        const saveResult = SelfTrainingManager.saveRecord(testDate, testText);
        console.log('記録保存結果:', saveResult);
        
        // 記録確認テスト
        const hasRecord = SelfTrainingManager.hasRecord(testDate);
        console.log('記録存在確認:', hasRecord);
        
        // テキスト取得テスト
        const retrievedText = SelfTrainingManager.getTextContent(testDate);
        console.log('取得テキスト:', retrievedText);
        
        // データサイズ確認
        const dataSize = SelfTrainingManager.getDataSize();
        console.log('データサイズ:', dataSize, 'bytes');
        
        // 削除テスト
        const deleteResult = SelfTrainingManager.deleteRecord(testDate);
        console.log('削除結果:', deleteResult);
        
        // 削除後確認
        const hasRecordAfterDelete = SelfTrainingManager.hasRecord(testDate);
        console.log('削除後の記録確認:', hasRecordAfterDelete);
        
        if (saveResult && hasRecord && retrievedText === testText && deleteResult && !hasRecordAfterDelete) {
            console.log('✅ データ管理テスト正常');
            return true;
        } else {
            console.log('❌ データ管理テストエラー');
            return false;
        }
    },
    
    // URLパラメータテスト用ヘルパー
    testUrlParam: function() {
        console.log('=== URLパラメータテスト用情報 ===');
        console.log('自主トレーニング有効化URL: ' + window.location.origin + window.location.pathname + '?each4=true');
        console.log('自主トレーニング削除URL: ' + window.location.origin + window.location.pathname + '?each4=false');
        console.log('※ 実際のテストは上記URLにアクセスして確認してください');
    },
    
    // ストレージ状況確認
    checkStorage: function() {
        console.log('=== ストレージ状況確認 ===');
        
        let selfTrainingData = {
            records: [],
            texts: [],
            settings: null
        };
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('selfrec_')) {
                selfTrainingData.records.push(key);
            } else if (key.startsWith('selftext_')) {
                selfTrainingData.texts.push(key);
            } else if (key === 'selfTrainingSettings') {
                selfTrainingData.settings = localStorage.getItem(key);
            }
        });
        
        console.log('自主トレーニング記録:', selfTrainingData.records);
        console.log('自主トレーニングテキスト:', selfTrainingData.texts);
        console.log('自主トレーニング設定:', selfTrainingData.settings);
        console.log('each4の状態:', localStorage.getItem('each4'));
        console.log('rehabilitation5の状態:', localStorage.getItem('rehabilitation5'));
        
        return selfTrainingData;
    },
    
    // 全テスト実行
    runAllTests: function() {
        console.log('🧪 自主トレーニング機能テスト開始');
        
        const results = {
            basicConfig: this.testBasicConfig(),
            settings: this.testSettings(),
            dataManagement: this.testDataManagement()
        };
        
        this.testUrlParam();
        this.checkStorage();
        
        const allPassed = Object.values(results).every(result => result);
        
        console.log('=== テスト結果 ===');
        console.log('基本設定:', results.basicConfig ? '✅' : '❌');
        console.log('設定管理:', results.settings ? '✅' : '❌');
        console.log('データ管理:', results.dataManagement ? '✅' : '❌');
        console.log('総合結果:', allPassed ? '✅ 全テスト通過' : '❌ 一部テスト失敗');
        
        return results;
    }
};

// テスト実行方法をコンソールに表示
console.log('📋 自主トレーニング機能テスト');
console.log('以下のコマンドでテストを実行できます:');
console.log('SelfTrainingTest.runAllTests() - 全テスト実行');
console.log('SelfTrainingTest.testBasicConfig() - 基本設定テスト');
console.log('SelfTrainingTest.testSettings() - 設定管理テスト');
console.log('SelfTrainingTest.testDataManagement() - データ管理テスト');
console.log('SelfTrainingTest.checkStorage() - ストレージ状況確認');
