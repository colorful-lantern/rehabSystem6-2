document.addEventListener('DOMContentLoaded', function() {
    // 今日の日付を取得（yyyy-mm-dd形式）
    const today = new Date().toISOString().split('T')[0];
    const reserveKey = `reserve_${today}`;
    const reserveValue = localStorage.getItem(reserveKey);

    if (reserveValue) {
        // データ例: each0=1,each1=0,each2=2,each3=0,each4=1
        const items = reserveValue.split(',');
        // 各リハビリの個数を取得
        let rehabCounts = [0,0,0,0,0];
        items.forEach(item => {
            const match = item.match(/^each(\d)=(\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                const val = parseInt(match[2], 10);
                if (idx >= 0 && idx <= 4) {
                    rehabCounts[idx] = val;
                }
            }
        });
        // rehabCounts: [理学,言語,作業,心理,自主]
        for (let i = 0; i < 5; i++) {
            const key = `rehabilitation${i+1}`;
            if (rehabCounts[i] > 0) {
                localStorage.setItem(key, 'true');
            } else {
                localStorage.setItem(key, 'false');
            }
        }
    }
    // 予約データ反映後に画面再描画・進捗再計算
    if (typeof displayIconsBasedOnLocalStorage === 'function') {
        displayIconsBasedOnLocalStorage();
    }
    if (typeof saveTrueCountToLocalStorage === 'function') {
        saveTrueCountToLocalStorage();
    }
});

