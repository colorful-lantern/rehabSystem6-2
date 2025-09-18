// 現在モーダルに表示されている日付を保持する変数
let currentModalDate = null;

// 日付ナビゲーション関数
function navigateModalDate(direction) {
  if (!currentModalDate) return;
  
  const currentDate = new Date(currentModalDate);
  currentDate.setDate(currentDate.getDate() + direction);
  
  const newDateString = currentDate.toISOString().split('T')[0];
  currentModalDate = newDateString;
  
  // モーダルタイトルと内容を更新
  updateModalContent(newDateString);
}

// モーダル内容を更新する関数
function updateModalContent(date) {
  const contentDiv = document.getElementById('dateDetailContent');
  const modalLabel = document.getElementById('dateDetailModalLabel');
  
  // タイトルを更新
  const [year, month, day] = date.split('-');
  const formattedDate = `${parseInt(month)}月${parseInt(day)}日`;
  modalLabel.textContent = formattedDate;
  
  // 休みの日かどうかをチェック
  const isRestDay = RestDayManager && typeof RestDayManager.isRestDay === 'function' && RestDayManager.isRestDay(date);
  
  if (isRestDay) {
    // 休みの日の場合は専用メッセージを表示
    contentDiv.innerHTML = `
      <div class="text-center">
        <i class="bi bi-moon" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
        <p class="fs-4">${formattedDate}はお休みです</p>
      </div>
    `;
    return;
  }
  
  // リハビリデータを取得して表示
  const key = `status_${date}`;
  const value = localStorage.getItem(key);
  if (value !== null) {
    // 既存のロジックを再利用
    displayRehabilitationData(value, date, contentDiv, formattedDate);
  } else {
    // データがない場合
    const today = new Date();
    const selectedDate = new Date(date);
    today.setHours(0,0,0,0);
    selectedDate.setHours(0,0,0,0);
    
    contentDiv.innerHTML = `
      <div class="text-center">
        <p class="fs-5">${formattedDate}の記録はありません</p>
      </div>
    `;
  }
}

// リハビリデータを表示する関数（既存のロジックを分離）
function displayRehabilitationData(value, date, contentDiv, formattedDate) {
  
  // データ解析
  let mainStatus = value;
  let statusMap = {};
  let countsMap = {};
  
  if (value.includes(',')) {
    const parts = value.split(',');
    mainStatus = parts[0]; // '1' or '0'
    
    // 各リハビリの情報をパース
    for (let j = 1; j < parts.length; j++) {
      const part = parts[j].trim();
      if (part.includes('=') && !part.includes('no_data')) {
        const [rehabKey, rehabValue] = part.split('=');
        
        // 数値かどうかチェック
        const numericValue = parseInt(rehabValue);
        if (!isNaN(numericValue)) {
          // 新形式：数値カウント
          countsMap[rehabKey] = numericValue;
          statusMap[rehabKey] = numericValue > 0 ? 'true' : 'false';
        } else {
          // 旧形式：true/false
          statusMap[rehabKey] = rehabValue;
          countsMap[rehabKey] = rehabValue === 'true' ? 1 : 0;
        }
      }
    }
  }
  
  // リハビリ名変換
  const rehabNames = {
    each0: '理学療法',
    each1: '言語療法',
    each2: '作業療法',
    each3: '心理療法',
    each4: '自主トレーニング'
  };
  
  // ランダムIDがある場合は追加
  if (typeof REHAB_IDS !== 'undefined') {
    Object.keys(REHAB_IDS).forEach(index => {
      const randomId = REHAB_IDS[index];
      switch(parseInt(index)) {
        case 0: rehabNames[randomId] = '理学療法'; break;
        case 1: rehabNames[randomId] = '言語療法'; break;
        case 2: rehabNames[randomId] = '作業療法'; break;
        case 3: rehabNames[randomId] = '心理療法'; break;
        case 4: rehabNames[randomId] = '自主トレーニング'; break;
      }
    });
  }
  
  // リハビリ表示HTML生成
  let achievedRow = `<div class="container-fluid"><div class="row mb-1 justify-content-center text-center" id="rehab-row-modal">`;
  
  // すべてのリハビリIDをチェック
  const allRehabIds = ['each0', 'each1', 'each2', 'each3', 'each4'];
  if (typeof REHAB_IDS !== 'undefined') {
    Object.values(REHAB_IDS).forEach(randomId => {
      if (!allRehabIds.includes(randomId)) {
        allRehabIds.push(randomId);
      }
    });
  }
  
  allRehabIds.forEach(rehabId => {
    // データが存在するリハビリのみ表示
    if ((rehabId in statusMap || rehabId in countsMap) && rehabNames[rehabId]) {
      const count = countsMap[rehabId] || 0;
      const isAchieved = count > 0;
      
      // 表示形式の決定
      let displayText = '';
      let iconClass = '';
      let iconColor = '';
      let bgColor = '';
      
      if (rehabId === 'each4') {
        // 自主トレーニングは従来通り
        displayText = '';
        iconClass = isAchieved ? 'bi-check-circle-fill' : 'bi-x-circle';
        iconColor = isAchieved ? 'green' : 'gray';
        bgColor = isAchieved ? '#e6f7e6' : '#f0f0f0';
      } else {
        // each0-each3は回数表示
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
  
  // 自主トレーニング詳細セクション
  let selfTrainingSection = '';
  if (typeof SelfTrainingManager !== 'undefined') {
    const hasSelfTrainingRecord = SelfTrainingManager.hasRecord(date);
    const selfTrainingText = SelfTrainingManager.getTextContent(date);
    
    if (hasSelfTrainingRecord) {
      selfTrainingSection = `
        <div class="mt-3 p-3" style="background: #f8f9ff; border-radius: 12px; border-left: 4px solid #6f42c1;">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-journal-text me-2" style="color: #6f42c1; font-size: 1.2rem;"></i>
            <span class="fw-bold" style="color: #6f42c1;">自主トレーニングのきろく</span>
          </div>
          ${selfTrainingText ? `
            <div class="p-2 rounded text-start" style="word-wrap: break-word;">
              ${selfTrainingText}
            </div>
          ` : `
            <div class="text-muted" style="font-style: italic;">
              この日に自主トレーニングを実施しました。<br>
              <small>※記録内容は90日経過のため削除されています</small>
            </div>
          `}
        </div>
      `;
    }
  }
  
  // メインテキストの生成
  let mainText = '';
  if (mainStatus === '1' || value === 'clear') {
    mainText = `<span class="fs-4 text-success">全て取り組みました！</span>`;
  } else {
    // 実施されたリハビリの数を計算
    let completedCount = 0;
    let totalCount = 0;
    
    Object.keys(countsMap).forEach(rehabId => {
      if (!rehabId.includes('each4')) { // 自主トレーニング除外
        totalCount++;
        if (countsMap[rehabId] > 0) {
          completedCount++;
        }
      }
    });
    
    // each4の処理
    if ('each4' in countsMap || 'each4' in statusMap) {
      totalCount++;
      if (countsMap['each4'] > 0) {
        completedCount++;
      }
    }
    
    if (completedCount === totalCount && totalCount > 0) {
      mainText = `<span class="fs-4 text-success">全て取り組みました！</span>`;
    } else {
      mainText = `<span class="fs-4">取り組んだリハビリ：${completedCount}つ</span>`;
    }
  }
  
  // 予約ボタンの表示条件を修正
  const today = new Date();
  today.setHours(0,0,0,0);
  const selectedDate = new Date(date);
  selectedDate.setHours(0,0,0,0);

  // ここで「今日または未来の日付」ならボタンを表示
  const showReserveBtn = selectedDate.getTime() >= today.getTime();

  let reserveBtnHtml = '';
  if (showReserveBtn) {
    reserveBtnHtml = `
      <div class="d-flex justify-content-center mt-3">
        <button class="btn btn-primary" id="reserveBtn" data-date="${date}">
          <i class="bi bi-calendar-plus"></i> よやくする
        </button>
      </div>
    `;
  }

  contentDiv.innerHTML = `<p>${mainText}</p>${achievedRow}${selfTrainingSection}${reserveBtnHtml}`;
}

// モーダルが表示される直前に詳細データをセット
dateDetailModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const date = button.getAttribute('data-date');
  
  if (date) {
    // 現在の日付を保存
    currentModalDate = date;
    
    // モーダル内容を更新
    updateModalContent(date);
  } else {
    const contentDiv = document.getElementById('dateDetailContent');
    contentDiv.innerHTML = `<p>日付が選択されていません。</p>`;
  }
});

// ナビゲーションボタンのイベントリスナー
document.getElementById('prevDateBtn').addEventListener('click', function() {
  navigateModalDate(-1);
});

document.getElementById('nextDateBtn').addEventListener('click', function() {
  navigateModalDate(1);
});

// キーボードショートカット（矢印キー）のイベントリスナー
document.addEventListener('keydown', function(event) {
  // モーダルが表示されている時のみ有効
  if (dateDetailModal.classList.contains('show')) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateModalDate(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateModalDate(1);
    }
  }
});