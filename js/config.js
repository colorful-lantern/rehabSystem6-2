// last updated 2025.6.26
// 各リハビリのランダムIDを定義
const REHAB_IDS = {
    0: 'each0',    // 理学療法用
    1: 'each1',    // 言語療法用
    2: 'each2',    // 作業療法用
    3: 'each3',    // 心理療法用
    4: 'each4'     // 自主トレーニング用
};

// 逆引き用マッピング（ランダムIDから番号を取得）
const REHAB_ID_TO_INDEX = {};
Object.keys(REHAB_IDS).forEach(index => {
    REHAB_ID_TO_INDEX[REHAB_IDS[index]] = parseInt(index);
});

// ヘルパー関数
function getRehabId(index) {
    return REHAB_IDS[index] || `each${index}`;
}

function getIndexFromRehabId(rehabId) {
    return REHAB_ID_TO_INDEX[rehabId] !== undefined ? REHAB_ID_TO_INDEX[rehabId] : null;
}

// 自主トレーニング設定
const SELF_TRAINING_CONFIG = {
    // 自主トレーニングをポイント計算に含めるかどうか
    INCLUDE_IN_POINTS: false, // 後で変更可能
    
    // 自主トレーニングの基本設定
    REHAB_INDEX: 4,
    REHAB_KEY: 'rehabilitation5',
    EACH_KEY: 'each4',
    
    // テキストデータ設定
    MAX_TEXT_LENGTH: 500,
    TEXT_RETENTION_DAYS: 90,
    
    // 表示設定
    SHOW_IN_CALENDAR: true, // カレンダー表示は常に有効
    ICON_CLASS: 'bi-journal-text' // 自主トレーニング用アイコン
};

// 自主トレーニングデータ管理クラス
const SelfTrainingManager = {
    // テキストデータ（90日で削除）
    TEXT_PREFIX: 'selftext_',
    
    // 実施記録データ（永続保存）
    RECORD_PREFIX: 'selfrec_',
    
    // テキスト圧縮（簡易版）
    compressText: function(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').substring(0, SELF_TRAINING_CONFIG.MAX_TEXT_LENGTH);
    },
    
    // 記録保存（二重管理）
    saveRecord: function(dateStr, textContent) {
        try {
            // 1. 実施記録の保存（永続）
            const recordKey = `${this.RECORD_PREFIX}${dateStr}`;
            localStorage.setItem(recordKey, 'true');
            
            // 2. テキスト内容の保存（90日限定）
            if (textContent && textContent.trim()) {
                const textKey = `${this.TEXT_PREFIX}${dateStr}`;
                const compressedText = this.compressText(textContent);
                localStorage.setItem(textKey, compressedText);
            }
            
            // 3. each4 の更新（当日の進捗用）
            const today = new Date().toISOString().split('T')[0];
            if (dateStr === today) {
                localStorage.setItem(SELF_TRAINING_CONFIG.EACH_KEY, 'true');
            }
            
            console.log(`自主トレーニング記録保存: ${dateStr}`);
            return true;
        } catch (error) {
            console.error('自主トレーニング記録保存エラー:', error);
            return false;
        }
    },
    
    // テキスト削除（90日後）
    cleanOldTextData: function() {
        let cleanedCount = 0;
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - SELF_TRAINING_CONFIG.TEXT_RETENTION_DAYS);
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.TEXT_PREFIX)) {
                    const dateStr = key.replace(this.TEXT_PREFIX, '');
                    const recordDate = new Date(dateStr);
                    if (recordDate < cutoffDate) {
                        localStorage.removeItem(key); // テキストのみ削除
                        cleanedCount++;
                        console.log(`自主トレーニングテキスト削除: ${dateStr}`);
                    }
                }
            });
        } catch (error) {
            console.error('古いテキストデータ削除エラー:', error);
        }
        return cleanedCount;
    },
    
    // 実施記録の確認（永続データ）
    hasRecord: function(dateStr) {
        const recordKey = `${this.RECORD_PREFIX}${dateStr}`;
        return localStorage.getItem(recordKey) === 'true';
    },
    
    // テキスト内容の取得（90日以内のみ）
    getTextContent: function(dateStr) {
        const textKey = `${this.TEXT_PREFIX}${dateStr}`;
        return localStorage.getItem(textKey);
    },
    
    // 記録削除（管理画面用）
    deleteRecord: function(dateStr) {
        try {
            // 実施記録の削除
            const recordKey = `${this.RECORD_PREFIX}${dateStr}`;
            localStorage.removeItem(recordKey);
            
            // テキスト内容の削除（あれば）
            const textKey = `${this.TEXT_PREFIX}${dateStr}`;
            localStorage.removeItem(textKey);
            
            // 今日の場合はeach4も削除
            const today = new Date().toISOString().split('T')[0];
            if (dateStr === today) {
                localStorage.removeItem(SELF_TRAINING_CONFIG.EACH_KEY);
            }
            
            console.log(`自主トレーニング記録削除: ${dateStr}`);
            return true;
        } catch (error) {
            console.error('自主トレーニング記録削除エラー:', error);
            return false;
        }
    },
    
    // データサイズを計算
    getDataSize: function() {
        let totalSize = 0;
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.TEXT_PREFIX) || key.startsWith(this.RECORD_PREFIX)) {
                    totalSize += key.length + (localStorage.getItem(key) || '').length;
                }
            });
        } catch (error) {
            console.error('自主トレーニングデータサイズ計算エラー:', error);
        }
        return totalSize;
    }
};

// 自主トレーニング設定管理クラス
const SelfTrainingSettings = {
    SETTINGS_KEY: 'selfTrainingSettings',
    
    // ポイント計算への包含設定を変更
    setIncludeInPoints: function(include) {
        SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS = include;
        // 設定をLocalStorageに保存（永続化）
        this.saveSettings();
        
        console.log(`自主トレーニングポイント計算設定: ${include ? '含める' : '含めない'}`);
        return true;
    },
    
    // 設定の保存
    saveSettings: function() {
        try {
            const settings = {
                includeInPoints: SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('自主トレーニング設定保存エラー:', error);
            return false;
        }
    },
    
    // 設定の読み込み
    loadSettings: function() {
        try {
            const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS = settings.includeInPoints !== undefined ? 
                    settings.includeInPoints : false;
                console.log(`自主トレーニング設定読み込み: ポイント計算${SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS ? '含む' : '含まない'}`);
                return true;
            }
        } catch (error) {
            console.error('自主トレーニング設定読み込みエラー:', error);
        }
        return false;
    },
    
    // 設定のリセット
    resetSettings: function() {
        SELF_TRAINING_CONFIG.INCLUDE_IN_POINTS = false;
        localStorage.removeItem(this.SETTINGS_KEY);
        console.log('自主トレーニング設定をリセットしました');
    }
};

// 休日管理クラス（永年保存対応）
const RestDayManager = {
    // 月別キーを生成
    getMonthKey: function(year, month) {
        return `rest_${year}_${month.toString().padStart(2, '0')}`;
    },

    // 休日を追加
    addRestDay: function(dateStr) {
        try {
            const [year, month, day] = dateStr.split('-');
            const key = this.getMonthKey(year, month);
            const currentData = localStorage.getItem(key);
            const restDays = currentData ? currentData.split(',').filter(d => d.length > 0) : [];
            
            if (!restDays.includes(day)) {
                restDays.push(day);
                restDays.sort((a, b) => parseInt(a) - parseInt(b));
                localStorage.setItem(key, restDays.join(','));
                return true;
            }
            return false;
        } catch (error) {
            console.error('休日追加エラー:', error);
            return false;
        }
    },

    // 休日を削除
    removeRestDay: function(dateStr) {
        try {
            const [year, month, day] = dateStr.split('-');
            const key = this.getMonthKey(year, month);
            const currentData = localStorage.getItem(key);
            
            if (currentData) {
                const restDays = currentData.split(',').filter(d => d !== day && d.length > 0);
                if (restDays.length > 0) {
                    localStorage.setItem(key, restDays.join(','));
                } else {
                    localStorage.removeItem(key);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('休日削除エラー:', error);
            return false;
        }
    },

    // 指定日が休日かチェック
    isRestDay: function(dateStr) {
        try {
            const [year, month, day] = dateStr.split('-');
            const key = this.getMonthKey(year, month);
            const currentData = localStorage.getItem(key);
            return currentData ? currentData.split(',').includes(day) : false;
        } catch (error) {
            console.error('休日チェックエラー:', error);
            return false;
        }
    },

    // 休日状態を切り替え
    toggleRestDay: function(dateStr) {
        if (this.isRestDay(dateStr)) {
            return this.removeRestDay(dateStr);
        } else {
            return this.addRestDay(dateStr);
        }
    },

    // 指定月の休日一覧を取得
    getRestDaysInMonth: function(year, month) {
        try {
            const key = this.getMonthKey(year, month);
            const currentData = localStorage.getItem(key);
            return currentData ? currentData.split(',').filter(d => d.length > 0) : [];
        } catch (error) {
            console.error('月別休日取得エラー:', error);
            return [];
        }
    },

    // 全期間の休日データを取得
    getAllRestDays: function() {
        const restData = {};
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('rest_')) {
                    const [, year, month] = key.split('_');
                    const days = localStorage.getItem(key).split(',').filter(d => d.length > 0);
                    if (days.length > 0) {
                        restData[`${year}-${month}`] = days;
                    }
                }
            });
        } catch (error) {
            console.error('全休日データ取得エラー:', error);
        }
        return restData;
    },

    // データサイズを計算
    getDataSize: function() {
        let totalSize = 0;
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('rest_')) {
                    totalSize += key.length + (localStorage.getItem(key) || '').length;
                }
            });
        } catch (error) {
            console.error('データサイズ計算エラー:', error);
        }
        return totalSize;
    },

    // データを最適化（空の月データ削除）
    optimizeData: function() {
        let optimizedCount = 0;
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('rest_')) {
                    const data = localStorage.getItem(key);
                    if (!data || data.trim() === '' || data === ',') {
                        localStorage.removeItem(key);
                        optimizedCount++;
                    }
                }
            });
        } catch (error) {
            console.error('データ最適化エラー:', error);
        }
        return optimizedCount;
    }
};
