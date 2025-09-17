// reserve.js
// reserve.html のインラインスクリプトを外部化

document.addEventListener('DOMContentLoaded', () => {
  const reserveBtn = document.getElementById('reserveBtn');
  const dateInput = document.getElementById('date');
  const dateError = document.getElementById('dateError');
  const resultEl = document.getElementById('result');
  const modalBody = document.getElementById('modalBody');

  if (!reserveBtn) return; // 安全対策

  reserveBtn.addEventListener('click', function() {
    const date = dateInput.value;
    dateError.style.display = 'none';
    dateError.innerText = '';

    if (!date) {
      dateError.innerHTML = '<i class="bi bi-exclamation-circle-fill me-1" style="font-size:1em; vertical-align:middle;"></i>日付を入力してください';
      dateError.style.display = 'block';
      dateInput.focus(); // フォーカスを当てる
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

    let resultText = `<div class="mb-2"><div class="h6">予約日</div>${date}</div>`;
    resultText += `<div class="h6">リハビリ内容</div>`;
    resultText += `<div>理学療法: ${each0info}</div>`;
    resultText += `<div>言語療法: ${each1info}</div>`;
    resultText += `<div>作業療法: ${each2info}</div>`;
    resultText += `<div>心理療法: ${each3info}</div>`;
    resultText += `<div>自主トレーニング: ${each4info}</div>`;

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
});
