// 予約数を上回るリハビリの記録を防ぐ機能
const urlParams = new URLSearchParams(window.location.search);

// 今日の日付を取得
const today = new Date().toISOString().split('T')[0];

// 今日の予約情報を取得
const reserveKey = `reserve_${today}`;
const reserveData = localStorage.getItem(reserveKey);

if (reserveData) {
    // 予約データを解析（例: "each0=2,each1=1,each2=3,each3=0,each4=1"）
    const reserveCounts = {};
    reserveData.split(',').forEach(item => {
        const [key, value] = item.split('=');
        if (key && value !== undefined) {
            const rehabType = key.replace('each', '');
            reserveCounts[rehabType] = parseInt(value, 10) || 0;
        }
    });

    // 現在の実行回数を取得
    const currentCounts = {};
    for (let i = 0; i <= 4; i++) {
        const countKey = `each${i}_count`;
        currentCounts[i] = parseInt(localStorage.getItem(countKey), 10) || 0;
    }

    // URLパラメータをチェックして制限を適用（each4は自主トレーニングなので除外）
    let limitExceeded = false;
    let exceededTypes = [];

    for (let i = 0; i <= 3; i++) {
        if (urlParams.get(`each${i}`) === 'true') {
            const reservedCount = reserveCounts[i] || 0;
            const currentCount = currentCounts[i] || 0;

            // 予約数が0または予約数を上回る場合はURLパラメータを削除
            if (reservedCount === 0 || currentCount >= reservedCount) {
                urlParams.delete(`each${i}`);
                limitExceeded = true;
                exceededTypes.push(i);
            }
        }
    }

    // 制限に引っかかった場合の処理
    if (limitExceeded) {
        // reloadAlertに警告メッセージを表示
        const reloadAlert = document.getElementById('reloadAlert');
        // dateには今日の日付をyyyy-mm-dd形式で表示
        const date = today;
        if (reloadAlert) {
            reloadAlert.innerHTML = `
                <div class="alert alert-warning m-2 text-center">
                    <i class="bi bi-exclamation-triangle-fill text-black me-2"></i>
                    <p class="text-center text-black d-inline">予約を上回るリハビリの記録はできません</p>
                    <button id="reserveBtn" class="btn btn-warning mt-2">予約状況を確認する</button>
                </div>
            `;
            document.getElementById('reserveBtn').onclick = function() {
                window.location.href = `reserve.html?date=${date}`;
            };
            setTimeout(() => {
                reloadAlert.innerHTML = '';
            }, 10000);
        }

        // URLを更新（無効化されたパラメータを除去）
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);
    }
}
