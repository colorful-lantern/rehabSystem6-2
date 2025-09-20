// カレンダー表示機能（スコープ分離）
(function() {
    // DOM要素の取得
    const currentMonthYearEl = document.getElementById('currentMonthYear');
    const calendarBody = document.getElementById('calendarBody');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const dateDetailModal = document.getElementById('dateDetailModal'); // モーダル要素を取得
    const dateDetailModalLabel = document.getElementById('dateDetailModalLabel'); // モーダルのタイトルh4を取得

    let currentDate = new Date(); // カレンダーの表示月を管理する変数
    const realToday = new Date(); // 今日の日付を保持する固定変数

// localStorageからイベントデータを生成（calender.htmlのロジックを流用）
function getEventsFromLocalStorage() {
    const events = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const match = key.match(/^status_(\d{4}-\d{2}-\d{2})$/);
        if (match) {
            const date = match[1];
            const value = localStorage.getItem(key);
            let title = '';
            
            if (value === 'clear' || (value && value.startsWith('clear'))) {
                // 旧形式：clearまたはclear,each0,...の場合
                title = '✓'; // チェックマーク記号で表示
            } else if (value && value.includes(',')) {
                // 新形式：カウンター方式対応
                const parts = value.split(',');
                const mainStatus = parts[0]; // '1' or '0'
                
                if (mainStatus === '1') {
                    // 全完了の場合
                    title = '✓'; // チェックマーク記号で表示
                } else {
                    // 部分完了の場合：取り組んだリハビリの合計個数を表示
                    let completedCount = 0;
                    let totalEnabled = 0;
                    
                    for (let j = 1; j < parts.length; j++) {
                        const part = parts[j].trim();
                        if (part.includes('=') && !part.includes('no_data')) {
                            const [rehabKey, rehabValue] = part.split('=');
                            
                            // each4（自主トレーニング）は除外
                            if (!rehabKey.includes('each4')) {
                                totalEnabled++;
                                const count = parseInt(rehabValue) || 0;
                                
                                if (count > 0) {
                                    completedCount++;
                                }
                            }
                        }
                    }
                    
                    // each4（自主トレーニング）の処理
                    for (let j = 1; j < parts.length; j++) {
                        const part = parts[j].trim();
                        if (part.includes('each4=')) {
                            totalEnabled++;
                            const [, rehabValue] = part.split('=');
                            const count = parseInt(rehabValue) || 0;
                            if (count > 0) {
                                completedCount++;
                            }
                            break;
                        }
                    }
                    
                    // 表示形式：取り組んだ個数のみ
                    if (completedCount > 0) {
                        title = completedCount.toString();
                    } else {
                        title = '0';
                    }
                }
            } else if (value === '1') {
                // 全完了（データなし）
                title = '✓';
            } else if (value === '0' || !value) {
                // 未実施
                title = '0';
            } else {
                // その他
                title = value;
            }
            
            if (title) {
                events.push({
                    title: title,
                    start: date
                });
            }
        }
    }
    return events;
}

// localStorageから最も古い日付を取得する関数
function getOldestDataDate() {
    let oldestDate = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const match = key.match(/^status_(\d{4}-\d{2}-\d{2})$/);
        if (match) {
            const date = match[1];
            if (!oldestDate || date < oldestDate) {
                oldestDate = date;
            }
        }
    }
    return oldestDate;
}

// ナビゲーションボタンの有効/無効状態を更新する関数
function updateNavigationButtons() {
    const currentDisplayYear = currentDate.getFullYear();
    const currentDisplayMonth = currentDate.getMonth();
    const actualCurrentYear = realToday.getFullYear();
    const actualCurrentMonth = realToday.getMonth();

    // 「次の月」ボタンの制御（既存の仕様）
    if (currentDisplayYear === actualCurrentYear && currentDisplayMonth === actualCurrentMonth) {
        nextMonthBtn.disabled = true;
    } else {
        nextMonthBtn.disabled = false;
    }

    // 「前の月」ボタンの制御（新機能）
    const oldestDate = getOldestDataDate();
    if (!oldestDate) {
        // データがない場合は現在の月のみ表示
        prevMonthBtn.disabled = true;
    } else {
        const oldestDateObj = new Date(oldestDate);
        const oldestYear = oldestDateObj.getFullYear();
        const oldestMonth = oldestDateObj.getMonth();
        
        // 表示月が最も古いデータの月と同じかそれより前の場合は無効化
        if (currentDisplayYear < oldestYear || 
            (currentDisplayYear === oldestYear && currentDisplayMonth <= oldestMonth)) {
            prevMonthBtn.disabled = true;
        } else {
            prevMonthBtn.disabled = false;
        }
    }
}

// カレンダーをレンダリングする関数
function renderCalendar() {
    calendarBody.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    currentMonthYearEl.textContent = `${year}年 ${monthNames[month]}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

    const events = getEventsFromLocalStorage();
    const eventMap = {};
    const eventRawMap = {};
    events.forEach(ev => {
        eventMap[ev.start] = ev.title;
        // localStorageの値も保持
        const key = `status_${ev.start}`;
        eventRawMap[ev.start] = localStorage.getItem(key);
    });

    let date = 1;
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');
            cell.style.position = "relative";

            if (i === 0 && j < firstDayOfMonth) {
                // 前月の空白部分のセル
                const prevMonthDay = lastDateOfPrevMonth - firstDayOfMonth + j + 1;
                cell.classList.add('empty');
                cell.innerHTML = `<span class="date-number">${prevMonthDay}</span>`;
            }
            else if (date <= lastDateOfMonth) {
                // 現在の月のセル
                cell.classList.add('current-month');
                if (year === realToday.getFullYear() && month === realToday.getMonth() && date === realToday.getDate()) {
                    cell.classList.add('today');
                }
                const mm = String(month + 1).padStart(2, '0');
                const dd = String(date).padStart(2, '0');
                const ymd = `${year}-${mm}-${dd}`;
                
                // 休みの日かどうかをチェック
                const isRestDay = RestDayManager && typeof RestDayManager.isRestDay === 'function' && RestDayManager.isRestDay(ymd);
                
                let eventHtml = '';
                
                // 予約データのアイコン表示チェック
                let reservationIcon = '';
                const reservationData = localStorage.getItem(`reserve_${ymd}`);
                if (reservationData) {
                    reservationIcon = `<i class="bi bi-clipboard2-check" style="color: #6f42c1; font-size: 1.2rem; position: absolute; top: 2px; right: 2px;"></i>`;
                }
                
                if (isRestDay) {
                    // 休みの日の場合は月アイコンを表示
                    eventHtml = `<div class="event-content d-flex flex-column justify-content-end align-items-center w-100 position-absolute bottom-0 start-50 translate-middle-x mb-1">
                        <i class="bi bi-moon" style="font-size:1.8rem;"></i>
                    </div>`;
                } else if (eventMap[ymd]) {
                    // 全完了の判定：clearまたは実際の完了数で判定
                    const rawValue = eventRawMap[ymd];
                    let isFullyCompleted = false;
                    
                    if (rawValue) {
                        if (rawValue.startsWith("clear") || rawValue === '1' || (rawValue.includes(',') && rawValue.split(',')[0] === '1')) {
                            // 旧システムのclearまたは新システムの完了判定（メインステータスが1）
                            isFullyCompleted = true;
                        } else {
                            // 新システム：実際の完了数をチェック（下位互換）
                            const parts = rawValue.split(',');
                            if (parts.length > 1) {
                                const trueCount = parts.filter(part => part.includes('=true')).length;
                                const totalEnabled = parts.filter(part => part.includes('=')).length;
                                isFullyCompleted = (trueCount === totalEnabled && totalEnabled > 0);
                            }
                        }
                    }
                    
                    if (isFullyCompleted) {
                        eventHtml = `<div class="event-content d-flex flex-column justify-content-end align-items-center w-100 position-absolute bottom-0 start-50 translate-middle-x mb-1">
                            <i class="bi bi-check-lg" style="font-size:2.2rem;"></i>
                        </div>`;
                    } else {
                        eventHtml = `<div class="event-content d-flex flex-column justify-content-end align-items-center w-100 position-absolute bottom-0 start-50 translate-middle-x mb-1">${eventMap[ymd]}</div>`;
                    }
                }
                cell.innerHTML = `<span class="date-number">${date}</span>${eventHtml}${reservationIcon}`;
                // モーダルをトリガーするための属性を追加
                cell.setAttribute('data-bs-toggle', 'modal');
                cell.setAttribute('data-bs-target', '#dateDetailModal');
                cell.setAttribute('data-date', ymd); // クリックされた日付をデータ属性として保持
                date++;
            }
            else {
                // 次月の空白部分のセル
                cell.classList.add('empty');
                cell.innerHTML = `<span class="date-number">${date - lastDateOfMonth}</span>`;
                // 空白セルはモーダルをトリガーしないため、data属性は追加しない
                date++;
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);

        if (date > lastDateOfMonth && (i * 7 + 7) >= (firstDayOfMonth + lastDateOfMonth)) {
            break;
        }
    }

    // ナビゲーションボタンの状態を更新
    updateNavigationButtons();
}

// モーダルが表示される直前に実行されるイベントリスナー
dateDetailModal.addEventListener('show.bs.modal', function (event) {
    // モーダルをトリガした要素 (クリックされた<td>) を取得
    const button = event.relatedTarget;
    // その要素からdata-date属性の値を取得
    const date = button.getAttribute('data-date');
    // モーダルのタイトルを更新
    if (date) {
    // yyyy-mm-dd形式をmm月dd日形式に変換（0埋めなし）
    const [year, month, day] = date.split('-');
    const formattedDate = `${parseInt(month)}月${parseInt(day)}日`;
    dateDetailModalLabel.textContent = `${formattedDate} のきろく`;
    } else {
    dateDetailModalLabel.textContent = `日付のきろく`;
    }
});

// 「前の月」ボタンのクリックイベントリスナー
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    // updateMonthlyMetrics(); // 月別記録は非表示のためコメントアウト
});

// 「次の月」ボタンのクリックイベントリスナー
nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    // updateMonthlyMetrics(); // 月別記録は非表示のためコメントアウト
});

// ページロード時にカレンダーをレンダリング
document.addEventListener('DOMContentLoaded', () => {
    // データがない場合の初期制御
    const oldestDate = getOldestDataDate();
    if (!oldestDate) {
        // データがない場合は現在の月に設定
        currentDate = new Date(realToday.getFullYear(), realToday.getMonth(), 1);
    }
    renderCalendar();
});

})(); // IIFE閉じ括弧