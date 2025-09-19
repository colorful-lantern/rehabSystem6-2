// checkReserve.js - 予約データをリハビリ設定に反映
(function() {
    'use strict';
    
    // 最初に実行されることを確認
    console.log('=== checkReserve.js STARTED ===');
    console.log('Current time:', new Date().toISOString());
    
    // 休日チェック機能を追加
    function isRestDay(dateStr) {
        try {
            const [year, month, day] = dateStr.split('-');
            const restKey = `rest_${year}_${month}`;
            const restDays = localStorage.getItem(restKey);
            
            if (restDays) {
                const restArray = restDays.split(',').map(d => d.trim());
                return restArray.includes(day);
            }
            return false;
        } catch (error) {
            console.error('休日チェックエラー:', error);
            return false;
        }
    }
    
    // 即座に実行する関数
    function processReserveData() {
        console.log('=== processReserveData() CALLED ===');
        try {
            // 今日の日付を取得（yyyy-mm-dd形式）
            const today = new Date().toISOString().split('T')[0];
            const reserveKey = `reserve_${today}`;
            const reserveValue = localStorage.getItem(reserveKey);
            
            console.log(`Checking reserve data for ${today}:`, reserveValue);
            
            // 休日チェック
            const isToday休日 = isRestDay(today);
            console.log(`Today is rest day: ${isToday休日}`);

            if (reserveValue) {
                // データ例: each0=1,each1=1,each2=1,each3=1,each4=0
                const items = reserveValue.split(',');
                console.log('Parsed reserve items:', items);
                
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
                console.log('Rehab counts:', rehabCounts);
                
                // 休日の場合は特別処理
                if (isToday休日) {
                    console.log('=== REST DAY PROCESSING ===');
                    // 休日の場合はrehabilitation1をtrueに設定してリダイレクトを防ぐ
                    localStorage.setItem('rehabilitation1', 'true');  // 休日でもリダイレクトを防ぐため
                    for (let i = 1; i < 5; i++) {
                        const key = `rehabilitation${i+1}`;
                        localStorage.setItem(key, 'false');
                        console.log(`Set ${key} = false (rest day)`);
                    }
                    // 休日でも予約があった場合は合計個数を計算
                    const totalReservations = rehabCounts.reduce((sum, count) => sum + count, 0);
                    const finalCount = Math.max(1, totalReservations); // 最低1に設定してリダイレクトを防ぐ
                    localStorage.setItem('numberofClass', finalCount.toString());
                    console.log('Set rehabilitation1 = true (rest day - prevent redirect)');
                    console.log(`Set numberofClass = ${finalCount} (rest day - total reservations or minimum 1)`);
                } else {
                    // 通常のリハビリ日処理
                    let totalReservations = 0;
                    for (let i = 0; i < 5; i++) {
                        const key = `rehabilitation${i+1}`;
                        const value = rehabCounts[i] > 0 ? 'true' : 'false';
                        localStorage.setItem(key, value);
                        totalReservations += rehabCounts[i]; // 予約された個数を合計
                        console.log(`Set ${key} = ${value} (count: ${rehabCounts[i]})`);
                    }
                    
                    // numberofClassを予約したリハビリの個数の合計に更新
                    localStorage.setItem('numberofClass', totalReservations.toString());
                    console.log(`Set numberofClass = ${totalReservations} (total reservations)`);
                }
                
            } else {
                // 今日の予約データがない場合
                if (isToday休日) {
                    console.log('No reserve data found, but today is rest day');
                    localStorage.setItem('rehabilitation1', 'true');  // 休日でもリダイレクトを防ぐため
                    for (let i = 1; i < 5; i++) {
                        const key = `rehabilitation${i+1}`;
                        localStorage.setItem(key, 'false');
                        console.log(`Set ${key} = false (rest day)`);
                    }
                    localStorage.setItem('numberofClass', '1'); // 休日なので1に設定してリダイレクトを防ぐ
                    console.log('Set rehabilitation1 = true (rest day - prevent redirect)');
                    console.log('Set numberofClass = 1 (rest day - prevent redirect)');
                } else {
                    console.log('No reserve data found, setting all rehab to false');
                    for (let i = 0; i < 5; i++) {
                        const key = `rehabilitation${i+1}`;
                        localStorage.setItem(key, 'false');
                        console.log(`Set ${key} = false`);
                    }
                    localStorage.setItem('numberofClass', '0');
                    console.log('Set numberofClass = 0');
                }
            }
            
            console.log('=== processReserveData() COMPLETED SUCCESSFULLY ===');
            
            // 休日の場合は追加で確実にリダイレクトを防ぐ
            if (isToday休日) {
                console.log('=== ADDITIONAL REST DAY PROTECTION ===');
                // script.jsの loadCheckboxStates() よりも後で実行されるように、即座に再設定
                setTimeout(() => {
                    localStorage.setItem('rehabilitation1', 'true');
                    localStorage.setItem('numberofClass', '1');
                    console.log('REST DAY: Re-enforced settings to prevent redirect');
                }, 50);
            }
            
            return true;
            
        } catch (error) {
            console.error('=== ERROR in processReserveData() ===', error);
            return false;
        }
    }
    
    // 即座に実行
    console.log('=== CALLING processReserveData() IMMEDIATELY ===');
    const success = processReserveData();
    console.log(`=== processReserveData() result: ${success} ===`);
    
    // LocalStorageの状況をダンプ
    console.log('=== CURRENT LOCALSTORAGE STATUS ===');
    console.log('rehabilitation1:', localStorage.getItem('rehabilitation1'));
    console.log('rehabilitation2:', localStorage.getItem('rehabilitation2'));
    console.log('rehabilitation3:', localStorage.getItem('rehabilitation3'));
    console.log('rehabilitation4:', localStorage.getItem('rehabilitation4'));
    console.log('rehabilitation5:', localStorage.getItem('rehabilitation5'));
    console.log('numberofClass:', localStorage.getItem('numberofClass'));
    console.log('=== END LOCALSTORAGE STATUS ===');
    
    // DOMContentLoaded時に再描画関数を呼び出し
    document.addEventListener('DOMContentLoaded', function() {
        console.log('checkReserve.js DOMContentLoaded - calling display functions...');
        
        // 少し遅延させて他のスクリプトの初期化を待つ
        setTimeout(function() {
            if (typeof displayIconsBasedOnLocalStorage === 'function') {
                displayIconsBasedOnLocalStorage();
                console.log('displayIconsBasedOnLocalStorage called');
            } else {
                console.warn('displayIconsBasedOnLocalStorage is not available');
            }
            
            if (typeof saveTrueCountToLocalStorage === 'function') {
                saveTrueCountToLocalStorage();
                console.log('saveTrueCountToLocalStorage called');
            } else {
                console.warn('saveTrueCountToLocalStorage is not available');
            }
        }, 100);
    });
    
})();

