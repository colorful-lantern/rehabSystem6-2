// URLパラメータ処理（スコープ分離）
(function() {
    // URLに?each4=deleteがある場合、#reloadAlertに「自主トレーニング記録を削除しました。」と表示して3秒後にアラートを消す
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('each4') === 'delete') {
        const reloadAlert = document.getElementById('reloadAlert');
        if (reloadAlert) {
            reloadAlert.innerHTML = '<div class="alert alert-info m-2">自主トレーニング記録を削除しました。</div>';
            setTimeout(() => {
                reloadAlert.innerHTML = '';
            }, 3000);
        }
    }else if(urlParams.get('each4')=== 'true'){
        const reloadAlert = document.getElementById('reloadAlert');
        if (reloadAlert) {
            reloadAlert.innerHTML = '<div class="alert alert-info m-2">自主トレーニングを記録しました。</div>';
            setTimeout(() => {
                reloadAlert.innerHTML = '';
            }, 3000);
        }
    }

    // URLの?eachx=true(xは0から4の数字)が1分以内に同じリハビリタイプでアクセスされた場合、重複して記録されることを防ぐため、該当するeachx=trueを無効化し、ブラウザデフォルトアラートを表示する
    const now = Date.now();
    const accessThreshold = 60 * 2000; // 2分

    let alertShown = false;
    for (let i = 0; i <= 3; i++) {
        if (urlParams.get(`each${i}`) === 'true') {
            const lastAccessKey = `lastAccessTime_each${i}`;
            const lastAccessTime = localStorage.getItem(lastAccessKey);
            
            if (lastAccessTime && (now - parseInt(lastAccessTime, 10) < accessThreshold)) {
                if (!alertShown) {
                    alert('短時間に同じリハビリが記録されようとしました。すこし時間をおいて、もう一度同じQRコードを読み込んでください。');
                    alertShown = true;
                }
                urlParams.delete(`each${i}`);
            } else {
                // 新しいアクセス時間を記録
                localStorage.setItem(lastAccessKey, now.toString());
            }
        }
    }

    if (alertShown) {
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);
    }
})();