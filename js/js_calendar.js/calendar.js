document.addEventListener('DOMContentLoaded', function() {
  // ▼▲の切り替え
  var collapseEl = document.getElementById('icon-legend');
  var arrow = document.getElementById('icon-legend-arrow');
  if (collapseEl && arrow) {
    collapseEl.addEventListener('show.bs.collapse', function () {
      arrow.textContent = '▲';
    });
    collapseEl.addEventListener('hide.bs.collapse', function () {
      arrow.textContent = '▼';
    });
  }

  // DOM要素取得
  const currentMonthYearEl = document.getElementById('currentMonthYear');
  const calendarBody = document.getElementById('calendarBody');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const dateDetailModal = document.getElementById('dateDetailModal');
  const dateDetailModalLabel = document.getElementById('dateDetailModalLabel');
  const dateDetailContent = document.getElementById('dateDetailContent');

  let currentDate = new Date();
  const realToday = new Date();

  // --- カレンダー・ダッシュボードロジック ---
  // ...getEventsFromLocalStorage, getOldestDataDate, updateNavigationButtons, renderCalendar, updateDashboard, updateFixedMetrics, getRankFromPoints...
  // ...（元のcalender.htmlのjsコードをここに移植）...

  // --- モーダルロジック ---
  let currentModalDate = null;

  function navigateModalDate(direction) {
    if (!currentModalDate) return;
    const currentDateObj = new Date(currentModalDate);
    currentDateObj.setDate(currentDateObj.getDate() + direction);
    const newDateString = currentDateObj.toISOString().split('T')[0];
    currentModalDate = newDateString;
    updateModalContent(newDateString);
  }

  function updateModalContent(date) {
    const contentDiv = dateDetailContent;
    const modalLabel = dateDetailModalLabel;
    const [year, month, day] = date.split('-');
    const formattedDate = `${parseInt(month)}月${parseInt(day)}日`;
    modalLabel.textContent = formattedDate;

    // 休みの日かどうか
    const isRestDay = window.RestDayManager && typeof window.RestDayManager.isRestDay === 'function' && window.RestDayManager.isRestDay(date);
    if (isRestDay) {
      contentDiv.innerHTML = `<div class="text-center"><i class="bi bi-moon" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i><p class="fs-4">${formattedDate}はお休みです</p></div>`;
      // カスタムイベント発火
      const event = new CustomEvent('modalContentUpdated', { detail: { date } });
      contentDiv.dispatchEvent(event);
      return;
    }
    // リハビリデータ取得
    const key = `status_${date}`;
    const value = localStorage.getItem(key);
    if (value !== null) {
      displayRehabilitationData(value, date, contentDiv, formattedDate);
    } else {
      const today = new Date();
      const selectedDate = new Date(date);
      today.setHours(0,0,0,0);
      selectedDate.setHours(0,0,0,0);
      contentDiv.innerHTML = `<div class="text-center"><p class="fs-5">${formattedDate}の記録はありません</p></div>`;
    }
    // カスタムイベント発火
    const event = new CustomEvent('modalContentUpdated', { detail: { date } });
    contentDiv.dispatchEvent(event);
  }

  function displayRehabilitationData(value, date, contentDiv, formattedDate) {
    // ここに元のロジックを正しく記述
    // データ解析
    let mainStatus = value;
    let statusMap = {};
    let countsMap = {};
    if (value.includes(',')) {
      const parts = value.split(',');
      mainStatus = parts[0];
      for (let j = 1; j < parts.length; j++) {
        const part = parts[j].trim();
        if (part.includes('=') && !part.includes('no_data')) {
          const [rehabKey, rehabValue] = part.split('=');
          const numericValue = parseInt(rehabValue);
          if (!isNaN(numericValue)) {
            countsMap[rehabKey] = numericValue;
            statusMap[rehabKey] = numericValue > 0 ? 'true' : 'false';
          } else {
            statusMap[rehabKey] = rehabValue;
            countsMap[rehabKey] = rehabValue === 'true' ? 1 : 0;
          }
        }
      }
    }
    const rehabNames = {
      each0: '理学療法',
      each1: '言語療法',
      each2: '作業療法',
      each3: '心理療法',
      each4: '自主トレーニング'
    };
    let achievedRow = `<div class="container-fluid"><div class="row mb-1 justify-content-center text-center" id="rehab-row-modal">`;
    const allRehabIds = ['each0', 'each1', 'each2', 'each3', 'each4'];
    allRehabIds.forEach(rehabId => {
      if ((rehabId in statusMap || rehabId in countsMap) && rehabNames[rehabId]) {
        const count = countsMap[rehabId] || 0;
        const isAchieved = count > 0;
        let displayText = '';
        let iconClass = '';
        let iconColor = '';
        let bgColor = '';
        if (rehabId === 'each4') {
          displayText = '';
          iconClass = isAchieved ? 'bi-check-circle-fill' : 'bi-x-circle';
          iconColor = isAchieved ? 'green' : 'gray';
          bgColor = isAchieved ? '#e6f7e6' : '#f0f0f0';
        } else {
          if (count > 0) {
            displayText = `${count}つ`;
            iconClass = 'bi-check-circle-fill';
            iconColor = 'green';
            bgColor = '#e6f7e6';
          } else {
            displayText = '0つ';
            iconClass = 'bi-x-circle';
            iconColor = 'gray';
            bgColor = '#f0f0f0';
          }
        }
        achievedRow += `
          <div class="col-6 px-1 rehab-block" style="min-width:120px;">
            <span style="font-size: 0.92em; white-space: nowrap;">${rehabNames[rehabId]}</span>
            <div class="eachcontainer" style="background:${bgColor}; border-radius:12px; margin:0.25rem 0; min-height:2.2rem; display:flex; align-items:center; justify-content:center; flex-direction:column;">
              <i class="bi ${iconClass}" style="color:${iconColor}; font-size:1.5rem;"></i>
              ${displayText ? `<small style="color:${iconColor}; font-weight:bold; margin-top:2px;">${displayText}</small>` : ''}
            </div>
          </div>
        `;
      }
    });
    achievedRow += `</div></div>`;
    // 自主トレーニング詳細セクション（省略可）
    let selfTrainingSection = '';
    if (window.SelfTrainingManager && typeof window.SelfTrainingManager.hasRecord === 'function') {
      const hasSelfTrainingRecord = window.SelfTrainingManager.hasRecord(date);
      const selfTrainingText = window.SelfTrainingManager.getTextContent(date);
      if (hasSelfTrainingRecord) {
        selfTrainingSection = `
          <div class="mt-3 p-3" style="background: #f8f9ff; border-radius: 12px; border-left: 4px solid #6f42c1;">
            <div class="d-flex align-items-center mb-2">
              <i class="bi bi-journal-text me-2" style="color: #6f42c1; font-size: 1.2rem;"></i>
              <span class="fw-bold" style="color: #6f42c1;">自主トレーニングのきろく</span>
            </div>
            ${selfTrainingText ? `<div class="p-2 rounded text-start" style="word-wrap: break-word;">${selfTrainingText}</div>` : `<div class="text-muted" style="font-style: italic;">この日に自主トレーニングを実施しました。<br><small>※記録内容は90日経過のため削除されています</small></div>`}
          </div>
        `;
      }
    }
    // メインテキスト生成
    let mainText = '';
    if (mainStatus === '1' || value === 'clear') {
      mainText = `<span class="fs-4 text-success">全て取り組みました！</span>`;
    } else {
      let completedCount = 0;
      let totalCount = 0;
      Object.keys(countsMap).forEach(rehabId => {
        if (!rehabId.includes('each4')) {
          totalCount++;
          if (countsMap[rehabId] > 0) completedCount++;
        }
      });
      if ('each4' in countsMap || 'each4' in statusMap) {
        totalCount++;
        if (countsMap['each4'] > 0) completedCount++;
      }
      if (completedCount === totalCount && totalCount > 0) {
        mainText = `<span class="fs-4 text-success">全て取り組みました！</span>`;
      } else {
        mainText = `<div class="h5">取り組んだリハビリ</div>`;
      }
    }
  // 内容を書き換え
  contentDiv.innerHTML = `<p>${mainText}</p>${achievedRow}${selfTrainingSection}`;
  }

  // モーダル表示時
  dateDetailModal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const date = button.getAttribute('data-date');
    if (date) {
      currentModalDate = date;
      updateModalContent(date);
    } else {
      dateDetailContent.innerHTML = `<p>日付が選択されていません。</p>`;
    }
  });

  document.getElementById('prevDateBtn').addEventListener('click', function() {
    navigateModalDate(-1);
  });
  document.getElementById('nextDateBtn').addEventListener('click', function() {
    navigateModalDate(1);
  });
  document.addEventListener('keydown', function(event) {
    if (dateDetailModal.classList.contains('show')) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigateModalDate(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); navigateModalDate(1); }
    }
  });

  // 予約テキストの成型用関数
  function formatReservationText(text) {
    // 入力をカンマ区切りで分割
    const parts = text.split(',');
    // eachx=yとなっている部分を配列で抽出.
    const result = parts.map(part => {
      const [key, value] = part.split('=');
      return { key: key.trim(), value: value.trim() };
    });
    return result;
  }

  // --- 予約ボタン追加ロジック ---
  dateDetailContent.addEventListener('modalContentUpdated', function(e) {
    const date = e.detail.date;
    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    // 既存の予約ボタンを必ず削除
    const oldBtn = this.querySelector('.btn.btn-primary');
    if (oldBtn) oldBtn.remove();
    if (targetDate >= today) {
      // もしも、ローカルストレージ上に予約データがあれば、ここで取得して表示する
      if(targetDate > today){
        const reservationData = localStorage.getItem(`reserve_${date}`);
        if (reservationData) {
          const parsedData = formatReservationText(reservationData);
          
          // すべてのリハビリが0つかどうかチェック
          const isAllZero = parsedData.every(item => {
            return item.value === '0' || item.value === 'false';
          });
          
          // お休みの日でない場合のみ予約内容を表示
          if (!isAllZero) {
            const sampleText = document.createElement('div');
            sampleText.className = 'h5 mb-2 text-start';
            sampleText.textContent = '予約内容';
            this.append(sampleText);
            
            parsedData.forEach(item => {
              const rehabNames = {
                each0: '理学療法',
                each1: '言語療法',
                each2: '作業療法',
                each3: '心理療法',
                each4: '自主トレーニング'
              };
              if (rehabNames[item.key]) {
                const rehabDiv = document.createElement('div');
                rehabDiv.className = 'd-flex align-items-center mb-1';
                rehabDiv.innerHTML = `
                  <i class="bi bi-check-circle-fill me-2" style="color: green; font-size: 1.2rem;"></i>
                  <span style="font-size: 1.1rem;">${rehabNames[item.key]}: ${item.value}つ</span>
                `;
                this.append(rehabDiv);
              }
            });
          }
          
          const infoText = document.createElement('div');
          infoText.className = 'text-muted mb-2';
          infoText.style.fontStyle = 'italic';
          infoText.style.fontSize = '0.9rem';
          this.append(infoText);
        }
      }

      const reserveBtn = document.createElement('button');
      reserveBtn.className = 'btn btn-primary w-100 mb-3 mt-2';
      reserveBtn.innerHTML = '<i class="bi bi-calendar-plus me-2"></i>リハビリをよやくする';
      reserveBtn.onclick = function() {
        window.location.href = `reserve.html?date=${date}#dayselectCard`;
      };
        this.append(reserveBtn);
    }
  });

  dateDetailModal.addEventListener('hidden.bs.modal', function() {
    const btn = dateDetailContent.querySelector('.btn.btn-primary');
    if (btn) btn.remove();
  });

  // --- カレンダー初期化 ---
  function updateDashboard() {
    updateFixedMetrics();
  }
  function updateFixedMetrics() {
    // ...元のupdateFixedMetricsロジック...
  }
  function getRankFromPoints(points) {
    if (points >= 100) return 'プラチナ';
    if (points >= 60) return 'ゴールド';
    if (points >= 30) return 'シルバー';
    if (points >= 10) return 'ブロンズ';
    return 'ビギナー';
  }
  document.addEventListener('DOMContentLoaded', () => {
    // データがない場合の初期制御
    // ...元の初期化ロジック...
    renderCalendar();
    updateDashboard();
  });
});
