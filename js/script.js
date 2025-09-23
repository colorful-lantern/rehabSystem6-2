// progressbar.js@1.0.0 version is used
// Docs: http://progressbarjs.readthedocs.org/en/1.0.0/

// comments
// 2025/06/25 update -- you can delete the rehabilitation record by URL parameter each0~3=false

// grobal variables
window.numberOfClass = 0;
window.nowClass = 0;

// **チカチカ防止: 表示状態管理フラグ**
window.DisplayState = {
    consecutiveMessageShown: false,
    milestoneMessageShown: false,
    isInitializing: false,
    
    reset() {
        this.consecutiveMessageShown = false;
        this.milestoneMessageShown = false;
        this.isInitializing = false;
    }
};

// **フェーズ4: パフォーマンス最適化 - LocalStorageキャッシュ**
window.StorageCache = {
    cache: new Map(),
    expiryTime: 5 * 60 * 1000, // 5分間のキャッシュ
    
    get(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.expiryTime) {
            return cached.value;
        }
        
        const value = localStorage.getItem(key);
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
        return value;
    },
    
    set(key, value) {
        localStorage.setItem(key, value);
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    },
    
    clear() {
        this.cache.clear();
    },
    
    invalidate(key) {
        this.cache.delete(key);
    }
};

// **カウンター管理機能（URLパラメータ処理より前に定義）**
window.RehabCounterManager = {
    // カウンターを取得（デフォルト0）
    getCount: function(rehabIndex) {
        const countKey = `each${rehabIndex}_count`;
        return parseInt(localStorage.getItem(countKey) || '0');
    },
    
    // カウンターを設定
    setCount: function(rehabIndex, count) {
        const countKey = `each${rehabIndex}_count`;
        localStorage.setItem(countKey, count.toString());
    },
    
    // カウンターを増加
    incrementCount: function(rehabIndex) {
        const currentCount = this.getCount(rehabIndex);
        this.setCount(rehabIndex, currentCount + 1);
        return currentCount + 1;
    },
    
    // カウンターをリセット（0に設定）
    resetCount: function(rehabIndex) {
        this.setCount(rehabIndex, 0);
    },
    
    // カウンターを削除
    removeCount: function(rehabIndex) {
        const countKey = `each${rehabIndex}_count`;
        localStorage.removeItem(countKey);
    },
    
    // 指定リハビリが実施済みかチェック（予約個数 = 実行個数で完了扱い）
    isCompleted: function(rehabIndex) {
        const actualCount = this.getCount(rehabIndex);
        const reservedCount = this.getReservedCount(rehabIndex);
        return actualCount >= reservedCount && reservedCount > 0;
    },
    
    // 指定リハビリの予約個数を取得
    getReservedCount: function(rehabIndex) {
        const today = new Date().toISOString().split('T')[0];
        const reserveKey = `reserve_${today}`;
        const reserveValue = localStorage.getItem(reserveKey);
        
        if (!reserveValue) return 0;
        
        const items = reserveValue.split(',');
        for (const item of items) {
            const match = item.match(/^each(\d)=(\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                const val = parseInt(match[2], 10);
                if (idx === rehabIndex) {
                    return val;
                }
            }
        }
        return 0;
    },
    
    // すべてのカウンターをリセット（日付変更時用）
    resetAllCounts: function() {
        for (let i = 0; i <= 3; i++) {
            this.resetCount(i);
        }
    },
    
    // デバッグ用: 現在の状態を表示
    debugStatus: function() {
        console.log('=== RehabCounterManager Status ===');
        for (let i = 0; i <= 3; i++) {
            const count = this.getCount(i);
            const completed = this.isCompleted(i);
            console.log(`each${i}: count=${count}, completed=${completed}`);
        }
    }
};

// Query parameters are saved to local storage as key-value pairs.
function saveQueryParamsToLocalStorage() {
    const params = new URLSearchParams(location.search);
    params.forEach((value, key) => localStorage.setItem(key, decodeURIComponent(value)));
}
saveQueryParamsToLocalStorage();

// URLパラメータのeach0-4=trueでリハビリデータを設定
(function handleEachParamsFromUrl() {
    // 短時間アクセスが検出された場合は処理を停止
    if (window.shortTimeAccessDetected) {
        console.log('Short time access detected - skipping URL parameter processing');
        return;
    }
    
    const params = new URLSearchParams(location.search);
    
    for (let i = 0; i <= 4; i++) { // 0-4に拡張（自主トレーニング対応）
        const eachKey = `each${i}`;
        const paramValue = params.get(eachKey);
        
        if (paramValue === 'true') {
            // 今日が休日設定されている場合、自動的に取り組み日に変更
            const today = new Date().toISOString().split('T')[0];
            if (RestDayManager && RestDayManager.isRestDay(today)) {
                RestDayManager.removeRestDay(today);
            }
            
            // 自主トレーニング（each4）の特別処理
            if (i === 4) {
                const rehabKey = SELF_TRAINING_CONFIG.REHAB_KEY;
                const isRehabEnabled = localStorage.getItem(rehabKey) === 'true';
                
                if (isRehabEnabled) {
                    localStorage.setItem(eachKey, 'true');
                } else {
                    // 設定されていない場合はモーダルで確認
                    showRehabilitationRegistrationModal('自主トレーニング', rehabKey, eachKey);
                }
            } else {
                // 従来の4項目の処理（カウンター方式対応）
                const rehabKey = `rehabilitation${i + 1}`;
                const isRehabEnabled = localStorage.getItem(rehabKey) === 'true';
                
                if (isRehabEnabled) {
                    // カウンター方式で記録
                    const newCount = RehabCounterManager.incrementCount(i);
                    console.log(`リハビリ記録: each${i} のカウントを ${newCount} に増加`);
                } else {
                    // 設定されていないリハビリの場合、モーダルで確認
                    const rehabName = getRehabilitationName(i);
                    showRehabilitationRegistrationModal(rehabName, rehabKey, eachKey);
                }
            }
        } else if (paramValue === 'false') {
            // 削除処理
            if (i === 4) {
                // 自主トレーニングの削除
                if (localStorage.getItem(SELF_TRAINING_CONFIG.REHAB_KEY) === 'true') {
                    alert('自主トレーニングの記録を削除します。');
                    localStorage.removeItem(eachKey);
                } else {
                    alert('自主トレーニングの記録はありません。');
                }
            } else {
                // 従来の4項目の削除処理（カウンター方式対応）
                const rehabKey = `rehabilitation${i + 1}`;
                if (localStorage.getItem(rehabKey) === 'true') {
                    const currentCount = RehabCounterManager.getCount(i);
                    if (currentCount > 0) {
                        var rehabName = '';
                        switch (i) {
                            case 0: rehabName = '理学療法'; break;
                            case 1: rehabName = '言語療法'; break;
                            case 2: rehabName = '作業療法'; break;
                            case 3: rehabName = '心理療法'; break;
                            default: rehabName = `未定義`;
                        }
                        alert(`${rehabName}の記録を削除します。(${currentCount}回 → 0回)`);
                        RehabCounterManager.resetCount(i);
                    } else {
                        alert('このリハビリの記録はありません。');
                    }
                } else {
                    alert('このリハビリの記録はありません。');
                }
            }
        }
    }
})();

// リハビリテーション名を取得するヘルパー関数
function getRehabilitationName(index) {
    switch (index) {
        case 0: return '理学療法';
        case 1: return '言語療法';
        case 2: return '作業療法';
        case 3: return '心理療法';
        case 4: return '自主トレーニング';
        default: return '未定義';
    }
}

// リハビリテーション登録確認モーダルを表示する関数
function showRehabilitationRegistrationModal(rehabName, rehabKey, eachKey) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('rehabRegistrationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダルHTMLを作成
    const modalHTML = `
        <div class="modal fade" id="rehabRegistrationModal" tabindex="-1" aria-labelledby="rehabRegistrationModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="rehabRegistrationModalLabel">登録確認</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>${rehabName}</strong>は現在、取り組むリハビリとして設定されていません。</p>
                        <p>このリハビリを新しく登録して、今日の記録を追加しますか？</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
                        <button type="button" class="btn btn-primary" id="confirmRegistration">登録して記録を追加</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // モーダルをページに追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // モーダルのイベントリスナーを設定
    const modal = document.getElementById('rehabRegistrationModal');
    const confirmBtn = document.getElementById('confirmRegistration');
    
    confirmBtn.addEventListener('click', function() {
        // リハビリテーションを有効化
        localStorage.setItem(rehabKey, 'true');
        
        // カウンター方式で記録（自主トレーニング以外）
        if (eachKey === 'each4') {
            // 自主トレーニングは従来通り
            localStorage.setItem(eachKey, 'true');
        } else {
            // each0-3はカウンター方式
            const rehabIndex = parseInt(eachKey.replace('each', ''));
            RehabCounterManager.incrementCount(rehabIndex);
            console.log(`新規登録でリハビリ記録: ${eachKey} のカウントを1に設定`);
        }
        
        // numberofClassを更新
        const currentNumberOfClass = parseInt(localStorage.getItem('numberofClass') || 0);
        localStorage.setItem('numberofClass', currentNumberOfClass + 1);
        
        // モーダルを閉じる
        const bootstrapModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
        bootstrapModal.hide();
        
        // ページをリロードして変更を反映
        setTimeout(() => {
            location.reload();
        }, 300);
    });

    // モーダルを表示
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // モーダルが閉じられた後にDOM要素を削除
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}

// 日付が変わった場合にlocalStorageの古いデータを削除する
(function clearOldDataOnNewDay() {
    const today = new Date().toISOString().split('T')[0];
    const lastAccessDate = localStorage.getItem('lastAccessDate');

    if (lastAccessDate !== today) {
        // 日付が変わった場合、each0~3と新形式のカウンターを削除
        for (let i = 0; i <= 3; i++) {
            localStorage.removeItem(`each${i}`); // 旧形式
            localStorage.removeItem(`each${i}_count`); // 新形式
        }

        // 1年以上前のデータを削除
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);
        const oneYearAgoString = oneYearAgo.toISOString().split('T')[0];

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('status_')) {
                const date = key.split('_')[1];
                if (date < oneYearAgoString) {
                    localStorage.removeItem(key);
                }
            }
        });

        localStorage.setItem('lastAccessDate', today);
    }
})();

// **新機能: カウンター方式へのマイグレーション機能**
(function migrateToCounterSystem() {
    // マイグレーション実行フラグをチェック
    const migrationKey = 'counter_migration_completed';
    if (localStorage.getItem(migrationKey) === 'true') {
        return; // 既にマイグレーション完了済み
    }
    
    console.log('カウンター方式へのマイグレーションを開始...');
    let migratedCount = 0;
    
    // each0-3の既存データをカウンター形式に変換
    for (let i = 0; i <= 3; i++) {
        const oldKey = `each${i}`;
        const countKey = `each${i}_count`;
        const oldValue = localStorage.getItem(oldKey);
        
        if (oldValue === 'true') {
            // 旧形式（boolean）を新形式（count）に変換
            localStorage.setItem(countKey, '1');
            localStorage.removeItem(oldKey);
            migratedCount++;
            console.log(`マイグレーション: ${oldKey}=true → ${countKey}=1`);
        } else if (oldValue === 'false') {
            // falseの場合はカウンター不要（デフォルト0）
            localStorage.removeItem(oldKey);
            console.log(`マイグレーション: ${oldKey}=false → 削除`);
        }
        // nullの場合は何もしない（未設定状態維持）
    }
    
    // ステータスデータのマイグレーション
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('status_')) {
            const statusValue = localStorage.getItem(key);
            if (statusValue && statusValue.includes('each') && statusValue.includes('=true')) {
                // 旧形式のステータスデータを新形式に変換
                const newStatusValue = migrateStatusData(statusValue);
                if (newStatusValue !== statusValue) {
                    localStorage.setItem(key, newStatusValue);
                    console.log(`ステータスマイグレーション: ${key}`);
                }
            }
        }
    });
    
    // マイグレーション完了フラグを設定
    localStorage.setItem(migrationKey, 'true');
    console.log(`マイグレーション完了: ${migratedCount}件のデータを変換`);
})();

// ステータスデータのマイグレーション用ヘルパー関数
function migrateStatusData(statusValue) {
    try {
        const parts = statusValue.split(',');
        const completionFlag = parts[0]; // "0" or "1"
        const newParts = [completionFlag];
        
        // each0=true形式を each0=1形式に変換
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=true')) {
                newParts.push(part.replace('=true', '=1'));
            } else if (part.includes('=false')) {
                newParts.push(part.replace('=false', '=0'));
            } else {
                newParts.push(part); // その他はそのまま
            }
        }
        
        return newParts.join(',');
    } catch (error) {
        console.error('ステータスデータマイグレーションエラー:', error);
        return statusValue; // エラー時は元の値を返す
    }
}

// localstrageのkey(each0~4)のカウンター値に基づいて取り組んだリハビリ個数の合計を計算し、localstrageのkey=nmboftrueに保存する
function saveTrueCountToLocalStorage() {
    let completedTypeCount = 0; // 完了した種類数（既存ロジック用）
    let totalRehabCount = 0; // 取り組んだリハビリの個数合計（新ロジック）
    let achievedStatus = [];
    
    // URLパラメータでeach0-3=trueのアクセスがあったかチェック
    const params = new URLSearchParams(location.search);
    let hasEachTrueParam = false;
    for (let i = 0; i <= 3; i++) {
        if (params.get(`each${i}`) === 'true') {
            hasEachTrueParam = true;
            break;
        }
    }
    
    // each0-4の全てを処理（自主リハビリのeach4も含む）
    for (let i = 0; i <= 4; i++) {
        let key = `each${i}`;
        const key2 = `rehabilitation${i + 1}`;
        const value2 = localStorage.getItem(key2);
        
        // 取り組むリハビリのみ記録
        if (value2 === 'true') {
            // カウンター方式で完了判定
            const isCompleted = RehabCounterManager.isCompleted(i);
            const actualCount = RehabCounterManager.getCount(i);
            const reservedCount = RehabCounterManager.getReservedCount(i);
            
            
            // 自主リハビリ（each4）の特別処理
            if (i === 4) {
                // 自主リハビリは selfrec_YYYY-MM-DD で記録状況を管理
                const today = new Date().toISOString().split('T')[0];
                const selfRecKey = `selfrec_${today}`;
                const hasSelfRecord = localStorage.getItem(selfRecKey) === 'true';
                
                if (hasSelfRecord) {
                    // 記録済みの場合は予約個数分を加算
                    totalRehabCount += reservedCount;
                    console.log(`${key} (自主リハビリ): recorded=true, reserved=${reservedCount}, added=${reservedCount}`);
                    // 自主リハビリの完了扱い
                    completedTypeCount++;
                    achievedStatus.push(`${key}=${reservedCount}`);
                } else {
                    console.log(`${key} (自主リハビリ): recorded=false, added=0`);
                    achievedStatus.push(`${key}=0`);
                }
            } else {
                // 通常のリハビリ処理
                // 完了種類数のカウント（既存ロジック用）
                if (isCompleted) {
                    completedTypeCount++;
                }
                
                // 取り組んだ個数の計算（予約個数上限あり）
                const countToAdd = Math.min(actualCount, reservedCount);
                totalRehabCount += countToAdd;
                
                console.log(`${key}: actual=${actualCount}, reserved=${reservedCount}, added=${countToAdd}`);
                
                // 完了状況に関わらず実際の実行回数を記録
                achievedStatus.push(`${key}=${actualCount}`);
            }
            
            // 旧形式との互換性維持（URLパラメータアクセス時の初期値設定）
            const oldValue = localStorage.getItem(key);
            if (oldValue === null && hasEachTrueParam && !isCompleted) {
                // 既に実際の count が記録されているので、ここでは何もしない
            }
        }
    }
    
    // 新ロジック: 取り組んだリハビリの個数合計をnmboftrueに保存
    localStorage.setItem('nmboftrue', totalRehabCount);
    nowClass = totalRehabCount;
    
    console.log(`nmboftrue updated: completedTypes=${completedTypeCount}, totalRehabCount=${totalRehabCount}`);

    // 日付ごとの達成状況を保存（データが存在する場合のみ）
    // ステータス保存処理（改善版）
    const today = new Date().toISOString().split('T')[0];
    
    // 有効なリハビリ数を動的に計算
    let totalActiveRehabilitations = 0;
    for (let i = 1; i <= 4; i++) {
        const rehabKey = `rehabilitation${i}`;
        if (localStorage.getItem(rehabKey) === 'true') {
            totalActiveRehabilitations++;
        }
    }
    
    // numberofClassはcheckReserve.jsで既に設定されているため、ここでは更新しない
    // checkReserve.jsで予約個数の合計が正しく設定されているので、それを維持する

    // 取り組むリハビリが設定されている場合は必ずステータスを保存
    if (totalActiveRehabilitations > 0) {
        let statusValue = '';
        
        // 新ポイントシステム: 取り組んだ個数 = 予約個数で全達成
        const numberOfClass = parseInt(localStorage.getItem('numberofClass') || '0');
        const isFullyCompleted = totalRehabCount >= numberOfClass && numberOfClass > 0;
        
        if (isFullyCompleted) {
            statusValue = '1'; // 全達成で1ポイント
            console.log(`達成判定: ${totalRehabCount}/${numberOfClass} = 全達成！1ポイント獲得`);
        } else {
            statusValue = '0'; // 未達成は0ポイント
            console.log(`達成判定: ${totalRehabCount}/${numberOfClass} = 未達成、0ポイント`);
        }
        
        // achievedStatusが空でも、取り組むリハビリがある場合はステータスを保存
        if (achievedStatus.length > 0) {
            statusValue += ',' + achievedStatus.join(',');
        } else {
            // achievedStatusが空でも基本ステータスは保存
            statusValue += ',no_data';
        }
        
        localStorage.setItem(`status_${today}`, statusValue);
        console.log(`ステータス保存: ${today} = ${statusValue} (完了種類:${completedTypeCount}/${totalActiveRehabilitations}, 合計実行:${totalRehabCount}/${numberOfClass})`);
        
        // totalrehabを再計算（全ステータスファイルから1ポイントの日数を合計）
        updateTotalRehab();
        
        // 連続記録キャッシュをクリア（再計算を促す）
        const cacheKey = `consecutive_cache_${today}`;
        localStorage.removeItem(cacheKey);
        if (typeof StorageCache !== 'undefined' && StorageCache.cache) {
            StorageCache.cache.delete(cacheKey);
        }
        console.log(`連続記録キャッシュをクリア: ${cacheKey}`);
        
    } else {
        console.warn('リハビリが設定されていないため、ステータスは保存されません');
    }
    
    // プログレスバーの更新
    updateProgressBar();
}

// プログレスバー更新関数
function updateProgressBar() {
    const container = document.getElementById('container');
    if (container && typeof bar !== 'undefined' && bar) {
        const animate = Math.min(nowClass / numberOfClass, 1);
        console.log(`プログレスバー更新: ${nowClass}/${numberOfClass} = ${animate}`);
        bar.animate(animate);
        
        // 達成時の紙吹雪アニメーション
        if (nowClass >= numberOfClass && numberOfClass > 0) {
            console.log('達成！紙吹雪アニメーション開始');
            // 紙吹雪アニメーションがあれば実行
            if (typeof triggerConfetti === 'function') {
                triggerConfetti();
            }
        }
    }
}

// totalrehabを再計算する関数
function updateTotalRehab() {
    let totalPoints = 0;
    
    // localStorage内の全てのstatus_キーを検索
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('status_')) {
            const statusValue = localStorage.getItem(key);
            if (statusValue) {
                // status値の先頭の数字（ポイント）を取得
                const pointValue = parseInt(statusValue.split(',')[0], 10);
                if (!isNaN(pointValue)) {
                    totalPoints += pointValue;
                }
            }
        }
    }
    
    localStorage.setItem('totalrehab', totalPoints.toString());
    console.log(`totalrehab更新: ${totalPoints}ポイント`);
    
    return totalPoints;
}

saveTrueCountToLocalStorage();

// **新機能: カウンターシステムのテスト機能**
window.CounterSystemTester = {
    // 全体テストを実行
    runAllTests: function() {
        console.log('=== カウンターシステム全体テスト開始 ===');
        
        const tests = [
            this.testBasicCounterOperations,
            this.testURLParameterHandling,
            this.testStatusDataGeneration,
            this.testDisplayLogic
        ];
        
        let passedTests = 0;
        const totalTests = tests.length;
        
        tests.forEach((test, index) => {
            try {
                console.log(`\n--- テスト ${index + 1}/${totalTests}: ${test.name} ---`);
                const result = test.call(this);
                if (result) {
                    console.log(`✅ ${test.name} - 成功`);
                    passedTests++;
                } else {
                    console.log(`❌ ${test.name} - 失敗`);
                }
            } catch (error) {
                console.error(`❌ ${test.name} - エラー:`, error);
            }
        });
        
        console.log(`\n=== テスト結果: ${passedTests}/${totalTests} 成功 ===`);
        return passedTests === totalTests;
    },
    
    // 基本的なカウンター操作のテスト
    testBasicCounterOperations: function() {
        // テスト用データをクリア
        RehabCounterManager.resetCount(0);
        
        // 初期状態テスト
        if (RehabCounterManager.getCount(0) !== 0) return false;
        if (RehabCounterManager.isCompleted(0) !== false) return false;
        
        // インクリメントテスト
        const count1 = RehabCounterManager.incrementCount(0);
        if (count1 !== 1) return false;
        if (RehabCounterManager.isCompleted(0) !== true) return false;
        
        // 複数インクリメントテスト
        const count2 = RehabCounterManager.incrementCount(0);
        const count3 = RehabCounterManager.incrementCount(0);
        if (count3 !== 3) return false;
        
        // リセットテスト
        RehabCounterManager.resetCount(0);
        if (RehabCounterManager.getCount(0) !== 0) return false;
        
        return true;
    },
    
    // URLパラメータ処理のテスト
    testURLParameterHandling: function() {
        // テスト用設定
        localStorage.setItem('rehabilitation1', 'true');
        RehabCounterManager.resetCount(0);
        
        // URLパラメータシミュレーション（内部処理のみテスト）
        const initialCount = RehabCounterManager.getCount(0);
        RehabCounterManager.incrementCount(0);
        RehabCounterManager.incrementCount(0);
        const finalCount = RehabCounterManager.getCount(0);
        
        return finalCount === initialCount + 2;
    },
    
    // ステータスデータ生成のテスト
    testStatusDataGeneration: function() {
        // テスト用設定
        localStorage.setItem('rehabilitation1', 'true');
        localStorage.setItem('rehabilitation2', 'true');
        RehabCounterManager.setCount(0, 2); // 2回実施
        RehabCounterManager.setCount(1, 0); // 未実施
        
        // saveTrueCountToLocalStorage実行
        saveTrueCountToLocalStorage();
        
        // 結果確認
        const nmboftrue = localStorage.getItem('nmboftrue');
        
        // 完了数が正しいかチェック（1つ完了）
        return nmboftrue === '1';
    },
    
    // 表示ロジックのテスト
    testDisplayLogic: function() {
        // テスト用設定
        RehabCounterManager.setCount(0, 3);
        RehabCounterManager.setCount(1, 0);
        
        // 完了判定テスト
        const completed0 = RehabCounterManager.isCompleted(0);
        const completed1 = RehabCounterManager.isCompleted(1);
        
        return completed0 === true && completed1 === false;
    }
};

// デバッグ用: テスト実行関数をグローバルに公開
window.testCounterSystem = function() {
    return CounterSystemTester.runAllTests();
};

// localstrage のkey=rehabilitation1~4のvalueを取得して、設定を確認する
function loadCheckboxStates() {
    // 変数dateは、yyyy-mm-dd形式で格納
    // let date = new Date().toISOString().split('T')[0];
    let cnt = 0;
    for (let i = 1; i <= 4; i++) {
        const key = `rehabilitation${i}`;
        const value = localStorage.getItem(key);
        if (value === 'true') {
            cnt++;
        }
    }
    if(cnt>0){
        // numberOfClassはcheckReserve.jsで予約個数の合計として既に設定されているため、
        // ここでは種類数での上書きは行わない
        numberOfClass = parseInt(localStorage.getItem('numberofClass') || cnt);
    }else{
        // index.htmlで読み込まれたときのみ実行
        const currentPage = window.location.pathname;
        const isIndexPage = currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('/');
        const params = new URLSearchParams(window.location.search);
        let hasEachTrueParam = false;
        for (let i = 0; i <= 3; i++) {
            if (params.get(`each${i}`) === 'true') {
            hasEachTrueParam = true;
            break;
            }
        }
        if (isIndexPage) {
            if (hasEachTrueParam) {
            location.href = 'index_noreserve.html?alert=true';
            return;
            } else {
            location.href = 'index_noreserve.html';
            return;
            }
        }
    }
}
loadCheckboxStates();

// clear local storage when URL contains ?clear=true
if (location.search.includes('clear=true')) {
    var result = confirm('すべてのデータを削除しますか？※削除するとデータを復元することはできません。\nOK: 削除する\nキャンセル: 削除しない');
    if(result == true){
        localStorage.clear();
    }
    if (location.search) {
        const url = location.href.split('?')[0];
        history.replaceState(null, null, url);
    }
    location.reload();  
};

// Display icons based on local storage values for each0 to each3 (カウンター方式対応)
function displayIconsBasedOnLocalStorage() {
    // 今日の予約データを取得する関数
    function getTodayReserveData() {
        const today = new Date().toISOString().split('T')[0];
        const reserveKey = `reserve_${today}`;
        const reserveValue = localStorage.getItem(reserveKey);
        
        const reserveCounts = [0, 0, 0, 0, 0]; // each0-4の予約個数
        
        if (reserveValue) {
            const items = reserveValue.split(',');
            items.forEach(item => {
                const match = item.match(/^each(\d)=(\d+)$/);
                if (match) {
                    const idx = parseInt(match[1], 10);
                    const val = parseInt(match[2], 10);
                    if (idx >= 0 && idx <= 4) {
                        reserveCounts[idx] = val;
                    }
                }
            });
        }
        
        return reserveCounts;
    }
    
    const reserveCounts = getTodayReserveData();
    console.log('Today reserve data:', reserveCounts);
    
    for (let i = 0; i <= 3; i++) {
        let key = `each${i}`;
        const element = document.getElementById(`each${i}`);

        // DOM要素が存在しない場合は処理をスキップ（calender.htmlなど）
        if (!element) {
            continue;
        }

        const key2 = `rehabilitation${i+1}`;
        const value2 = localStorage.getItem(key2);

        // カウンター方式で完了判定
        const isCompleted = RehabCounterManager.isCompleted(i);
        const count = RehabCounterManager.getCount(i);
        const reserveCount = RehabCounterManager.getReservedCount(i); // 新しいメソッドを使用
        
        // デバッグ情報出力
        console.log(`each${i}: completed=${isCompleted}, actual=${count}, reserved=${reserveCount}`);

        // 要素をクリア
        element.innerHTML = '';

        if (value2 === 'false') {
            // リハビリ設定が無効
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'bi bi-dash');
            icon.setAttribute('fill', 'currentColor');
            icon.setAttribute('viewBox', '0 0 16 16');
            icon.setAttribute('width', '24');
            icon.setAttribute('height', '24');
            icon.innerHTML = `
                <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
            `;
            icon.style.color = 'gray';
            element.appendChild(icon);
            
            // 背景色を設定
            element.style.backgroundColor = '#f0f0f0';
        } else if (isCompleted) {
            // 完了済み（予約個数 = 実行個数）
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'bi bi-check-circle-fill');
            icon.setAttribute('fill', 'green');
            icon.setAttribute('viewBox', '0 0 16 16');
            icon.setAttribute('width', '24');
            icon.setAttribute('height', '24');
            icon.innerHTML = `
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 10.97a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.44 6.067 8.007a.75.75 0 1 0-1.06 1.06l1.963 1.963z"/>
            `;
            icon.style.color = 'green';
            element.appendChild(icon);
            
            // 回数テキストを追加（x個/y個形式）
            const countText = document.createElement('small');
            countText.textContent = `${count}個すべて達成`;
            countText.style.color = 'green';
            countText.style.fontWeight = 'bold';
            countText.style.marginTop = '2px';
            countText.style.fontSize = '0.8rem';
            element.appendChild(countText);
            
            // 背景色を設定
            element.style.backgroundColor = '#e6f7e6';
        } else {
            // 未完了（0回実施）
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'bi bi-x-circle');
            icon.setAttribute('fill', 'gray');
            icon.setAttribute('viewBox', '0 0 16 16');
            icon.setAttribute('width', '24');
            icon.setAttribute('height', '24');
            icon.innerHTML = `
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            `;
            icon.style.color = 'gray';
            element.appendChild(icon);
            
            // 回数テキストを追加（x個/y個形式）
            const countText = document.createElement('small');
            countText.textContent = `${reserveCount}個中${count}個達成`;
            countText.style.color = 'gray';
            countText.style.fontWeight = 'bold';
            countText.style.marginTop = '2px';
            countText.style.fontSize = '0.8rem';
            element.appendChild(countText);
            
            // 背景色を設定
            element.style.backgroundColor = '#f0f0f0';
        }
    }
}
// 今日が休日かどうかをチェックする関数
function isTodayRestDay() {
    if (!RestDayManager) return false;
    const today = new Date().toISOString().split('T')[0];
    return RestDayManager.isRestDay(today);
}

// 休日当日の表示制御
function handleRestDayDisplay() {
    // index.html（ホーム画面）でのみ休日メッセージを表示
    const currentPage = window.location.pathname;
    const isIndexPage = currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('/');
    
    if (!isIndexPage) {
        console.log('カレンダーページのため休日メッセージ表示をスキップします');
        return;
    }
    
    const isRestDay = isTodayRestDay();
    
    if (isRestDay) {
        // 円形プログレスバーを非表示
        const container = document.getElementById('container');
        if (container) {
            container.style.display = 'none';
        }
        
        // 今日のリハビリセクションを非表示
        const dividestatus = document.getElementById('dividestatus');
        if (dividestatus) {
            dividestatus.style.display = 'none';
        }
        
        // 「今日はお休みです」メッセージを表示（container外に表示）
        showRestDayMessage();
    }
}

// 「今日はお休みです」メッセージを表示
function showRestDayMessage() {
    try {
        // 既存の休日メッセージがあれば削除
        const existingRestMessage = document.getElementById('rest-day-message');
        if (existingRestMessage) {
            existingRestMessage.remove();
        }

        // 今日の日付をyyyy-mm-dd形式で取得
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        const restMessageHTML = `
            <div id="rest-day-message" class="p-3 mb-4 text-center" 
                 style="max-width: 90%; margin: 0 auto; min-width: 16.25rem; 
                        background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%); 
                        border-radius: 16px; 
                        border: 2px solid #6f42c1;
                        box-shadow: 0 4px 12px rgba(111, 66, 193, 0.15);">
                <div class="container-fluid">
                    <div class="d-flex align-items-center justify-content-center mb-2">
                        <i class="bi bi-cup-hot" style="font-size: 2rem; color: #6f42c1; margin-right: 0.5rem;"></i>
                        <span style="font-size: 1.4rem; font-weight: bold; color: #6f42c1;">今日はお休みです</span>
                    </div>
                    <div class="mt-3">
                        <a href="reserve.html?date=${todayStr}#dayselectCard" class="btn btn-outline-primary w-75 text-center" style="font-size: 1.1rem; border-radius: 12px; padding: 0.6em 0; border-color: #6f42c1; color: #6f42c1;">
                            <i class="bi bi-calendar-week"></i> 予約を変更する
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // containerが非表示になっている場合は、bodyまたは適切な親要素に挿入
        const container = document.getElementById('container');
        const body = document.body;
        
        if (container && container.style.display !== 'none') {
            // containerが表示されている場合は、その最初に挿入
            container.insertAdjacentHTML('afterbegin', restMessageHTML);
            console.log('休日メッセージをcontainerの一番上に表示しました');
        } else {
            // containerが非表示の場合は、navbarの後に挿入
            const navbar = document.querySelector('nav.navbar');
            if (navbar) {
                navbar.insertAdjacentHTML('afterend', restMessageHTML);
                console.log('休日メッセージをnavbarの後に表示しました');
            } else if (body) {
                // navbarが見つからない場合はbodyの最初に挿入
                body.insertAdjacentHTML('afterbegin', restMessageHTML);
                console.log('休日メッセージをbodyの最初に表示しました');
            } else {
                console.warn('休日メッセージの挿入位置が見つかりません');
            }
        }
    } catch (error) {
        console.error('休日メッセージ表示エラー:', error);
    }
}

displayIconsBasedOnLocalStorage();

// 連続達成日数を計算する関数
// function getConsecutiveClearDays() {
//     let count = 0;
//     let date = new Date();
//     while (true) {
//         const dateStr = date.toISOString().split('T')[0];
//         const status = localStorage.getItem(`status_${dateStr}`);
//         if (status && status.startsWith('clear')) {
//             count++;
//             date.setDate(date.getDate() - 1);
//         } else {
//             if (count === 0) return 0;
//             break;
//         }
//     }
//     return count;
// }

// 累計日数を取得する関数
function getTotalDaysCount() {
    let totalDays = 0;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('status_')) {
            totalDays++;
        }
    });
    return totalDays;
}

// 連続日数を計算する関数
function getConsecutiveDays() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `consecutive_cache_${today}`;
        
        // キャッシュチェック（当日のみ）
        const cached = StorageCache.get(cacheKey);
        if (cached !== null) {
            const parsedCache = JSON.parse(cached);
            if (parsedCache && parsedCache.date === today) {
                return parsedCache.days;
            }
        }
        
        let consecutiveCount = 0;
        let currentDate = new Date();
        const maxDaysToCheck = 365; // パフォーマンス最適化: 最大365日制限
        let daysChecked = 0;
        
        while (daysChecked < maxDaysToCheck) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // 休日チェック（エラーハンドリング強化）
            let isRestDay = false;
            try {
                if (RestDayManager && typeof RestDayManager.isRestDay === 'function') {
                    isRestDay = RestDayManager.isRestDay(dateStr);
                }
            } catch (restDayError) {
                console.warn(`休日チェックエラー (${dateStr}):`, restDayError);
                isRestDay = false; // エラー時は休日ではないとして扱う
            }
            
            if (isRestDay) {
                // 休日は連続記録から除外（カウントせずに前日へ）
                currentDate.setDate(currentDate.getDate() - 1);
                daysChecked++;
                continue;
            }
            
            // 取り組む日の場合、リハビリ完了状況をチェック
            const statusKey = `status_${dateStr}`;
            const statusData = StorageCache.get(statusKey); // キャッシュを使用
            
            if (statusData && statusData.startsWith('1')) {
                // 全完了の場合
                consecutiveCount++;
                currentDate.setDate(currentDate.getDate() - 1);
                daysChecked++;
            } else if (statusData && statusData.startsWith('0')) {
                // 未完了の場合は連続終了
                break;
            } else {
                // データがない場合：フォールバック機能を追加
                // 今日の日付で、リハビリ設定が存在する場合は動的にチェック
                if (dateStr === new Date().toISOString().split('T')[0]) {
                    // 動的にリハビリ数を計算
                    let totalRehabs = 0;
                    for (let i = 1; i <= 4; i++) {
                        if (localStorage.getItem(`rehabilitation${i}`) === 'true') {
                            totalRehabs++;
                        }
                    }
                    
                    const completedCount = parseInt(localStorage.getItem('nmboftrue') || 0);
                    
                    if (totalRehabs > 0) {
                        if (completedCount === totalRehabs) {
                            // 今日完了している場合、動的にステータスを作成して継続
                            console.log(`今日のステータス不足を動的修復: ${dateStr} (完了:${completedCount}/${totalRehabs})`);
                            consecutiveCount++;
                            currentDate.setDate(currentDate.getDate() - 1);
                            daysChecked++;
                            continue;
                        } else if (completedCount > 0) {
                            // 部分完了の場合は連続終了
                            console.log(`今日の部分完了により連続終了: ${dateStr} (完了:${completedCount}/${totalRehabs})`);
                            break;
                        }
                    }
                }
                
                // それ以外（過去日やデータなし）は連続終了
                console.log(`連続記録終了: データなし ${dateStr}`);
                break;
            }
        }
        
        // 結果をキャッシュ（当日のみ）
        StorageCache.set(cacheKey, JSON.stringify({
            date: today,
            days: consecutiveCount,
            timestamp: Date.now()
        }));

        return consecutiveCount;
    } catch (error) {
        console.error('連続記録日数計算エラー:', error);
        return 0; // エラー時は0日を返す
    }
}

// 節目メッセージ機能の定数と関数
const MILESTONE_DEFINITIONS = {
    weeks: [1, 2, 3, 4], // 週
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 月
    halfYear: [6], // 半年
    year: [1], // 1年
    yearlyAfterFirst: true // 1年後は毎年
};

// 初回記録日を取得する関数
function getFirstRecordDate() {
    let firstDate = null;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('status_')) {
            const date = key.replace('status_', '');
            if (!firstDate || date < firstDate) {
                firstDate = date;
            }
        }
    });
    
    // デバッグログ
    console.log('初回記録日:', firstDate);
    
    return firstDate;
}

// 日付から経過期間を計算する関数
function calculateElapsedPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 経過日数
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // 経過週数
    const weeks = Math.floor(diffDays / 7);
    
    // 経過月数（概算）
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();
    
    let months = (endYear - startYear) * 12 + (endMonth - startMonth);
    
    // 日にちが開始日より前の場合は1月引く
    if (end.getDate() < start.getDate()) {
        months--;
    }
    
    // 経過年数
    let years = Math.floor(months / 12);
    
    return { days: diffDays, weeks, months, years };
}

// 節目かどうかを判定し、メッセージを生成する関数（2日間表示対応）
function checkAndGenerateMilestoneMessage() {
    const firstRecordDate = getFirstRecordDate();
    if (!firstRecordDate) {
        console.log('初回記録日が見つかりません');
        return null;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // 今日と昨日の両方をチェック（2日間表示のため）
    const todayDate = new Date(today);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    
    // 今日の経過期間を計算
    const elapsedToday = calculateElapsedPeriod(firstRecordDate, today);
    // 昨日の経過期間を計算
    const elapsedYesterday = calculateElapsedPeriod(firstRecordDate, yesterday);
    
    // デバッグログ
    console.log('節目メッセージ判定:', {
        firstRecordDate,
        today,
        yesterday,
        elapsedToday,
        elapsedYesterday
    });
    
    // 今日が節目の日かチェック
    const todayMessage = checkMilestoneForDate(firstRecordDate, today, elapsedToday);
    if (todayMessage) {
        return todayMessage;
    }
    
    // 昨日が節目の日だった場合もメッセージを表示
    const yesterdayMessage = checkMilestoneForDate(firstRecordDate, yesterday, elapsedYesterday);
    if (yesterdayMessage) {
        return yesterdayMessage;
    }
    
    return null;
}

// 指定した日付が節目かどうかを判定する関数
function checkMilestoneForDate(firstRecordDate, targetDate, elapsed) {
    // 節目の判定と優先順位（月単位での判定を優先）
    
    // 月の判定（1年以上でも毎月表示）
    const startDate = new Date(firstRecordDate);
    const targetDateObj = new Date(targetDate);
    
    // 毎月の同じ日かチェック
    const nMonthsLater = new Date(startDate);
    nMonthsLater.setMonth(nMonthsLater.getMonth() + elapsed.months);
    
    if (nMonthsLater.toISOString().split('T')[0] === targetDate && elapsed.months > 0) {
        // 1年以上の場合は「n年mか月」形式
        if (elapsed.years >= 1) {
            const remainingMonths = elapsed.months % 12;
            if (remainingMonths === 0) {
                // ちょうど年単位の場合
                return `リハビリをはじめて${elapsed.years}年がたちました`;
            } else {
                // 年と月を組み合わせた場合
                return `リハビリをはじめて${elapsed.years}年${remainingMonths}か月がたちました`;
            }
        } else {
            // 1年未満の場合
            if (elapsed.months === 6) {
                return 'リハビリをはじめて半年がたちました';
            } else if (MILESTONE_DEFINITIONS.months.includes(elapsed.months)) {
                return `リハビリをはじめて${elapsed.months}か月がたちました`;
            }
        }
    }
    
    // 週の判定
    if (MILESTONE_DEFINITIONS.weeks.includes(elapsed.weeks)) {
        // 正確にn週間後かチェック
        const startDate = new Date(firstRecordDate);
        const nWeeksLater = new Date(startDate);
        nWeeksLater.setDate(nWeeksLater.getDate() + (elapsed.weeks * 7));
        
        if (nWeeksLater.toISOString().split('T')[0] === targetDate) {
            return `リハビリをはじめて${elapsed.weeks}週間がたちました`;
        }
    }
    
    return null;
}

// **パフォーマンス最適化: デバウンス機能**
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// デバウンス化された表示更新関数
// （displayConsecutiveMessage と displayInitialStatus が定義された後に配置）

// **フェーズ4: UX改善 - 記念日メッセージ強化**
function getSpecialConsecutiveDayMessage(days) {
    const specialDays = {
        7: { emoji: '🎉', message: '1週間連続達成！', color: '#28a745' },
        14: { emoji: '🎊', message: '2週間連続達成！', color: '#17a2b8' },
        30: { emoji: '🏆', message: '1ヶ月連続達成！', color: '#ffc107' },
        60: { emoji: '⭐', message: '2ヶ月連続達成！', color: '#fd7e14' },
        90: { emoji: '💎', message: '3ヶ月連続達成！', color: '#6f42c1' },
        100: { emoji: '🔥', message: '100日連続達成！', color: '#dc3545' },
        365: { emoji: '🏅', message: '1年連続達成！', color: '#198754' }
    };
    
    return specialDays[days] || null;
}

// **基本的な初期状態表示関数（円形プログレスバーなど）**
function displayInitialStatus() {
    try {
        // 基本的な初期化処理
        console.log('初期状態の表示を開始');
        
        // 既存の初期化ロジックがあればここに配置
        // プログレスバーの初期化、ランク表示の初期化など
        
        // 日付情報の更新
        const today = new Date();
        const todayElement = document.getElementById('today-date');
        if (todayElement) {
            todayElement.textContent = today.toLocaleDateString('ja-JP');
        }
        
        // その他の初期状態設定
        console.log('初期状態の表示が完了');
    } catch (error) {
        console.error('初期状態表示エラー:', error);
    }
}

const LoadingManager = {
    show(element, message = 'データを読み込み中...') {
        if (!element) return;
        
        const loadingHTML = `
            <div class="loading-overlay d-flex justify-content-center align-items-center" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(255, 255, 255, 0.8); border-radius: inherit; z-index: 1000;">
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-2 text-muted" style="font-size: 0.9rem;">${message}</div>
                </div>
            </div>
        `;
        
        element.style.position = 'relative';
        element.insertAdjacentHTML('beforeend', loadingHTML);
    },
    
    hide(element) {
        if (!element) return;
        const overlay = element.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

// 連続記録メッセージを表示する関数
function displayConsecutiveMessage() {
    try {
        // **チカチキ防止: フラグチェック**
        if (DisplayState.consecutiveMessageShown) {
            console.log('連続記録メッセージは既に表示済みです');
            return;
        }
        
        // **チカチキ防止: 既存要素の確認と早期リターン**
        const existingConsecutive = document.getElementById('consecutive-message');
        if (existingConsecutive) {
            console.log('連続記録メッセージは既に表示されています');
            DisplayState.consecutiveMessageShown = true;
            return;
        }
        
        // 表示処理中フラグを設定
        DisplayState.consecutiveMessageShown = true;
        
        // ローディング表示（短時間のみ）
        const generalStatus = document.getElementById('generalstatus');
        let loadingShown = false;
        
        // 200ms以上かかる場合のみローディング表示
        const loadingTimeout = setTimeout(() => {
            if (generalStatus) {
                LoadingManager.show(generalStatus, '連続記録を計算中...');
                loadingShown = true;
            }
        }, 200);
        
        // 非同期で処理実行（UIブロッキングを防ぐ）
        setTimeout(() => {
            try {
                // ローディングタイムアウトをクリア
                clearTimeout(loadingTimeout);
                
                const consecutiveDays = getConsecutiveDays();
                
                // **再度重複チェック（非同期処理中に他から呼ばれた可能性）**
                const existingConsecutiveAfter = document.getElementById('consecutive-message');
                if (existingConsecutiveAfter) {
                    console.log('処理中に連続記録メッセージが既に作成されました');
                    if (loadingShown && generalStatus) {
                        LoadingManager.hide(generalStatus);
                    }
                    return;
                }
                
                // 2日以上の場合のみ表示
                if (consecutiveDays >= 2) {
                    const specialMessage = getSpecialConsecutiveDayMessage(consecutiveDays);
                    
                    let messageContent, iconColor, textColor;
                    
                    if (specialMessage) {
                        // 特別な記念日の場合
                        messageContent = `
                            <div class="d-flex align-items-center justify-content-center mb-2">
                                <div style="font-size: 3rem; margin-right: 0.5rem;">${specialMessage.emoji}</div>
                                <div class="text-center">
                                    <div style="font-size: 1.6rem; font-weight: bold; color: ${specialMessage.color};">
                                        ${specialMessage.message}
                                    </div>
                                    <div style="font-size: 1.2rem; color: #6c757d; margin-top: 0.2rem;">
                                        ${consecutiveDays}日連続で達成中！
                                    </div>
                                </div>
                            </div>
                        `;
                        iconColor = specialMessage.color;
                        textColor = specialMessage.color;
                    } else {
                        // 通常の連続記録メッセージ
                        messageContent = `
                            <div class="d-flex align-items-center justify-content-center mb-2">
                                <i class="bi bi-stars" style="font-size: 2rem; color: #ffc107; margin-right: 0.5rem;"></i>
                                <span style="font-size: 1.4rem; font-weight: bold;">現在、<span style="font-size: 1.6rem; font-weight: bold; background: linear-gradient(transparent 65%, rgba(255, 193, 7, 0.3) 65%, rgba(255, 193, 7, 0.3) 85%, transparent 85%); padding: 4px 12px; margin: 0 6px; border-radius: 6px 6px 0 0; color: #e67e22; display: inline-block;">${consecutiveDays}日</span>連続で<br>達成しています！</span>
                            </div>
                        `;
                    }
                    
                    const consecutiveMessageHTML = `
                        <div id="consecutive-message" class="p-3 my-2 text-center" 
                             style="max-width: 90%; margin: 0 auto; min-width: 16.25rem; 
                                    background: rgba(255, 255, 255, 1); border-radius: 16px;
                                    opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
                                    ${specialMessage ? `border: 2px solid ${specialMessage.color}; box-shadow: 0 4px 20px rgba(0,0,0,0.1);` : ''}">
                            <div class="container-fluid">
                                ${messageContent}
                            </div>
                        </div>
                    `;
                    
                    // 円形プログレスバーの下、今日のリハビリ欄の上に挿入
                    const dividestatus = document.getElementById('dividestatus');
                    
                    if (generalStatus && dividestatus) {
                        dividestatus.insertAdjacentHTML('beforebegin', consecutiveMessageHTML);
                        
                        // アニメーション効果（特別な記念日は少し遅らせる）
                        const messageElement = document.getElementById('consecutive-message');
                        if (messageElement) {
                            setTimeout(() => {
                                messageElement.style.opacity = '1';
                                messageElement.style.transform = 'translateY(0)';
                            }, specialMessage ? 200 : 50);
                        }
                    } else {
                        console.warn('連続記録メッセージの挿入位置が見つかりません');
                    }
                }
                
                // ローディング終了
                if (loadingShown && generalStatus) {
                    LoadingManager.hide(generalStatus);
                }
            } catch (error) {
                console.error('連続記録メッセージ表示エラー:', error);
                if (loadingShown && generalStatus) {
                    LoadingManager.hide(generalStatus);
                }
                // エラー時はフラグをリセット
                DisplayState.consecutiveMessageShown = false;
            }
        }, 50); // 50ms遅延でスムーズかつ高速な表示
        
    } catch (error) {
        console.error('連続記録メッセージ表示エラー:', error);
        // エラー時はフラグをリセット
        DisplayState.consecutiveMessageShown = false;
    }
}

// **デバウンス化された表示更新関数（関数定義後に配置）**
const debouncedDisplayConsecutiveMessage = debounce(displayConsecutiveMessage, 300);
const debouncedDisplayInitialStatus = debounce(displayInitialStatus, 200);

// 節目メッセージを表示する関数（2日間表示対応）
function displayMilestoneMessage() {
    const message = checkAndGenerateMilestoneMessage();
    const milestoneCard = document.getElementById('milestone-message');
    const messageText = document.getElementById('milestone-message-text');
    
    if (message && milestoneCard && messageText) {
        // メッセージテキストに改行を追加し、期間部分のフォントサイズを大きくする
        let formattedMessage = message.replace('リハビリをはじめて', 'リハビリをはじめて<br>');
        
        // 期間部分を青色マーカーで強調し、前後に間隔を追加
        const styleString = 'font-size: 1.6rem; font-weight: bold; background: linear-gradient(transparent 65%, rgba(13, 110, 253, 0.3) 65%, rgba(13, 110, 253, 0.3) 85%, transparent 85%); padding: 4px 12px; margin: 0 6px; border-radius: 6px 6px 0 0; color: #0d6efd; display: inline-block;';
        
        // 1. 年月組み合わせパターン（例：1年2か月）を最優先で処理
        formattedMessage = formattedMessage.replace(/(\d+年\d+か月)/g, `<span style="${styleString}">$1</span>`);
        // 2. 残りの単独パターンを処理（***MARKED***で一時的にマークして重複を防ぐ）
        formattedMessage = formattedMessage.replace(/(?<!<span[^>]*>)(\d+年)(?!\d)/g, `<span style="${styleString}">$1</span>***MARKED***`);
        formattedMessage = formattedMessage.replace(/(?<!年)(\d+か月)(?!<\/span>)/g, `<span style="${styleString}">$1</span>`);
        formattedMessage = formattedMessage.replace(/(\d+週間)/g, `<span style="${styleString}">$1</span>`);
        formattedMessage = formattedMessage.replace(/(半年)/g, `<span style="${styleString}">$1</span>`);
        // 3. マーカーを削除
        formattedMessage = formattedMessage.replace(/\*\*\*MARKED\*\*\*/g, '');
        
        messageText.innerHTML = formattedMessage;
        milestoneCard.style.display = 'block';
        
        // デバッグログ
        console.log('節目メッセージを表示:', message);
    } else if (milestoneCard) {
        milestoneCard.style.display = 'none';
        
        // デバッグログ
        if (!message) {
            console.log('今日は節目の日ではありません');
        }
    }
}

// main progress bar
function createProgressBar(container, color, duration, fromColor, toColor, strokeWidth, trailWidth) {
    return new ProgressBar.Circle(container, {
        color: color,
        strokeWidth: strokeWidth,
        trailWidth: trailWidth,
        easing: 'easeInOut',
        duration: duration,
        text: {
            autoStyleContainer: false
        },
        from: { color: fromColor, width: strokeWidth },
        to: { color: toColor, width: strokeWidth },
        step: function(state, circle) {
            circle.path.setAttribute('stroke', state.color);
            circle.path.setAttribute('stroke-width', state.width);

            var value = Math.round(circle.value() * 100);
            var remainingTasks = numberOfClass - nowClass;
            var totalDays = getTotalDaysCount();
            
            // アニメーション用の変数を初期化（初回のみ）
            if (!circle.animationState) {
                circle.animationState = {
                    showingRemaining: true,
                    animationStarted: false
                };
            }
            
            if (value === 0 || numberOfClass === 0) {
                // 進捗(リハビリの数)が0の場合
                if (remainingTasks === 0) {
                    var bottomText = '<div style="font-size:1.3rem; color:#000000;">おめでとう</div>';
                } else {
                    var bottomText = '<div style="font-size:1.3rem; color:#000000;">はじめよう</div>'; // 「はじめよう」メッセージを追加
                }
                
                // メインテキストには0を表示
                circle.setText(
                    '<div style="height: 2rem; display: flex; align-items: center; justify-content: center; font-size:1.5rem;">きょう</div>' +
                    '<div style="height: 4rem; display: flex; align-items: center; justify-content: center; font-size:3rem;">0</div>' +
                    '<div style="height: 3rem; display: flex; align-items: center; justify-content: center;">' + (bottomText ? bottomText.replace('<div class="progress-bottom-text"', '<div class="progress-bottom-text" style="display: flex; align-items: center; justify-content: center;') : '') + '</div>'
                );
            } else {
                var bottomText;
                if (remainingTasks === 0) {
                    // すべて完了の場合、記録がある場合のみアニメーション
                    if (totalDays > 0) {
                        // アニメーション開始（初回のみ）
                        if (!circle.animationState.animationStarted) {
                            circle.animationState.animationStarted = true;
                            // アニメーション不要なので削除
                        }
                        
                        // おめでとうメッセージのみ表示
                        bottomText = '<div class="progress-bottom-text" style="font-size:1.3rem; color:#000000;">おめでとう</div>';
                    } else {
                        // 記録がない場合は「おめでとう」のみ
                        bottomText = '<div style="font-size:1.3rem; color:#000000;">おめでとう</div>';
                    }
                } else {
                    // アニメーション開始（初回のみ）
                    if (!circle.animationState.animationStarted) {
                        circle.animationState.animationStarted = true;
                        // アニメーション簡略化
                    }
                    
                    // あと○つのみ表示
                    bottomText = '<div class="progress-bottom-text" style="font-size:2rem;">' + '<div style="font-size:1.2rem;">あと' + '<b style="font-size:1.8rem;">' + remainingTasks + '</b><div style="font-size:1.2rem; display:inline;">つ</div></div>';
                }
                
                // メインテキストには現在の進捗を表示
                circle.setText(
                    '<div style="height: 2rem; display: flex; align-items: center; justify-content: center; font-size:1.5rem;">きょう</div>' +
                    '<div style="height: 4rem; display: flex; align-items: center; justify-content: center; font-size:3rem; display:inline;">' + nowClass + '</div>' +
                    '<div style="height: 3rem; display: flex; align-items: center; justify-content: center;">' + (bottomText ? bottomText.replace('<div class="progress-bottom-text"', '<div class="progress-bottom-text" style="display: flex; align-items: center; justify-content: center;') : '') + '</div>'
                );
            }
        }
    });
}

// 底部テキストのアニメーション制御（0個の場合）
function startBottomTextAnimationForZero(circle, totalDays) {
    setInterval(() => {
        // 現在の累計日数を再取得（リアルタイム更新のため）
        var currentTotalDays = getTotalDaysCount();
        
        // 状態を切り替え
        circle.animationState.showingRemaining = !circle.animationState.showingRemaining;
        
        // 底部テキスト要素のみにフェードアウト効果を適用
        const bottomTextElement = circle.text.querySelector('.progress-bottom-text');
        if (bottomTextElement) {
            bottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
            bottomTextElement.style.opacity = '0';
        }
        
        setTimeout(() => {
            // テキストを更新
            var bottomText;
            if (circle.animationState.showingRemaining) {
                bottomText = '<div class="progress-bottom-text" style="font-size:2rem; opacity:0;">' + '<div style="font-size:1.2rem;">あなたのペースで</div></div>';
            } else {
                bottomText = '<div class="progress-bottom-text" style="font-size:2rem; opacity:0;">' + '<div style="font-size:1.2rem;">累計' + '<b style="font-size:1.8rem;">' + currentTotalDays + '</b><div style="font-size:1.2rem; display:inline;">日</div></div>';
            }
            
            circle.setText(
                '<div style="height: 2rem; display: flex; align-items: center; justify-content: center; font-size:1.5rem;">きょう</div>' +
                '<div style="height: 4rem; display: flex; align-items: center; justify-content: center; font-size:3rem;">0</div>' +
                '<div style="height: 3rem; display: flex; align-items: center; justify-content: center;">' + (bottomText ? bottomText.replace('<div class="progress-bottom-text"', '<div class="progress-bottom-text" style="display: flex; align-items: center; justify-content: center;') : '') + '</div>'
            );
            
            // 新しい底部テキスト要素にフェードイン効果を適用
            const newBottomTextElement = circle.text.querySelector('.progress-bottom-text');
            if (newBottomTextElement) {
                newBottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
                // 少し遅らせてフェードイン開始
                setTimeout(() => {
                    newBottomTextElement.style.opacity = '1';
                }, 50);
            }
        }, 400); // フェードアウト完了後にテキスト変更
        
    }, 3000); // 3秒ごとに切り替え
}

// 底部テキストのアニメーション制御
function startBottomTextAnimation(circle, remainingTasks, totalDays) {
    // リハビリに1個も取り組んでいない場合はアニメーションしない
    if (nowClass === 0) {
        return;
    }
    
    setInterval(() => {
        // 現在の累計日数を再取得（リアルタイム更新のため）
        var currentTotalDays = getTotalDaysCount();
        var currentRemainingTasks = numberOfClass - nowClass;
        
        // 状態を切り替え
        circle.animationState.showingRemaining = !circle.animationState.showingRemaining;
        
        // 底部テキスト要素のみにフェードアウト効果を適用
        const bottomTextElement = circle.text.querySelector('.progress-bottom-text');
        if (bottomTextElement) {
            bottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
            bottomTextElement.style.opacity = '0';
        }
        
        setTimeout(() => {
            // テキストを更新
            var bottomText;
            // あと○つのみ表示
            bottomText = '<div class="progress-bottom-text" style="font-size:2rem; opacity:0;">' + '<div style="font-size:1.2rem;">あと' + '<b style="font-size:1.8rem;">' + currentRemainingTasks + '</b><div style="font-size:1.2rem; display:inline;">つ</div></div>';
            
            circle.setText(
                '<div style="height: 2rem; display: flex; align-items: center; justify-content: center; font-size:1.5rem;">きょう</div>' +
                '<div style="height: 4rem; display: flex; align-items: center; justify-content: center; font-size:3rem; display:inline;">' + nowClass + '</div>' +
                '<div style="height: 3rem; display: flex; align-items: center; justify-content: center;">' + (bottomText ? bottomText.replace('<div class="progress-bottom-text"', '<div class="progress-bottom-text" style="display: flex; align-items: center; justify-content: center;') : '') + '</div>'
            );
            
            // 新しい底部テキスト要素にフェードイン効果を適用
            const newBottomTextElement = circle.text.querySelector('.progress-bottom-text');
            if (newBottomTextElement) {
                newBottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
                // 少し遅らせてフェードイン開始
                setTimeout(() => {
                    newBottomTextElement.style.opacity = '1';
                }, 50);
            }
        }, 400); // フェードアウト完了後にテキスト変更
        
    }, 3000); // 3秒ごとに切り替え
}

// 完了時の底部テキストのアニメーション制御
function startBottomTextAnimationForComplete(circle, totalDays) {
    // リハビリに1個も取り組んでいない場合はアニメーションしない
    if (nowClass === 0) {
        return;
    }
    
    setInterval(() => {
        // 現在の累計日数を再取得（リアルタイム更新のため）
        var currentTotalDays = getTotalDaysCount();
        
        // 状態を切り替え
        circle.animationState.showingRemaining = !circle.animationState.showingRemaining;
        
        // 底部テキスト要素のみにフェードアウト効果を適用
        const bottomTextElement = circle.text.querySelector('.progress-bottom-text');
        if (bottomTextElement) {
            bottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
            bottomTextElement.style.opacity = '0';
        }
        
        setTimeout(() => {
            // テキストを更新
            var bottomText;
            // おめでとうメッセージのみ表示
            bottomText = '<div class="progress-bottom-text" style="font-size:1.3rem; opacity:0; color:#000000;">おめでとう</div>';
            
            circle.setText(
                '<div style="height: 2rem; display: flex; align-items: center; justify-content: center; font-size:1.5rem;">きょう</div>' +
                '<div style="height: 4rem; display: flex; align-items: center; justify-content: center; font-size:3rem; display:inline;">' + nowClass + '</div>' +
                '<div style="height: 3rem; display: flex; align-items: center; justify-content: center;">' + (bottomText ? bottomText.replace('<div class="progress-bottom-text"', '<div class="progress-bottom-text" style="display: flex; align-items: center; justify-content: center;') : '') + '</div>'
            );
            
            // 新しい底部テキスト要素にフェードイン効果を適用
            const newBottomTextElement = circle.text.querySelector('.progress-bottom-text');
            if (newBottomTextElement) {
                newBottomTextElement.style.transition = 'opacity 0.4s ease-in-out';
                // 少し遅らせてフェードイン開始
                setTimeout(() => {
                    newBottomTextElement.style.opacity = '1';
                }, 50);
            }
        }, 400); // フェードアウト完了後にテキスト変更
        
    }, 3000); // 3秒ごとに切り替え
}

// main progress bar
const totalRehab = calculateAndSaveTotalRehab();
const currentRank = getCurrentRank(totalRehab);
const rankColor = getRankColor(currentRank);

// containerが存在する場合のみプログレスバーを作成（index.html用）
const container = document.getElementById('container');
if (container) {
    var bar = createProgressBar(container, '#000000', 1400, rankColor, rankColor, 5, 6);
    bar.text.style.fontSize = '3rem';
    var animate = nowClass/numberOfClass;
    if(animate >1) animate = 1;
    bar.animate(animate);
}

saveTrueCountToLocalStorage();

// 各リハビリ療法の表示/非表示制御
function hideUnusedRehabilitation() {
    for (let i = 1; i <= 4; i++) {
        const key = `rehabilitation${i}`;
        const value = localStorage.getItem(key);
        const block = document.querySelector(`.rehab-block[data-rehab="${key}"]`);
        if (value !== 'true' && block) {
            block.style.display = 'none';
        }
    }
}
hideUnusedRehabilitation();

// プログレステキストアニメーション関数群（先に定義）
let progressTextAnimationInterval = null;
let progressTextAnimationState = 0; // 0: 次のランクまで, 1: 合計ポイント

function startProgressTextAnimation(totalRehab, currentRank, rankProgress) {
    const progressText = document.querySelector('#rankstatus .d-flex.align-baseline.justify-content-end');
    if (!progressText) return;
    
    // 既存のアニメーションがあれば停止
    stopProgressTextAnimation();
    
    // 初期表示
    updateProgressTextDisplay(totalRehab, currentRank, rankProgress, progressText);
    
    // 3秒ごとにアニメーション
    progressTextAnimationInterval = setInterval(() => {
        // フェードアウト
        progressText.style.opacity = '0';
        
        setTimeout(() => {
            // 状態を次に進める（0 → 1 → 0...）
            progressTextAnimationState = (progressTextAnimationState + 1) % 2;
            
            // 新しいコンテンツに更新
            updateProgressTextDisplay(totalRehab, currentRank, rankProgress, progressText);
            
            // フェードイン
            progressText.style.opacity = '1';
        }, 400); // フェードアウト完了後
    }, 3000);
}

function updateProgressTextDisplay(totalRehab, currentRank, rankProgress, progressText) {
    const remaining = rankProgress.required - rankProgress.current;
    const nextRank = getNextRank(currentRank);
    const nextRankColor = getRankColor(nextRank);
    
    let content = '';
    
    switch(progressTextAnimationState) {
        case 0: // 次のランクまでの残りポイント
            content = `<span style="display: inline-flex; align-items: baseline;"><span class="badge rounded-pill text-white" style="background-color: ${nextRankColor}; font-size: 1.1rem; margin: 0 4px;">${nextRank}</span>ランクまで<span style="font-size: 1.5rem; font-weight: bold; color: ${nextRankColor}; margin: 0 2px;">${remaining}</span>ポイント</span>`;
            break;
        case 1: // 合計ポイント
            content = `<span style="display: inline-flex; align-items: baseline;">合計<span style="font-size: 1.5rem; font-weight: bold; color: ${nextRankColor}; margin: 0 2px;">${totalRehab}</span>ポイント</span>`;
            break;
    }
    
    progressText.innerHTML = content;
}

// プラチナランク専用のアニメーション関数
function startProgressTextAnimationForPlatinum(totalRehab, progressText) {
    const platinumColor = getRankColor('プラチナ');
    
    // 既存のアニメーションがあれば停止
    stopProgressTextAnimation();
    
    // 初期表示（最高ランクに到達！）
    updatePlatinumProgressTextDisplay(totalRehab, progressText, platinumColor);
    
    // 3秒ごとにアニメーション
    progressTextAnimationInterval = setInterval(() => {
        // フェードアウト
        progressText.style.opacity = '0';
        
        setTimeout(() => {
            // 状態を次に進める（0 → 1 → 0...）
            progressTextAnimationState = (progressTextAnimationState + 1) % 2;
            
            // 新しいコンテンツに更新
            updatePlatinumProgressTextDisplay(totalRehab, progressText, platinumColor);
            
            // フェードイン
            progressText.style.opacity = '1';
        }, 400); // フェードアウト完了後
    }, 3000);
}

function updatePlatinumProgressTextDisplay(totalRehab, progressText, platinumColor) {
    let content = '';
    
    switch(progressTextAnimationState) {
        case 0: // 最高ランクに到達！
            content = `<span style="display: inline-flex; align-items: baseline; color: ${platinumColor}; font-weight: bold;">最高ランクに到達！</span>`;
            break;
        case 1: // 合計ポイント
            content = `<span style="display: inline-flex; align-items: baseline;">合計<span style="font-size: 1.5rem; font-weight: bold; color: ${platinumColor}; margin: 0 2px;">${totalRehab}</span>ポイント</span>`;
            break;
    }
    
    progressText.innerHTML = content;
}

function stopProgressTextAnimation() {
    if (progressTextAnimationInterval) {
        clearInterval(progressTextAnimationInterval);
        progressTextAnimationInterval = null;
    }
    progressTextAnimationState = 0; // 状態をリセット
}

// ランク表示を更新（ランクアップ検出含む）
checkAndAnimateStageUp();

// 節目メッセージを表示
displayMilestoneMessage();

// ランク制度関連の関数群

// totalrehabを計算してlocalStorageに保存
function calculateAndSaveTotalRehab() {
    let totalRehab = 0;
    
    // すべてのstatus_キーを検索して合計を計算
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('status_')) {
            const statusValue = localStorage.getItem(key);
            if (statusValue) {
                // status値の最初の部分（数字またはclear）を取得
                const parts = statusValue.split(',');
                const countPart = parts[0];
                
                if (countPart === 'clear') {
                    // 既存データ（clearの場合）は1ポイントとして計算
                    totalRehab += 1;
                } else {
                    // 数字の場合
                    const count = parseInt(countPart);
                    if (!isNaN(count)) {
                        // 新システム: 0または1のポイント
                        // 旧システム: 個別ポイント（下位互換性のため、そのまま加算）
                        // 判定: countが0か1なら新システム、2以上なら旧システム
                        if (count <= 1) {
                            totalRehab += count; // 新システム（0または1）
                        } else {
                            // 旧システムデータを新システムに変換: 2以上は全完了とみなして1ポイント
                            totalRehab += 1;
                        }
                    }
                }
            }
        }
    });
    
    localStorage.setItem('totalrehab', totalRehab);
    return totalRehab;
}

// カレンダー表示用の値を取得する関数（カウンター方式対応、従来の表示方法を維持）
function getDisplayValueForCalendar(statusValue) {
    if (!statusValue) return '';
    
    if (statusValue === 'clear' || statusValue.startsWith('clear')) {
        return 'clear';
    }
    
    // 新システム・旧システム両対応で、実際の完了数をカウントして表示
    const parts = statusValue.split(',');
    if (parts.length > 1) {
        let completedCount = 0;
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, value] = part.split('=');
                
                // 新形式（数値）と旧形式（true/false）の両方に対応
                if (value === 'true' || (parseInt(value) > 0 && !isNaN(parseInt(value)))) {
                    completedCount++;
                }
            }
        }
        
        return completedCount.toString();
    }
    
    // フォールバック: 最初の部分をそのまま返す
    return parts[0];
}

// 現在のランクを計算
function getCurrentRank(totalRehab) {
    if (totalRehab < 10) return 'ビギナー';
    if (totalRehab < 30) return 'ブロンズ';
    if (totalRehab < 60) return 'シルバー';
    if (totalRehab < 100) return 'ゴールド';
    return 'プラチナ';
}

// ランク内の進捗を計算
function getRankProgress(totalRehab) {
    if (totalRehab < 10) return { current: totalRehab, required: 10 };
    if (totalRehab < 30) return { current: totalRehab - 10, required: 20 };
    if (totalRehab < 60) return { current: totalRehab - 30, required: 30 };
    if (totalRehab < 100) return { current: totalRehab - 60, required: 40 };
    return { current: 0, required: 0 }; // プラチナは最高レベル
}

// 次のランクを取得
function getNextRank(currentRank) {
    switch (currentRank) {
        case 'ビギナー': return 'ブロンズ';
        case 'ブロンズ': return 'シルバー';
        case 'シルバー': return 'ゴールド';
        case 'ゴールド': return 'プラチナ';
        case 'プラチナ': return null; // プラチナは最高レベル
        default: return 'ブロンズ';
    }
}

// ランクに応じた色を取得
function getRankColor(rank) {
    switch (rank) {
        case 'ビギナー': return '#495057'; // 濃いグレー（見やすく改善）
        case 'ブロンズ': return '#b8860b'; // 濃いブロンズ色（見やすく改善）
        case 'シルバー': return '#708090'; // 濃いシルバー色（見やすく改善）
        case 'ゴールド': return '#daa520'; // 濃いゴールド色（見やすく改善）
        case 'プラチナ': return '#4a4a4a'; // 濃いプラチナ色（見やすく改善）
        default: return '#495057';
    }
}

// ランク情報を更新
function updateRankDisplay() {
    const totalRehab = calculateAndSaveTotalRehab();
    const currentRank = getCurrentRank(totalRehab);
    const rankProgress = getRankProgress(totalRehab);
    const rankColor = getRankColor(currentRank);
    
    // ランクバッジを更新
    const rankBadge = document.querySelector('#rankstatus .badge');
    if (rankBadge) {
        rankBadge.textContent = currentRank;
        rankBadge.style.backgroundColor = rankColor;
        // すべてのランクで白文字を使用（視認性向上）
        rankBadge.style.color = '#fff';
        rankBadge.classList.remove('bg-primary');
    }
    
    // プログレスバーを更新
    const progressBar = document.querySelector('#rankstatus .progress-bar');
    if (progressBar) {
        if (currentRank === 'プラチナ') {
            // プラチナの場合は100%で固定
            progressBar.style.width = '100%';
        } else {
            const progressPercentage = (rankProgress.current / rankProgress.required) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }
        progressBar.style.backgroundColor = rankColor;
        progressBar.classList.remove('bg-primary');
    }
    
    // 進捗テキストを更新（アニメーション機能付き）
    const progressText = document.querySelector('#rankstatus .d-flex.align-baseline.justify-content-end');
    if (progressText) {
        if (currentRank === 'プラチナ') {
            // プラチナランクの場合も専用のアニメーションを開始
            startProgressTextAnimationForPlatinum(totalRehab, progressText);
        } else {
            // アニメーション開始
            startProgressTextAnimation(totalRehab, currentRank, rankProgress);
        }
    }
    
    // index.html用のランク情報表示も更新
    if (typeof updateIndexRankDisplay === 'function') {
        updateIndexRankDisplay();
    }
}

// ステージアップ演出関連の関数群

// ステージアップ演出関連の関数群

// ランクアップを検出してアニメーションを実行
function checkAndAnimateStageUp() {
    const totalRehab = calculateAndSaveTotalRehab();
    const currentRank = getCurrentRank(totalRehab);
    const lastRank = localStorage.getItem('lastRank') || 'ビギナー';
    
    // 初回アクセス時はlastRankを現在のランクに設定
    if (!localStorage.getItem('lastRank')) {
        localStorage.setItem('lastRank', currentRank);
        updateRankDisplay();
        return;
    }
    
    // ランクアップが発生した場合
    if (getRankLevel(currentRank) > getRankLevel(lastRank)) {
        // 旧ランクの色を事前に取得して保持
        const oldRankColor = getRankColor(lastRank);
        triggerRankUpAnimation(currentRank, oldRankColor);
        localStorage.setItem('lastRank', currentRank);
    } else {
        // 通常のランク表示更新
        updateRankDisplay();
    }
}

// ランクレベルを数値で取得（比較用）
function getRankLevel(rank) {
    switch (rank) {
        case 'ビギナー': return 1;
        case 'ブロンズ': return 2;
        case 'シルバー': return 3;
        case 'ゴールド': return 4;
        case 'プラチナ': return 5;
        default: return 0;
    }
}

// ランクアップアニメーションを実行
function triggerRankUpAnimation(newRank, oldRankColor) {
    const rankColor = getRankColor(newRank);
    
    // 1. RANK UP! テキストを表示
    showRankUpText(newRank, oldRankColor);
    
    // 2. プログレスバーのリセットアニメーション
    animateProgressBarReset(rankColor, oldRankColor);
    
    // 3. ランクバッジの色変化アニメーション
    animateRankBadgeChange(newRank, rankColor);
}

// RANK UP! テキストを表示（ランクバッジ部分に）
function showRankUpText(newRank, oldRankColor) {
    const rankBadge = document.querySelector('#rankstatus .badge');
    if (!rankBadge) return;
    
    // 元のバッジ内容を保存
    const originalContent = rankBadge.innerHTML;
    const originalColor = rankBadge.style.backgroundColor;
    
    // CSSアニメーションを追加
    if (!document.getElementById('rankUpAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'rankUpAnimationStyle';
        style.textContent = `
            @keyframes rankUpPulse {
                0% { transform: scale(1); }
                25% { transform: scale(1.3); }
                50% { transform: scale(1.1); }
                75% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            @keyframes progressReset {
                0% { width: 100%; }
                50% { width: 100%; background-color: #FFD700; }
                100% { width: 0%; }
            }
            
            @keyframes badgeGlow {
                0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
                100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            }
            
            @keyframes textColorFlash {
                0% { color: #FFD700; }
                50% { color: #FFF; }
                100% { color: #FFD700; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ランクアップテキストに変更（背景色は旧ランクの色を使用）
    rankBadge.innerHTML = `<span style="font-size: 1rem; animation: textColorFlash 0.5s ease-in-out 4;">ランクアップ!</span>`;
    rankBadge.style.backgroundColor = oldRankColor; // 旧ランクの色を使用
    rankBadge.style.animation = 'rankUpPulse 2s ease-in-out';
    
    // 2秒後に新しいランク表示に変更
    setTimeout(() => {
        rankBadge.textContent = newRank;
        rankBadge.style.backgroundColor = getRankColor(newRank);
        // すべてのランクで白文字を使用（視認性向上）
        rankBadge.style.color = '#fff';
        rankBadge.style.animation = '';
    }, 2000);
}

// プログレスバーのリセットアニメーション
function animateProgressBarReset(newColor, oldRankColor) {
    const progressBar = document.querySelector('#rankstatus .progress-bar');
    const progressText = document.querySelector('#rankstatus .d-flex.align-baseline.justify-content-end');
    
    if (progressBar) {
        // 現在の旧ランクの色を保持
        progressBar.style.backgroundColor = oldRankColor;
        
        // CSSアニメーションを追加（旧ランク色ベースのリセットアニメーション）
        if (!document.getElementById('progressResetStyle')) {
            const style = document.createElement('style');
            style.id = 'progressResetStyle';
            style.textContent = `
                @keyframes progressResetFromOld {
                    0% { width: 100%; }
                    50% { width: 100%; background-color: #FFD700; }
                    100% { width: 0%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // リセットアニメーションを適用
        progressBar.style.animation = 'progressResetFromOld 1.5s ease-in-out';
        
        // 進捗テキストも即座に「次の〇〇ランクまであと0ポイント」に変更
        if (progressText) {
            const totalRehab = calculateAndSaveTotalRehab();
            const currentRank = getCurrentRank(totalRehab);
            const nextRank = getNextRank(currentRank);
            if (nextRank) {
                const nextRankColor = getRankColor(nextRank);
                progressText.innerHTML = `<span style="display: inline-flex; align-items: baseline;"><span class="badge rounded-pill text-white" style="background-color: ${nextRankColor}; font-size: 1.1rem; margin: 0 4px;">${nextRank}</span>ランクまで<span style="font-size: 1.5rem; font-weight: bold; color: ${nextRankColor}; margin: 0 2px;">0</span>ポイント</span>`;
            } else {
                // プラチナランクの場合は「最高ランクに到達！」を表示
                const platinumColor = getRankColor('プラチナ');
                progressText.innerHTML = `<span style="display: inline-flex; align-items: baseline; color: ${platinumColor}; font-weight: bold;">最高ランクに到達！</span>`;
            }
        }
        
        // アニメーション完了後に新しい状態に更新
        setTimeout(() => {
            progressBar.style.animation = '';
            updateRankDisplay(); // 通常の表示に戻す
        }, 1500);
    }
}

// ランクバッジの色変化アニメーション
function animateRankBadgeChange(newRank, newColor) {
    // showRankUpText内でバッジの更新も行うため、ここでは追加のグロー効果のみ適用
    const rankBadge = document.querySelector('#rankstatus .badge');
    if (rankBadge) {
        // 2秒後（ランクアップテキスト表示後）にグロー効果を追加
        setTimeout(() => {
            rankBadge.style.animation = 'badgeGlow 1s ease-in-out 2';
            
            // グロー効果終了後にアニメーションを削除
            setTimeout(() => {
                rankBadge.style.animation = '';
            }, 2000);
        }, 2000);
    }
}

// カレンダーページ用のランク情報表示関数
function updateCalendarRankDisplay() {
    // DOM要素が存在しない場合は処理をスキップ
    const rankStatusRow = document.querySelector('#rank-status-row');
    if (!rankStatusRow) {
        return;
    }
    
    const totalRehab = calculateAndSaveTotalRehab();
    const currentRank = getCurrentRank(totalRehab);
    const rankProgress = getRankProgress(totalRehab);
    
    const ranks = ['ビギナー', 'ブロンズ', 'シルバー', 'ゴールド', 'プラチナ'];
    const rankThresholds = {
        'ビギナー': 0,
        'ブロンズ': 10,
        'シルバー': 30,
        'ゴールド': 60,
        'プラチナ': 100
    };
    
    // 各ランクのセルを生成
    rankStatusRow.innerHTML = '';
    
    ranks.forEach(rank => {
        const cell = document.createElement('td');
        cell.className = 'text-center p-1';
        
        if (totalRehab >= rankThresholds[rank] && rank !== currentRank) {
            // 到達済みランク（現在ランク以外）
            const rankColor = getRankColor(rank);
            cell.innerHTML = `<i class="bi bi-award-fill" style="font-size: 2.2rem; color: ${rankColor};"></i>`;
        } else if (rank === currentRank) {
            // 現在のランク
            if (rank === 'プラチナ') {
                // プラチナは最高ランクなのでバッジアイコン表示
                const rankColor = getRankColor(rank);
                cell.innerHTML = `<i class="bi bi-award-fill" style="font-size: 2.2rem; color: ${rankColor};"></i>`;
            } else {
                // 次のランクまでの残り表示
                const remaining = rankProgress.required - rankProgress.current;
                cell.innerHTML = `
                    <div style="font-size: 1.0rem; line-height: 1.2;">
                        <div>あと</div>
                        <div style="font-size: 1.6rem; font-weight: bold;">${remaining}</div>
                        <div>ポイント</div>
                    </div>
                `;
            }
        } else {
            // 未到達ランク
            cell.innerHTML = `<i class="bi bi-award" style="font-size: 2.2rem; color: #6c757d;"></i>`;
        }
        
        rankStatusRow.appendChild(cell);
    });
}

// index.html用のランク情報表示関数
function updateIndexRankDisplay() {
    // DOM要素が存在しない場合は処理をスキップ
    const rankStatusRow = document.querySelector('#rank-status-row-index');
    if (!rankStatusRow) {
        return;
    }
    
    const totalRehab = calculateAndSaveTotalRehab();
    const currentRank = getCurrentRank(totalRehab);
    const rankProgress = getRankProgress(totalRehab);
    
    const ranks = ['ビギナー', 'ブロンズ', 'シルバー', 'ゴールド', 'プラチナ'];
    const rankThresholds = {
        'ビギナー': 0,
        'ブロンズ': 10,
        'シルバー': 30,
        'ゴールド': 60,
        'プラチナ': 100
    };
    
    // 各ランクのセルを生成
    rankStatusRow.innerHTML = '';
    
    ranks.forEach(rank => {
        const cell = document.createElement('td');
        cell.className = 'text-center p-1';
        
        let cellContent = '';
        
        if (totalRehab >= rankThresholds[rank] && rank !== currentRank) {
            // 到達済みランク（現在ランク以外）
            const rankColor = getRankColor(rank);
            cellContent = `<i class="bi bi-award-fill" style="font-size: 3rem; color: ${rankColor};"></i>`;
        } else if (rank === currentRank) {
            // 現在のランク
            const rankColor = getRankColor(rank);
            if (rank === 'プラチナ') {
                // プラチナは最高ランクなので塗りつぶしアイコンを表示
                cellContent = `<i class="bi bi-award-fill" style="font-size: 3rem; color: ${rankColor};"></i>`;
            } else {
                // その他のランクは輪郭のみのアイコンを表示
                cellContent = `<i class="bi bi-award" style="font-size: 3rem; color: ${rankColor};"></i>`;
            }
            // 現在のランクの下に「あなた」の吹き出しを追加
            cellContent += `<div><span class="current-rank-indicator" style="background-color: ${rankColor}; --indicator-color: ${rankColor};">あなた</span></div>`;
        } else {
            // 未到達ランク
            cellContent = `<i class="bi bi-award" style="font-size: 3rem; color: #6c757d;"></i>`;
        }
        
        cell.innerHTML = cellContent;
        rankStatusRow.appendChild(cell);
    });
}

// **統合テスト用診断関数 (フェーズ3)**
function runIntegrationDiagnostics() {
    console.log('=== 連続記録機能 統合診断開始 ===');
    
    // 1. RestDayManager の状態確認
    const restDayStatus = RestDayManager ? 'OK' : 'ERROR';
    console.log(`1. RestDayManager: ${restDayStatus}`);
    
    if (RestDayManager) {
        const today = new Date().toISOString().split('T')[0];
        const isToday = RestDayManager.isRestDay(today);
        console.log(`   - 今日(${today})が休日: ${isToday}`);
        
        // データ整合性チェック
        try {
            const testDate = '2025-09-01';
            RestDayManager.addRestDay(testDate);
            const added = RestDayManager.isRestDay(testDate);
            RestDayManager.removeRestDay(testDate);
            const removed = !RestDayManager.isRestDay(testDate);
            console.log(`   - データ操作テスト: ${added && removed ? 'OK' : 'ERROR'}`);
        } catch (e) {
            console.error('   - データ操作テストエラー:', e);
        }
    }
    
    // 2. 連続記録計算機能
    try {
        const consecutiveDays = getConsecutiveDays();
        console.log(`2. 連続記録計算: OK (${consecutiveDays}日)`);
    } catch (e) {
        console.error('2. 連続記録計算: ERROR', e);
    }
    
    // 3. UI表示機能
    const progressBarExists = document.getElementById('progress');
    const rankStatusExists = document.getElementById('rankstatus');
    console.log(`3. UI要素存在確認:`);
    console.log(`   - プログレスバー: ${progressBarExists ? 'OK' : 'ERROR'}`);
    console.log(`   - ランクステータス: ${rankStatusExists ? 'OK' : 'ERROR'}`);
    
    // 4. 依存関係確認
    const dependencies = {
        'localStorage': typeof localStorage !== 'undefined',
        'Date': typeof Date !== 'undefined',
        'bootstrap': typeof bootstrap !== 'undefined',
        'ProgressBar': typeof ProgressBar !== 'undefined'
    };
    
    console.log('4. 依存関係確認:');
    Object.entries(dependencies).forEach(([name, exists]) => {
        console.log(`   - ${name}: ${exists ? 'OK' : 'ERROR'}`);
    });
    
    // 5. LocalStorage データ確認
    console.log('5. データ状況:');
    const dataKeys = ['each0', 'each1', 'each2', 'each3'];
    dataKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`   - ${key}: ${value || 'なし'}`);
    });
    
    const restDayKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('rest_'))
        .slice(0, 5); // 最初の5つのみ表示
    console.log(`   - 休日データ: ${restDayKeys.length}件 ${restDayKeys.length > 0 ? '例: ' + restDayKeys[0] : ''}`);
    
    console.log('=== 統合診断完了 ===');
}

// 初期化とテスト実行
document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js-row2265-started');
    console.log('=== アプリケーション初期化開始 ===');
    
    // **チカチカ防止: 表示状態をリセット**
    DisplayState.reset();
    DisplayState.isInitializing = true;
    
    // 予約システム実装に伴うコード
    
    // **フェーズ4: 最適化された初期化プロセス**
    
    // 1. 重要でないキャッシュをクリア（メモリ最適化）
    const now = Date.now();
    if (StorageCache.cache) {
        for (const [key, value] of StorageCache.cache.entries()) {
            if (now - value.timestamp > StorageCache.expiryTime) {
                StorageCache.cache.delete(key);
            }
        }
    }
    
    // 2. 今日のステータス確認と修復
    const today = new Date().toISOString().split('T')[0];
    const todayStatusKey = `status_${today}`;
    const todayStatus = localStorage.getItem(todayStatusKey);
    
    // 有効なリハビリ数を動的に計算
    let totalRehabs = 0;
    for (let i = 1; i <= 4; i++) {
        if (localStorage.getItem(`rehabilitation${i}`) === 'true') {
            totalRehabs++;
        }
    }
    
    if (!todayStatus && totalRehabs > 0) {
        console.log('今日のステータスが不足しています。修復を試みます...');
        // 今日のステータスが存在しない場合は、saveTrueCountToLocalStorageを実行
        try {
            saveTrueCountToLocalStorage();
            console.log('今日のステータスを修復しました');
            
            // 修復後、連続記録キャッシュもクリア
            const cacheKey = `consecutive_cache_${today}`;
            localStorage.removeItem(cacheKey);
            console.log(`修復に伴い連続記録キャッシュをクリア: ${cacheKey}`);
        } catch (error) {
            console.error('ステータス修復エラー:', error);
        }
    } else if (todayStatus) {
        console.log(`今日のステータス確認済み: ${todayStatusKey} = ${todayStatus}`);
    }

    // 3. 休日表示の処理
    handleRestDayDisplay();

    // 4. 統合診断実行（開発時のみ）
    if (window.location.search.includes('debug=true')) {
        setTimeout(() => {
            runIntegrationDiagnostics();
        }, 500); // 他の初期化処理の後に実行
    }
    
    // 3. メイン処理実行（デバウンス適用）
    const initPromises = [];
    
    // 非同期で初期状態表示
    initPromises.push(new Promise(resolve => {
        setTimeout(() => {
            try {
                if (typeof debouncedDisplayInitialStatus === 'function') {
                    debouncedDisplayInitialStatus();
                } else if (typeof displayInitialStatus === 'function') {
                    displayInitialStatus();
                } else {
                    console.warn('displayInitialStatus関数が見つかりません');
                }
                resolve();
            } catch (error) {
                console.error('初期状態表示エラー:', error);
                resolve();
            }
        }, 50);
    }));
    
    // 非同期で連続記録表示
    initPromises.push(new Promise(resolve => {
        setTimeout(() => {
            try {
                if (typeof debouncedDisplayConsecutiveMessage === 'function') {
                    debouncedDisplayConsecutiveMessage();
                } else if (typeof displayConsecutiveMessage === 'function') {
                    displayConsecutiveMessage();
                } else {
                    console.warn('displayConsecutiveMessage関数が見つかりません');
                }
                resolve();
            } catch (error) {
                console.error('連続記録表示エラー:', error);
                resolve();
            }
        }, 100);
    }));
    
    // 非同期で節目メッセージ表示
    initPromises.push(new Promise(resolve => {
        setTimeout(() => {
            try {
                if (typeof displayMilestoneMessage === 'function') {
                    displayMilestoneMessage();
                } else {
                    console.warn('displayMilestoneMessage関数が見つかりません');
                }
                resolve();
            } catch (error) {
                console.error('節目メッセージ表示エラー:', error);
                resolve();
            }
        }, 150);
    }));
    
    // 全ての初期化完了を待機
    Promise.all(initPromises).then(() => {
        DisplayState.isInitializing = false;
        console.log('=== アプリケーション初期化完了 ===');
        
        // パフォーマンス統計の表示（デバッグモード時）
        if (window.location.search.includes('debug=true')) {
            console.log('=== パフォーマンス統計 ===');
            console.log(`キャッシュエントリ数: ${StorageCache.cache ? StorageCache.cache.size : 0}`);
            console.log(`LocalStorage使用量: ${JSON.stringify(localStorage).length} 文字`);
            console.log(`表示状態: 連続記録=${DisplayState.consecutiveMessageShown}, 節目=${DisplayState.milestoneMessageShown}`);
            console.log('=== 統計終了 ===');
        }
    }).catch(error => {
        console.error('初期化エラー:', error);
        DisplayState.isInitializing = false;
    });
    
    // 5. **自主トレーニング設定の読み込み**
    if (typeof SelfTrainingSettings !== 'undefined') {
        SelfTrainingSettings.loadSettings();
        
        // 古いテキストデータのクリーンアップ（週1回実行）
        const lastCleanup = localStorage.getItem('lastSelfTrainingCleanup');
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000; // 1週間
        
        if (!lastCleanup || now - parseInt(lastCleanup) > weekInMs) {
            const cleanedCount = SelfTrainingManager.cleanOldTextData();
            if (cleanedCount > 0) {
                console.log(`自主トレーニング: ${cleanedCount}件の古いテキストを削除しました`);
            }
            localStorage.setItem('lastSelfTrainingCleanup', now.toString());
        }
    }
    
    // 6. **パフォーマンス監視: メモリ使用量チェック**
    if (window.performance && window.performance.memory) {
        const memInfo = window.performance.memory;
        if (memInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB超過時
            console.warn('メモリ使用量が高いです。キャッシュを清理します。');
            StorageCache.clear();
        }
    }
});

// **カウンターシステム初期化とテスト実行**
document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js-row2434-started');
    // 開発環境でのみテスト実行（本番環境では無効化）
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        console.log('開発環境でカウンターシステムテストを実行中...');
        
        // テスト実行（非同期で実行してページ読み込みをブロックしない）
        setTimeout(() => {
            try {
                const testResult = CounterSystemTester.runAllTests();
                if (testResult) {
                    console.log('🎉 カウンターシステムのテストが全て成功しました！');
                } else {
                    console.warn('⚠️ 一部のテストが失敗しました。');
                }
            } catch (error) {
                console.error('テスト実行エラー:', error);
            }
        }, 1000);
    }
    
    // システム情報をコンソールに出力
    console.log('=== マイリハビリシステム - カウンター方式対応版 ===');
    console.log('バージョン: 6.1.1');
    console.log('機能: 1日複数回リハビリ記録対応');
    console.log('互換性: 既存データとの完全互換性');
    console.log('マイグレーション: 自動実行');
    console.log('===================================');
});
