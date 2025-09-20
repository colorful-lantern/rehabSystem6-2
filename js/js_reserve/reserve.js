// reserve.js
// reserve.html のインラインスクリプトを外部化

let restDay = false; // 休みの日フラグ

document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const rehabCard = document.getElementById('rehabCard');
  const btnradio1 = document.getElementById('btnradio1');
  const btnradio2 = document.getElementById('btnradio2');
  const reserveBtn = document.getElementById('reserveBtn');
  const dateInput = document.getElementById('date');
  const dateError = document.getElementById('dateError');
  const selectError = document.getElementById('selectError');
  const dayselectError = document.getElementById('dayselectError');
  const resultEl = document.getElementById('result');
  const modalBody = document.getElementById('modalBody');

  // 「リハビリに取り組みますか？」の選択状態取得関数
  function getRehabChoice() {
    if (btnradio1.checked) return 'はい';
    if (btnradio2.checked) return 'いいえ';
    return '';
  }

  // 予約データが存在するかチェックする関数
  function hasReservationData(date) {
    if (!date) return false;
    const key = `reserve_${date}`;
    return localStorage.getItem(key) !== null;
  }

  // 自動入力通知メッセージを表示/非表示する関数
  function showAutoInputNotification(show) {
    const rehabCardBody = rehabCard.querySelector('.card-body');
    let notification = rehabCardBody.querySelector('#autoInputNotification');
    
    if (show) {
      if (!notification) {
        // 通知メッセージを作成
        notification = document.createElement('div');
        notification.id = 'autoInputNotification';
        notification.className = 'mb-3 fw-bold text-primary text-start';
        notification.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>すでに予約されている情報を表示しています';
        
        // 理学療法のdivの前に挿入
        const firstRehabDiv = rehabCardBody.querySelector('.mb-3');
        rehabCardBody.insertBefore(notification, firstRehabDiv);
      }
      notification.style.display = 'block';
    } else {
      if (notification) {
        notification.style.display = 'none';
      }
    }
  }

  // リハビリ選択を初期状態にリセットする関数
  function resetRehabSelections() {
    // 各リハビリ（理学療法～心理療法）を「しない」に設定
    for (let i = 0; i <= 3; i++) {
      const radioId = `each${i}_btnradio1`; // 「しない」は常に1番目
      const radio = document.getElementById(radioId);
      if (radio) {
        radio.checked = true;
      }
    }
    
    // 自主トレーニングを「しない」に設定
    const selfTrainingRadio = document.getElementById('each4_btnradio1');
    if (selfTrainingRadio) {
      selfTrainingRadio.checked = true;
    }
    
    // 通知メッセージを非表示
    showAutoInputNotification(false);
  }

  // 日付に基づいて「はい」を自動選択する関数
  function autoSelectYesIfReservationExists(date) {
    if (hasReservationData(date)) {
      btnradio1.checked = true;
      btnradio2.checked = false;
      updateRehabCardVisibility();
    }
  }

  // 既存の予約データから選択を復元する関数
  function restoreRehabSelections(date) {
    if (!date) return;
    
    const key = `reserve_${date}`;
    const savedData = localStorage.getItem(key);
    if (!savedData) {
      // 予約データがない場合は初期状態にリセット
      resetRehabSelections();
      return;
    }
    
    // データを解析 (each0=値,each1=値,each2=値,each3=値,each4=値)
    const items = savedData.split(',');
    const values = {};
    items.forEach(item => {
      const [key, value] = item.split('=');
      if (key && value !== undefined) {
        values[key.trim()] = value.trim();
      }
    });
    
    // 各リハビリの選択を復元
    for (let i = 0; i <= 3; i++) {
      const value = values[`each${i}`];
      if (value !== undefined) {
        const radioId = `each${i}_btnradio${parseInt(value) + 1}`;
        const radio = document.getElementById(radioId);
        if (radio) {
          radio.checked = true;
        }
      }
    }
    
    // 自主トレーニングの選択を復元
    const each4Value = values['each4'];
    if (each4Value !== undefined) {
      const radioId = each4Value === '1' ? 'each4_btnradio2' : 'each4_btnradio1';
      const radio = document.getElementById(radioId);
      if (radio) {
        radio.checked = true;
      }
    }
    
    // 自動入力通知を表示
    showAutoInputNotification(true);
  }

  function updateRehabCardVisibility() {
    if (btnradio1.checked) {
      rehabCard.style.display = '';
      // 「はい」を選択したときに既存データがあれば復元、なければ初期化
      const dateInput = document.getElementById('date');
      if (dateInput && dateInput.value) {
        restoreRehabSelections(dateInput.value);
      } else {
        // 日付が未設定の場合は初期状態
        resetRehabSelections();
      }
    } else if (btnradio2.checked) {
      // 「いいえ」選択時は全て「しない」にリセット
      rehabCard.style.display = 'none';
      resetRehabSelections();
      // 通知メッセージを非表示
      showAutoInputNotification(false);
    } else {
      // どちらも選択されていない場合
      rehabCard.style.display = 'none';
      // 通知メッセージを非表示
      showAutoInputNotification(false);
    }
  }

  // 初期状態（どちらも未選択）で非表示
  updateRehabCardVisibility();

  btnradio1.addEventListener('change', function() {
    if (btnradio1.checked) {
      // 「はい」選択時は通常のフロー
      updateRehabCardVisibility();
    }
  });
  
  btnradio2.addEventListener('change', function() {
    if (btnradio2.checked) {
      // 「いいえ」選択時はrestDayフラグをリセットして休み予約モードに
      restDay = false;
      updateRehabCardVisibility();
    }
  });
  
  // 日付が変更されたときにも既存データを復元
  dateInput.addEventListener('change', function() {
    // まず予約データがあれば「はい」を自動選択
    autoSelectYesIfReservationExists(dateInput.value);
    
    // 「はい」が選択されている場合、データを復元または初期化
    if (btnradio1.checked) {
      restoreRehabSelections(dateInput.value);
    }
  });

  if (!reserveBtn) return; // 安全対策

  reserveBtn.addEventListener('click', function() {
    const date = dateInput.value;
    dateError.style.display = 'none';
    dateError.innerText = '';
    selectError.style.display = 'none';
    selectError.innerText = '';

    // 日付未入力チェック
    if (!date) {
      dateError.innerHTML = '<i class="bi bi-exclamation-circle-fill me-1" style="font-size:1em; vertical-align:middle;"></i>日付を入力してください';
      dateError.style.display = 'block';
      dateInput.focus();
      return;
    }

    // 「リハビリに取り組みますか？」未選択チェック
    const rehabChoice = getRehabChoice();
    if (!rehabChoice) {
      dayselectError.innerHTML = '<div class="m-1 ms-3"><i class="bi bi-exclamation-circle-fill me-1" style="font-size:1em; vertical-align:middle;"></i>どちらか選択してください</div>';
      dayselectError.style.display = 'block';
      return;
    }

    const getSelectedText = (name) => {
      const input = document.querySelector(`input[name="${name}"]:checked`);
      if (!input) return '';
      const label = input.nextElementSibling;
      return label ? label.innerText : '';
    };

    const each0info = getSelectedText('btnradio0');
    const each1info = getSelectedText('btnradio1');
    const each2info = getSelectedText('btnradio2');
    const each3info = getSelectedText('btnradio3');
    const each4info = getSelectedText('btnradio4');

    // もしも、すべての値が「しない」なら、警告を出して中断
    if ([each0info, each1info, each2info, each3info, each4info].every(v => v === 'しない')) {
      if(getRehabChoice() === 'はい'){
        selectError.innerHTML = '<div class="m-1 ms-3"><i class="bi bi-exclamation-circle-fill me-1" style="font-size:1em; vertical-align:middle;"></i>少なくとも一つのリハビリを選択してください</div>';
        selectError.style.display = 'block';
        return;
      }else{
        // 休みの日として予約続行
        restDay = true;
      }
    }

    // 予約重複チェック
    let alertText = '';
    const key = `reserve_${date}`;
    if (localStorage.getItem(key)) {
      alertText = `<div class='alert alert-warning d-flex align-items-center mb-2' role='alert'>
        <i class='bi bi-exclamation-triangle-fill me-2'></i>
        この日にはすでに予約が入っていますが、予約を変更しますか？
      </div>`;
    }

    let resultText = '';
    if (alertText) resultText += alertText;
    resultText += `<div class="mb-2"><div class="h6">予約日</div>${date}</div>`;
    if(restDay==true){
      resultText += `<div class="alert alert-warning"><i class='bi bi-exclamation-triangle-fill me-2'></i>休みの日として予約します</div>`;
    }else{
      resultText += `<div class="h6">リハビリ内容</div>`;
      resultText += `<div>理学療法: ${each0info}</div>`;
      resultText += `<div>言語療法: ${each1info}</div>`;
      resultText += `<div>作業療法: ${each2info}</div>`;
      resultText += `<div>心理療法: ${each3info}</div>`;
      resultText += `<div>自主トレーニング: ${each4info}</div>`;
    }

    // モーダルに内容を表示
    if (modalBody) modalBody.innerHTML = resultText;
    // モーダル表示
    const modalEl = document.getElementById('confirmModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const confirmModal = new bootstrap.Modal(modalEl);
      confirmModal.show();
    }

    // #resultには何も表示しない
    if (resultEl) resultEl.innerHTML = '';
  });

  // 日付選択ボタンの選択状態管理と日付自動入力
  const btns = [
    document.getElementById('todayBtn'),
    document.getElementById('tomorrowBtn'),
    document.getElementById('dayAfterTomorrowBtn'),
    document.getElementById('otherBtn')
  ].filter(Boolean);

  function formatDate(date) {
    // yyyy-mm-dd形式に変換
    return date.toISOString().split('T')[0];
  }

  btns.forEach(btn => {
    btn.addEventListener('click', function() {
      // 全ボタンをoutline-primaryに戻す
      btns.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline-primary');
        b.classList.add('bg-white');
      });
      // 押したボタンだけprimaryに
      btn.classList.remove('btn-outline-primary');
      btn.classList.remove('bg-white');
      btn.classList.add('btn-primary');

      // 日付自動入力
      if (btn.id === 'todayBtn') {
        const today = new Date();
        dateInput.value = formatDate(today);
      } else if (btn.id === 'tomorrowBtn') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = formatDate(tomorrow);
      } else if (btn.id === 'dayAfterTomorrowBtn') {
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        dateInput.value = formatDate(dayAfterTomorrow);
      } else if (btn.id === 'otherBtn') {
        dateInput.value = '';
        dateInput.focus(); // カレンダーを表示
      }
      
      // 日付設定後、予約データがあれば「はい」を自動選択
      if (dateInput.value) {
        autoSelectYesIfReservationExists(dateInput.value);
      }
      
      // 日付設定後、「はい」が選択されていれば既存データを復元または初期化
      if (btnradio1.checked) {
        restoreRehabSelections(dateInput.value);
      }
    });
  });

  // ページロード時にinputを表示したままにする（display:blockはHTML側で設定済み）

    // クエリパラメータdate対応: ページロード時に自動入力＆ボタン自動選択
    function autoSelectDateFromQuery() {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      const restParam = params.get('rest');
      
      // デバッグログ
      console.log('URLパラメータ解析:', {
        dateParam: dateParam,
        restParam: restParam,
        fullURL: window.location.href,
        search: window.location.search
      });
      
      if (!dateParam) return;

      // yyyy-mm-dd形式かチェック
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        console.log('日付形式が正しくありません:', dateParam);
        return;
      }
      dateInput.value = dateParam;
      console.log('日付を設定しました:', dateParam);

      // 今日・あす・あさって・その他判定
      const today = new Date();
      const paramDate = new Date(dateParam);
      // 時刻ズレ防止（UTC→ローカル）
      paramDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffDays = Math.round((paramDate - today) / (1000 * 60 * 60 * 24));

      let targetBtn = null;
      if (diffDays === 0) {
        targetBtn = document.getElementById('todayBtn');
      } else if (diffDays === 1) {
        targetBtn = document.getElementById('tomorrowBtn');
      } else if (diffDays === 2) {
        targetBtn = document.getElementById('dayAfterTomorrowBtn');
      } else {
        targetBtn = document.getElementById('otherBtn');
      }
      if (targetBtn) {
        // ボタンの見た目を変更
        btns.forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-outline-primary');
          b.classList.add('bg-white');
        });
        targetBtn.classList.remove('btn-outline-primary');
        targetBtn.classList.remove('bg-white');
        targetBtn.classList.add('btn-primary');
        console.log('日付ボタンを選択しました:', targetBtn.id);
      }
      
      // rest=trueパラメータがある場合は自動でお休み予約処理
      if (restParam === 'true') {
        console.log('rest=true検出、お休み予約処理を開始');
        
        // restDayフラグをリセット
        restDay = false;
        
        // 「いいえ」を自動選択
        btnradio2.checked = true;
        btnradio1.checked = false;
        console.log('「いいえ」を選択しました');
        
        updateRehabCardVisibility();
        console.log('カード表示を更新しました');
        
        // 少し遅延してから予約ボタンを自動クリック
        setTimeout(() => {
          console.log('予約ボタンを自動クリックします');
          if (reserveBtn) {
            reserveBtn.click();
            console.log('予約ボタンをクリックしました');
          } else {
            console.error('予約ボタンが見つかりません');
          }
        }, 500);
        return; // rest=trueの場合は以下の処理をスキップ
      }
      
      // 日付設定後、予約データがあれば「はい」を自動選択
      if (dateInput.value) {
        autoSelectYesIfReservationExists(dateInput.value);
      }
      
      // 日付設定後、「はい」が選択されていれば既存データを復元または初期化
      if (btnradio1.checked) {
        restoreRehabSelections(dateInput.value);
      }
    }
    autoSelectDateFromQuery();
    
    console.log('autoSelectDateFromQuery関数を実行しました');
    
    // ページロード後、日付が設定されていて予約データがある場合は「はい」を自動選択
    if (dateInput.value) {
      autoSelectYesIfReservationExists(dateInput.value);
      console.log('ページロード後の自動選択処理を実行しました');
    }
});
