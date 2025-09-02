// last updated 2025.6.26
// 各リハビリのランダムIDを定義
const REHAB_IDS = {
    0: 'each0',    // 理学療法用
    1: 'each1',    // 言語療法用
    2: 'each2',    // 作業療法用
    3: 'each3'     // 心理療法用
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
