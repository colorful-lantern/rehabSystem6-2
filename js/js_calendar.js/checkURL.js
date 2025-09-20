// もし、urlで?reserve=trueが指定されていたら、アイコン付きのalert alert-successで予約が完了しましたと表示して、10秒後に消す
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reserve') === 'true') {
        const reloadAlert = document.getElementById('messageArea');
        if (reloadAlert) {
            reloadAlert.innerHTML = `
                <div class="alert alert-success m-2" role="alert">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>
                    予約が完了しました。
                </div>
            `;
            setTimeout(() => {
                reloadAlert.innerHTML = '';
            }, 10000);
        }
    }
})();