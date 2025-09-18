// reserve.js
// reserve.html のインラインスクリプトを外部化

let restDay = false; // 休みの日フラグ

document.addEventListener('DOMContentLoaded', () => {
  // 「リハビリに取り組みますか？」の選択状態取得関数
  function getRehabChoice() {
    if (btnradio1.checked) return 'はい';
    if (btnradio2.checked) return 'いいえ';
    return '';
  }
  // 「はい」「いいえ」選択で「取り組むリハビリを選ぶ」カード表示制御
  const rehabCard = document.getElementById('rehabCard');
  const btnradio1 = document.getElementById('btnradio1');
  const btnradio2 = document.getElementById('btnradio2');

  function updateRehabCardVisibility() {
    if (btnradio1.checked) {
      rehabCard.style.display = '';
    } else {
      rehabCard.style.display = 'none';
    }
  }

  // 初期状態（どちらも未選択）で非表示
  updateRehabCardVisibility();

  btnradio1.addEventListener('change', updateRehabCardVisibility);
  btnradio2.addEventListener('change', updateRehabCardVisibility);
  const reserveBtn = document.getElementById('reserveBtn');
  const dateInput = document.getElementById('date');
  const dateError = document.getElementById('dateError');
  const selectError = document.getElementById('selectError');
  const dayselectError = document.getElementById('dayselectError');
  const resultEl = document.getElementById('result');
  const modalBody = document.getElementById('modalBody');

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
    });
  });

  // ページロード時にinputを表示したままにする（display:blockはHTML側で設定済み）

    // クエリパラメータdate対応: ページロード時に自動入力＆ボタン自動選択
    function autoSelectDateFromQuery() {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (!dateParam) return;

      // yyyy-mm-dd形式かチェック
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
      dateInput.value = dateParam;

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
      }
    }
    autoSelectDateFromQuery();
});
