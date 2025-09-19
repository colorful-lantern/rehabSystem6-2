document.addEventListener('DOMContentLoaded', function() {
  // モーダルのOKボタン取得
  const confirmModal = document.getElementById('confirmModal');
  if (!confirmModal) return;

  confirmModal.addEventListener('shown.bs.modal', function() {
    const okBtn = confirmModal.querySelector('.btn.btn-primary');
    if (!okBtn) return;

    // 既存のイベントを一度解除
    okBtn.onclick = null;

    okBtn.onclick = function() {
      // 日付取得
      const dateInput = document.getElementById('date');
      let dateValue = dateInput.value;
      if (!dateValue) return;

      // yyyy-mm-dd 0埋め
      const dateObj = new Date(dateValue);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const key = `reserve_${yyyy}-${mm}-${dd}`;

      // 各リハビリの値取得
      let values = [];
      for (let i = 0; i <= 3; i++) {
        const radios = document.getElementsByName(`btnradio${i}`);
        let y = 0;
        radios.forEach(radio => {
          if (radio.checked) {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            y = label.getAttribute('value');
          }
        });
        values.push(`each${i}=${y}`);
      }
      // 自主トレーニング
      const radios4 = document.getElementsByName('btnradio4');
      let y4 = 0;
      radios4.forEach(radio => {
        if (radio.checked) {
          const label = document.querySelector(`label[for="${radio.id}"]`);
          // valueが"false"なら0, "1"なら1
          y4 = (label.getAttribute('value') === '1') ? 1 : 0;
        }
      });
      values.push(`each4=${y4}`);

      // 「リハビリに取り組みますか？」の選択状態を取得
      const btnradio2 = document.getElementById('btnradio2'); // いいえ
      const isRestDay = btnradio2 && btnradio2.checked;
      const restKey = `rest_${yyyy}_${mm}`;

      // 保存
      const value = values.join(',');
      localStorage.setItem(key, value);

      if (isRestDay) {
        // 休みの日として予約された場合、rest_yyyy-mmに追記保存
        let restDays = localStorage.getItem(restKey);
        let restArr = restDays ? restDays.split(',').map(s => s.trim()).filter(s => s) : [];
        if (!restArr.includes(dd)) {
          restArr.push(dd);
          restArr = restArr.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
          localStorage.setItem(restKey, restArr.join(','));
        }
      } else {
        // 休みの日からリハビリありに変更した場合、rest_yyyy-mmから該当日を削除
        let restDays = localStorage.getItem(restKey);
        if (restDays) {
          let restArr = restDays.split(',').map(s => s.trim()).filter(s => s);
          if (restArr.includes(dd)) {
            restArr = restArr.filter(day => day !== dd);
            if (restArr.length > 0) {
              localStorage.setItem(restKey, restArr.join(','));
            } else {
              localStorage.removeItem(restKey);
            }
          }
        }
      }

      // 完了アラート表示
      const messageArea = document.getElementById('messageArea');
      if (messageArea) {
        messageArea.innerHTML = `
          <div class="alert alert-success alert-dismissible fade show m-3" role="alert">
            予約が完了しました。${isRestDay ? '<br>休みの日として登録されました。' : ''}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `;
        // #messageAreaまでスクロール
        messageArea.scrollIntoView({ behavior: 'smooth' });
        messageArea.style.display = 'block';
        // 5秒後に自動でアラートを閉じる
        setTimeout(() => {
          const alert = bootstrap.Alert.getOrCreateInstance(messageArea.querySelector('.alert'));
          alert.close();
        }, 5000);
      }
    };
  });
});
