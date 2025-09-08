// 休日設定カレンダー専用ロジック

// DOM要素の取得
const currentMonthYearEl = document.getElementById('currentMonthYear');
const calendarBody = document.getElementById('calendarBody');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const saveSettingsBtn = document.getElementById('saveSettings');

let currentDate = new Date(); // カレンダーの表示月を管理する変数
const today = new Date(); // 今日の日付を保持する固定変数

// 初期表示を今日の月に設定
currentDate.setDate(1); // 月の1日に設定してDate操作を安全にする

// 設定可能な期間を計算
function getSettableRange() {
    const now = new Date();
    
    // 1ヶ月前の開始日（設定不可の境界）
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // 1ヶ月先の月末（設定可能の上限）
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    oneMonthLater.setDate(new Date(oneMonthLater.getFullYear(), oneMonthLater.getMonth() + 1, 0).getDate());
    
    return {
        minDate: oneMonthAgo,
        maxDate: oneMonthLater
    };
}

// 日付が現在表示中の月に属するかチェック
function isCurrentMonthDate(date, displayYear, displayMonth) {
    return date.getFullYear() === displayYear && date.getMonth() === displayMonth;
}

// 日付が設定可能かチェック（既存の関数を維持）
function isDateSettable(date) {
    const range = getSettableRange();
    return date > range.minDate && date <= range.maxDate;
}

// 現在の月の日付のみ操作可能かチェック（新しい判定）
function isDateOperatable(date, displayYear, displayMonth) {
    return isCurrentMonthDate(date, displayYear, displayMonth) && isDateSettable(date);
}

// 指定された月に操作可能な日付が存在するかチェック
function hasOperatableDatesInMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // その月のすべての日付をチェック
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const checkDate = new Date(year, month, date);
        if (isDateOperatable(checkDate, year, month)) {
            return true; // 操作可能な日付が1つでもあれば true
        }
    }
    
    return false; // すべて操作不可能
}

// ナビゲーションボタンの有効/無効状態を更新
function updateNavigationButtons() {
    const now = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 表示可能な期間を計算
    const minDisplayDate = new Date(now);
    minDisplayDate.setMonth(minDisplayDate.getMonth() - 1);
    minDisplayDate.setDate(1); // 月の1日に設定
    
    const maxDisplayDate = new Date(now);
    maxDisplayDate.setMonth(maxDisplayDate.getMonth() + 1);
    maxDisplayDate.setDate(1); // 月の1日に設定（月全体を表示するため）
    
    const minDisplayYear = minDisplayDate.getFullYear();
    const minDisplayMonth = minDisplayDate.getMonth();
    const maxDisplayYear = maxDisplayDate.getFullYear();
    const maxDisplayMonth = maxDisplayDate.getMonth();
    
    // 前の月ボタンの制御
    let canGoPrevious = true;
    
    // 基本的な期間チェック
    if ((currentYear < minDisplayYear) || 
        (currentYear === minDisplayYear && currentMonth <= minDisplayMonth)) {
        canGoPrevious = false;
    } else {
        // 前の月に操作可能な日付があるかチェック
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        if (!hasOperatableDatesInMonth(prevYear, prevMonth)) {
            canGoPrevious = false;
        }
    }
    
    // 次の月ボタンの制御
    let canGoNext = true;
    
    // 基本的な期間チェック
    if ((currentYear > maxDisplayYear) || 
        (currentYear === maxDisplayYear && currentMonth >= maxDisplayMonth)) {
        canGoNext = false;
    } else {
        // 次の月に操作可能な日付があるかチェック
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        
        if (!hasOperatableDatesInMonth(nextYear, nextMonth)) {
            canGoNext = false;
        }
    }
    
    prevMonthBtn.disabled = !canGoPrevious;
    nextMonthBtn.disabled = !canGoNext;
    
    // デバッグ用ログ
    console.log(`ナビゲーション状態: ${currentYear}年${currentMonth + 1}月 - 前の月: ${canGoPrevious ? '有効' : '無効'}, 次の月: ${canGoNext ? '有効' : '無効'}`);
}

// カレンダーをレンダリングする関数
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // ヘッダーの年月を更新
    currentMonthYearEl.textContent = `${year}年${month + 1}月`;
    
    // 月の最初の日と最後の日を取得
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay(); // 0=日曜日
    
    // カレンダーボディをクリア
    calendarBody.innerHTML = '';
    
    let date = 1;
    let nextMonthDate = 1;
    
    // カレンダーの行数を計算（最大6週）
    for (let week = 0; week < 6; week++) {
        const row = document.createElement('tr');
        
        // 1週間分の列を作成
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            
            if (week === 0 && day < firstDayOfWeek) {
                // 前の月の日付
                const prevMonth = new Date(year, month, 0);
                const prevDate = prevMonth.getDate() - (firstDayOfWeek - day - 1);
                const prevCellDate = new Date(year, month - 1, prevDate);
                
                cell.className = 'disabled other-month'; // 非活性として設定
                cell.innerHTML = `
                    <div class="date-number">${prevDate}</div>
                `;
                
                // 前月の日付は操作不可（灰色表示のみ）
                setupDisabledCell(cell, prevCellDate);
                
            } else if (date > lastDay.getDate()) {
                // 次の月の日付
                const nextCellDate = new Date(year, month + 1, nextMonthDate);
                
                cell.className = 'disabled other-month'; // 非活性として設定
                cell.innerHTML = `
                    <div class="date-number">${nextMonthDate}</div>
                `;
                
                // 翌月の日付は操作不可（灰色表示のみ）
                setupDisabledCell(cell, nextCellDate);
                
                nextMonthDate++;
            } else {
                // 現在の月の日付
                const cellDate = new Date(year, month, date);
                
                cell.innerHTML = `
                    <div class="date-number">${date}</div>
                `;
                
                // 今日かどうかチェック
                if (year === today.getFullYear() && month === today.getMonth() && date === today.getDate()) {
                    cell.classList.add('today');
                    cell.classList.add('today-emphasis'); // 今日の強調クラスを追加
                }
                
                // 当月の日付のみ操作可能
                if (isDateOperatable(cellDate, year, month)) {
                    cell.classList.add('current-month');
                    setupCellInteraction(cell, cellDate);
                } else {
                    // 当月でも設定不可能な日付（過去の日付など）
                    cell.classList.add('disabled', 'current-month');
                    setupDisabledCell(cell, cellDate);
                }
                
                date++;
            }
            
            row.appendChild(cell);
        }
        
        calendarBody.appendChild(row);
        
        // すべての日付を表示し終えたら終了
        if (date > lastDay.getDate()) {
            break;
        }
    }
    
    // ナビゲーションボタンの状態を更新
    updateNavigationButtons();
}

// 日付をYYYY-MM-DD形式の文字列に変換（ローカル時間を使用）
function formatDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// セルの操作を設定（設定可能な日付）
function setupCellInteraction(cell, cellDate) {
    const dateStr = formatDateString(cellDate);
    
    // 初期状態を設定
    updateCellDisplay(cell, dateStr);
    
    // クリックイベント
    cell.addEventListener('click', function() {
        RestDayManager.toggleRestDay(dateStr);
        updateCellDisplay(cell, dateStr);
        
        // クリックアニメーション復活: スケール効果とタイムアウト
        cell.style.transform = 'scale(0.95)';
        setTimeout(() => {
            cell.style.transform = 'scale(1)';
        }, 150);
    });
    
    // ホバー効果
    cell.addEventListener('mouseenter', function() {
        if (!cell.classList.contains('disabled')) {
            cell.style.transform = 'scale(1.05)';
        }
    });
    
    cell.addEventListener('mouseleave', function() {
        if (!cell.classList.contains('disabled')) {
            cell.style.transform = 'scale(1)';
        }
    });
}

// 無効なセルの設定（設定不可能な日付）
function setupDisabledCell(cell, cellDate) {
    const dateStr = formatDateString(cellDate);
    
    // 既存の設定があれば表示（透明度で薄く表示）
    updateCellDisplay(cell, dateStr, true);
    
    // クリック無効
    cell.style.cursor = 'not-allowed';
}

// セルの表示を更新
function updateCellDisplay(cell, dateStr, isDisabled = false) {
    const isRest = RestDayManager.isRestDay(dateStr);
    
    // 既存のアイコンを削除
    const existingIcon = cell.querySelector('.day-status-icon');
    if (existingIcon) {
        existingIcon.remove();
    }
    
        // クラスをリセット
        cell.classList.remove('rest-day', 'work-day');
    
        if (isRest) {
            cell.classList.add('rest-day');
            const icon = document.createElement('i');
            icon.className = `bi bi-moon day-status-icon icon-rest`;
            if (isDisabled) {
                icon.style.opacity = '0.4';
            }
            cell.appendChild(icon);
        } else {
            cell.classList.add('work-day');
            const icon = document.createElement('i');
            icon.className = `bi bi-circle day-status-icon icon-work`;
            if (isDisabled) {
                icon.style.opacity = '0.4';
            }
            cell.appendChild(icon);
        }
}

// 設定保存
function saveSettings() {
    // RestDayManagerは既にLocalStorageに保存されているので、
    // ここでは追加の処理や確認を行う
    
    const dataSize = RestDayManager.getDataSize();
    
    // データ最適化
    const optimizedCount = RestDayManager.optimizeData();
    
    // 保存完了のフィードバック
    const originalText = saveSettingsBtn.innerHTML;
    saveSettingsBtn.innerHTML = '<i class="bi bi-check-lg"></i> 保存完了！';
    saveSettingsBtn.classList.add('btn-success');
    saveSettingsBtn.classList.remove('btn-primary');
    
    // 1.5秒後に前のページに戻る（前のページがない場合はカレンダーページに）
    setTimeout(() => {
        if (document.referrer && document.referrer !== window.location.href) {
            // 前のページがある場合は前のページに戻る
            window.location.href = document.referrer;
        } else {
            // 前のページがない場合はカレンダーページに遷移
            window.location.href = 'calender.html';
        }
    }, 1500);
}

// 操作可能な月を見つけて移動する関数
function findAndMoveToOperatableMonth() {
    const now = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 現在の月が操作可能ならそのまま
    if (hasOperatableDatesInMonth(currentYear, currentMonth)) {
        return;
    }
    
    // 今日の月から開始して、操作可能な月を探す
    const startDate = new Date(now);
    startDate.setDate(1);
    
    // まず今月をチェック
    if (hasOperatableDatesInMonth(startDate.getFullYear(), startDate.getMonth())) {
        currentDate.setFullYear(startDate.getFullYear(), startDate.getMonth(), 1);
        return;
    }
    
    // 前後3ヶ月の範囲で操作可能な月を探す
    for (let offset = 1; offset <= 3; offset++) {
        // 前の月をチェック
        const prevDate = new Date(startDate);
        prevDate.setMonth(prevDate.getMonth() - offset);
        if (hasOperatableDatesInMonth(prevDate.getFullYear(), prevDate.getMonth())) {
            currentDate.setFullYear(prevDate.getFullYear(), prevDate.getMonth(), 1);
            return;
        }
        
        // 次の月をチェック
        const nextDate = new Date(startDate);
        nextDate.setMonth(nextDate.getMonth() + offset);
        if (hasOperatableDatesInMonth(nextDate.getFullYear(), nextDate.getMonth())) {
            currentDate.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), 1);
            return;
        }
    }
    
    console.warn('操作可能な月が見つかりませんでした。現在の月を表示します。');
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // 操作可能な月を見つけて表示
    findAndMoveToOperatableMonth();
    
    // 初期カレンダー表示
    renderCalendar();
    
    // 前の月ボタン
    prevMonthBtn.addEventListener('click', () => {
        if (!prevMonthBtn.disabled) {
            const prevMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
            const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
            
            // 移動先の月に操作可能な日付があることを再確認
            if (hasOperatableDatesInMonth(prevYear, prevMonth)) {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            } else {
                console.warn(`前の月（${prevYear}年${prevMonth + 1}月）には操作可能な日付がありません`);
            }
        }
    });
    
    // 次の月ボタン
    nextMonthBtn.addEventListener('click', () => {
        if (!nextMonthBtn.disabled) {
            const nextMonth = currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1;
            const nextYear = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
            
            // 移動先の月に操作可能な日付があることを再確認
            if (hasOperatableDatesInMonth(nextYear, nextMonth)) {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            } else {
                console.warn(`次の月（${nextYear}年${nextMonth + 1}月）には操作可能な日付がありません`);
            }
        }
    });
    
    // 保存ボタン
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // ページ離脱時にも自動保存
    window.addEventListener('beforeunload', () => {
        RestDayManager.optimizeData();
    });
});

// デバッグ用：RestDayManagerの動作確認（エラーログのみ残す）
if (typeof RestDayManager === 'undefined') {
    console.error('RestDayManager is not loaded');
}
