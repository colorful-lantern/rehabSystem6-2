// 管理者パスワード（本来はサーバーサイドで管理すべき）
        const ADMIN_PASSWORD = "admin2025";
        
        // リハビリタイプの名前マッピング
        const REHAB_NAMES = {
            0: '理学療法',
            1: '言語療法', 
            2: '作業療法',
            3: '心理療法',
            4: '自主トレーニング'
        };

        // ページ読み込み時にパスワードモーダルを表示
        document.addEventListener('DOMContentLoaded', function() {
            const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
            passwordModal.show();

            // Enterキーでパスワード認証
            document.getElementById('adminPassword').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    checkPassword();
                }
            });
        });

        // パスワードチェック
        function checkPassword() {
            const password = document.getElementById('adminPassword').value;
            const errorDiv = document.getElementById('passwordError');
            
            if (password === ADMIN_PASSWORD) {
                const passwordModal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
                passwordModal.hide();
                document.getElementById('adminContent').classList.remove('d-none');
                loadAdminData();
            } else {
                errorDiv.classList.remove('d-none');
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminPassword').focus();
            }
        }

        // 戻る
        function goBack() {
            window.location.href = 'setting.html';
        }

        // 管理者データを読み込み
        function loadAdminData() {
            const dataContainer = document.getElementById('dataContainer');
            const allData = getAllRehabData();
            
            if (Object.keys(allData).length === 0) {
                dataContainer.innerHTML = '<div class="no-data-message">リハビリ記録が見つかりませんでした。</div>';
                return;
            }

            // 月ごとにデータを整理
            const monthlyData = {};
            Object.keys(allData).forEach(date => {
                const monthKey = date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {};
                }
                monthlyData[monthKey][date] = allData[date];
            });

            // 月インデックスを生成
            const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
            let monthIndexHtml = '<div class="month-index">';
            sortedMonths.forEach(month => {
                const [year, monthNum] = month.split('-');
                monthIndexHtml += `<button class="btn btn-outline-primary btn-sm month-btn" onclick="scrollToMonth('${month}')">${year}年${parseInt(monthNum)}月</button>`;
            });
            monthIndexHtml += '</div>';

            let html = monthIndexHtml;
            
            // 日付順にソート（新しい順）
            const sortedDates = Object.keys(allData).sort((a, b) => new Date(b) - new Date(a));
            
            sortedDates.forEach(date => {
                const dateData = allData[date];
                const formattedDate = formatDate(date);
                const monthKey = date.substring(0, 7);
                
                // 実施済みのリハビリのみを収集
                const completedRehabs = [];
                for (let i = 0; i <= 4; i++) {
                    if (dateData[i] === true) {
                        completedRehabs.push({
                            index: i,
                            name: REHAB_NAMES[i]
                        });
                    }
                }
                
                // 実施済みのリハビリがある場合のみ表示
                if (completedRehabs.length > 0) {
                    html += `<div class="day-section" data-month="${monthKey}">`;
                    html += `<div class="day-header" onclick="toggleDay(this)">
                        <span>${formattedDate} (${completedRehabs.length})</span>
                        <div>
                            <button class="btn btn-danger btn-sm me-2" onclick="event.stopPropagation(); deleteAllDayRecords('${date}', '${formattedDate}')">
                                <i class="bi bi-trash"></i>
                            </button>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                    </div>`;
                    html += `<div class="day-content">`;
                    
                    // 実施済みリハビリのみ表示
                    completedRehabs.forEach(rehab => {
                        let extraInfo = '';
                        let countInput = '';
                        
                        if (rehab.index === 4) {
                            // 自主トレーニングの場合、テキスト内容を表示
                            const text = SelfTrainingManager.getTextContent(date);
                            if (text) {
                                extraInfo = `<div class="text-muted small mt-1" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${text}</div>`;
                            }
                        } else {
                            // 通常のリハビリの場合、カウント編集フィールドを表示
                            const currentCount = getCurrentRehabCount(date, rehab.index);
                            countInput = `
                                <div class="mt-1">
                                    <label class="form-label small text-muted">実行回数:</label>
                                    <input type="number" class="form-control form-control-sm count-input" 
                                           style="width: 80px; display: inline-block;" 
                                           value="${currentCount}" 
                                           min="0" 
                                           step="1"
                                           data-date="${date}" 
                                           data-rehab-index="${rehab.index}"
                                           onkeypress="return /[0-9]/.test(event.key) || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Tab'"
                                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                </div>
                            `;
                        }
                        
                        html += `
                            <div class="admin-data-item has-data">
                                <div>
                                    <div class="fw-bold">${rehab.name}</div>
                                    <div class="rehab-type">
                                        <i class="bi bi-check-circle-fill text-success"></i> 実施済み
                                    </div>
                                    ${extraInfo}
                                    ${countInput}
                                </div>
                                <button class="btn btn-danger btn-sm delete-btn" 
                                        onclick="confirmDelete('${date}', ${rehab.index}, '${rehab.name}', '${formattedDate}')">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        `;
                    });
                    
                    html += `</div></div>`;
                }
            });
            
            dataContainer.innerHTML = html;
        }

        // アコーディオンの開閉
        function toggleDay(headerElement) {
            const daySection = headerElement.parentElement;
            const dayContent = daySection.querySelector('.day-content');
            const chevron = headerElement.querySelector('.bi-chevron-down, .bi-chevron-up');
            
            if (dayContent.classList.contains('show')) {
                dayContent.classList.remove('show');
                chevron.className = 'bi bi-chevron-down';
            } else {
                dayContent.classList.add('show');
                chevron.className = 'bi bi-chevron-up';
            }
        }

        // 月にスクロール
        function scrollToMonth(monthKey) {
            const firstSectionOfMonth = document.querySelector(`[data-month="${monthKey}"]`);
            if (firstSectionOfMonth) {
                firstSectionOfMonth.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 自動的に展開
                const header = firstSectionOfMonth.querySelector('.day-header');
                const content = firstSectionOfMonth.querySelector('.day-content');
                if (!content.classList.contains('show')) {
                    toggleDay(header);
                }
            }
        }

        // 特定の日のすべての記録を削除
        function deleteAllDayRecords(date, formattedDate) {
            const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            const messageElement = document.getElementById('deleteConfirmMessage');
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            
            messageElement.innerHTML = `
                <strong>${formattedDate}</strong><br>
                この日のすべての記録を削除しますか？
            `;
            
            // 削除ボタンのクリックイベントを設定
            confirmBtn.onclick = function() {
                const today = new Date().toISOString().split('T')[0];
                
                if (date === today) {
                    // 今日のデータを削除
                    for (let i = 0; i <= 4; i++) {
                        localStorage.removeItem(`each${i}`);
                    }
                    // status_も削除して完全にクリア
                    localStorage.removeItem(`status_${today}`);
                    // 自主トレーニングの記録とテキストも削除
                    SelfTrainingManager.deleteRecord(today);
                } else {
                    // 過去のデータを削除
                    localStorage.removeItem(`status_${date}`);
                    // 自主トレーニングの記録とテキストも削除
                    SelfTrainingManager.deleteRecord(date);
                }
                
                modal.hide();
                loadAdminData();
                showSuccessMessage(`${formattedDate}の記録をすべて削除しました。`);
            };
            
            modal.show();
        }

        // すべてのデータを削除
        function clearAllData() {
            if (confirm('すべてのデータを削除しますか？\nこの操作は取り消せません。')) {
                window.location.href = 'index.html?clear=true';
            }
        }

        // すべてのリハビリデータを取得
        function getAllRehabData() {
            const data = {};
            const today = new Date().toISOString().split('T')[0];
            
            // 現在の各リハビリの状態をチェック（今日の分）
            let hasTodayData = false;
            for (let i = 0; i <= 3; i++) {
                // 新しいカウンターシステムに対応：each0_countをチェック
                let countKey = `each${i}_count`;
                let countValue = parseInt(localStorage.getItem(countKey), 10);
                
                if (!isNaN(countValue) && countValue > 0) {
                    if (!data[today]) {
                        data[today] = {};
                    }
                    data[today][i] = true; // 実行回数が1以上なら実施済み
                    hasTodayData = true;
                }
            }
            
            // 今日の自主トレーニングデータをチェック
            if (SelfTrainingManager.hasRecord(today)) {
                if (!data[today]) {
                    data[today] = {};
                }
                data[today][4] = true;
                hasTodayData = true;
            }
            
            // status_キーから過去の日付データを取得
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('status_')) {
                    const date = key.split('_')[1];
                    const statusValue = localStorage.getItem(key);
                    
                    if (statusValue) {
                        if (!data[date]) {
                            data[date] = {};
                        }
                        
                        if (statusValue.includes(',')) {
                            // "1,each0=15,each1=12,each2=4,each3=7,each4=1" のような形式を解析
                            const parts = statusValue.split(',');
                            
                            for (let i = 1; i < parts.length; i++) {
                                const part = parts[i];
                                if (part.includes('=')) {
                                    const [keyPart, value] = part.split('=');
                                    
                                    // each0~4の形式を処理
                                    if (keyPart.startsWith('each')) {
                                        const rehabIndex = parseInt(keyPart.replace('each', ''));
                                        if (!isNaN(rehabIndex) && rehabIndex >= 0 && rehabIndex <= 4) {
                                            // 新しい形式：数値の場合は1以上で実施済み、true/falseの場合はそのまま
                                            const numValue = parseInt(value, 10);
                                            if (!isNaN(numValue)) {
                                                data[date][rehabIndex] = numValue > 0;
                                            } else {
                                                data[date][rehabIndex] = value === 'true';
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (statusValue === 'clear') {
                            // "clear"の場合、すべてのリハビリが実施済みと仮定
                            // ただし、どのリハビリが有効かは設定から取得
                            for (let i = 0; i <= 3; i++) {
                                const rehabKey = `rehabilitation${i + 1}`;
                                const isEnabled = localStorage.getItem(rehabKey) === 'true';
                                if (isEnabled) {
                                    data[date][i] = true;
                                }
                            }
                        }
                        
                        // 過去の自主トレーニングデータもチェック
                        if (SelfTrainingManager.hasRecord(date)) {
                            data[date][4] = true;
                        }
                    }
                }
            });
            
            return data;
        }

        // 日付フォーマット
        function formatDate(dateStr) {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
            
            return `${year}年${month}月${day}日（${dayOfWeek}）`;
        }

        // 特定の日付とリハビリインデックスの実行回数を取得
        function getCurrentRehabCount(date, rehabIndex) {
            const today = new Date().toISOString().split('T')[0];
            
            if (date === today) {
                // 今日の場合はカウンターから取得
                const countKey = `each${rehabIndex}_count`;
                return parseInt(localStorage.getItem(countKey), 10) || 0;
            } else {
                // 過去の日付の場合はstatus_データから取得
                const statusKey = `status_${date}`;
                const statusValue = localStorage.getItem(statusKey);
                
                if (statusValue && statusValue.includes(',')) {
                    const parts = statusValue.split(',');
                    for (let i = 1; i < parts.length; i++) {
                        const part = parts[i];
                        if (part.includes('=')) {
                            const [keyPart, value] = part.split('=');
                            if (keyPart === `each${rehabIndex}`) {
                                const numValue = parseInt(value, 10);
                                return !isNaN(numValue) ? numValue : (value === 'true' ? 1 : 0);
                            }
                        }
                    }
                }
                return 0;
            }
        }

        // 削除確認
        function confirmDelete(date, rehabIndex, rehabName, formattedDate) {
            const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            const messageElement = document.getElementById('deleteConfirmMessage');
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            
            messageElement.innerHTML = `
                <strong>${formattedDate}</strong><br>
                <strong>${rehabName}</strong>の記録を削除しますか？
            `;
            
            // 削除ボタンのクリックイベントを設定
            confirmBtn.onclick = function() {
                deleteRehabRecord(date, rehabIndex);
                modal.hide();
            };
            
            modal.show();
        }

        // リハビリ記録を削除
        function deleteRehabRecord(date, rehabIndex) {
            const today = new Date().toISOString().split('T')[0];
            
            if (date === today) {
                // 今日のデータの場合：LocalStorageから直接削除
                if (rehabIndex === 4) {
                    // 自主トレーニングの場合
                    SelfTrainingManager.deleteRecord(today);
                } else {
                    // 従来のリハビリの場合：新しいカウンターシステムに対応
                    const countKey = `each${rehabIndex}_count`;
                    localStorage.setItem(countKey, '0'); // カウントを0にリセット
                    
                    // 古いeachキーも削除（互換性のため）
                    const eachKey = `each${rehabIndex}`;
                    localStorage.removeItem(eachKey);
                }
                
                // 今日のstatus_を更新（削除後に自動再生成しない）
                updateStatusDataAfterDelete();
            } else {
                // 過去のデータの場合：status_データを更新
                if (rehabIndex === 4) {
                    // 自主トレーニングの場合
                    SelfTrainingManager.deleteRecord(date);
                } else {
                    // 従来のリハビリの場合：status_データを更新
                    updatePastStatusData(date, rehabIndex);
                }
            }
            
            // データを再読み込み
            loadAdminData();
            
            // 成功メッセージ
            showSuccessMessage('記録を削除しました。');
        }

        // 過去のstatus_データを更新
        function updatePastStatusData(date, rehabIndex) {
            const statusKey = `status_${date}`;
            const statusValue = localStorage.getItem(statusKey);
            
            if (!statusValue) return;
            
            if (statusValue === 'clear') {
                // "clear"の場合、該当リハビリを0にして再構築
                let achievedStatus = [];
                let cnt = 0;
                
                for (let i = 0; i <= 3; i++) {
                    const rehabKey = `rehabilitation${i + 1}`;
                    const isEnabled = localStorage.getItem(rehabKey) === 'true';
                    
                    if (isEnabled) {
                        if (i === rehabIndex) {
                            achievedStatus.push(`each${i}=0`);
                        } else {
                            // 他のリハビリは1回実施済みとして保持
                            achievedStatus.push(`each${i}=1`);
                            cnt++;
                        }
                    }
                }
                
                const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
                let newStatusValue = '';
                
                if (cnt === totalRehabilitations && totalRehabilitations > 0) {
                    newStatusValue = 'clear';
                } else {
                    newStatusValue = cnt.toString();
                }
                
                if (achievedStatus.length > 0) {
                    newStatusValue += ',' + achievedStatus.join(',');
                }
                
                if (cnt === 0) {
                    localStorage.removeItem(statusKey);
                } else {
                    localStorage.setItem(statusKey, newStatusValue);
                }
            } else if (statusValue.includes(',')) {
                // "1,each0=15,each1=12,each2=4,each3=7,each4=1" のような形式を更新
                const parts = statusValue.split(',');
                const updatedParts = [parts[0]]; // 最初の数字部分は仮保持
                
                for (let i = 1; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.includes('=')) {
                        const [eachKey, value] = part.split('=');
                        const currentRehabIndex = parseInt(eachKey.replace('each', ''));
                        
                        if (currentRehabIndex === rehabIndex) {
                            // 削除対象のリハビリは 0 に変更
                            updatedParts.push(`${eachKey}=0`);
                        } else {
                            // その他はそのまま保持
                            updatedParts.push(part);
                        }
                    }
                }
                
                // 達成数を再計算（実行回数が1以上のものをカウント）
                let trueCount = 0;
                for (let i = 1; i < updatedParts.length; i++) {
                    const part = updatedParts[i];
                    if (part.includes('=') && !part.startsWith('each4')) { // each4は除外
                        const [, value] = part.split('=');
                        const numValue = parseInt(value, 10);
                        if (!isNaN(numValue) && numValue > 0) {
                            trueCount++;
                        } else if (value === 'true') {
                            trueCount++;
                        }
                    }
                }
                
                // 最初の数字部分を更新
                const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
                if (trueCount === totalRehabilitations && totalRehabilitations > 0) {
                    updatedParts[0] = 'clear';
                } else {
                    updatedParts[0] = trueCount.toString();
                }
                
                // 更新されたデータを保存
                if (trueCount === 0) {
                    // すべて 0 の場合は削除
                    localStorage.removeItem(statusKey);
                } else {
                    localStorage.setItem(statusKey, updatedParts.join(','));
                }
            }
        }

        // status_データを更新（削除後専用、自動再生成を防ぐ）
        function updateStatusDataAfterDelete() {
            let cnt = 0;
            let achievedStatus = [];
            
            // 新しいカウンターシステム：each0_countなどをチェック
            for (let i = 0; i <= 3; i++) {
                const key2 = `rehabilitation${i + 1}`;
                const value2 = localStorage.getItem(key2);
                
                // 取り組むリハビリの場合のみ記録
                if (value2 === 'true') {
                    const countKey = `each${i}_count`;
                    const countValue = parseInt(localStorage.getItem(countKey), 10) || 0;
                    
                    if (countValue > 0) {
                        cnt++;
                        achievedStatus.push(`each${i}=${countValue}`);
                    } else {
                        achievedStatus.push(`each${i}=0`);
                    }
                }
            }
            
            // 自主トレーニングのデータも確認（ポイント計算には含めない）
            const today = new Date().toISOString().split('T')[0];
            if (SelfTrainingManager.hasRecord(today)) {
                achievedStatus.push(`each4=1`);
            }
            
            // 今日の日付のstatus_を更新
            const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
            
            if (cnt === 0 && achievedStatus.filter(s => !s.startsWith('each4')).length === 0) {
                // リハビリデータが何もない場合（自主トレーニングのみの場合も含む）
                if (achievedStatus.some(s => s.startsWith('each4'))) {
                    // 自主トレーニングのみある場合
                    localStorage.setItem(`status_${today}`, '0,' + achievedStatus.join(','));
                } else {
                    // 何もない場合はstatus_を削除
                    localStorage.removeItem(`status_${today}`);
                }
                localStorage.setItem('nmboftrue', '0');
            } else {
                let statusValue = '';
                if (cnt === totalRehabilitations && totalRehabilitations > 0) {
                    statusValue = 'clear';
                } else {
                    statusValue = cnt.toString();
                }
                
                statusValue += ',' + achievedStatus.join(',');
                localStorage.setItem(`status_${today}`, statusValue);
                localStorage.setItem('nmboftrue', cnt);
            }
        }

        // status_データを更新
        function updateStatusData() {
            let cnt = 0;
            let achievedStatus = [];
            
            for (let i = 0; i <= 3; i++) {
                // each0~3のみをチェック
                let key = `each${i}`;
                let value = localStorage.getItem(key);
                
                const key2 = `rehabilitation${i + 1}`;
                const value2 = localStorage.getItem(key2);
                
                // 取り組むリハビリのみ記録
                if (value2 === 'true') {
                    if (value === 'true') {
                        cnt++;
                        achievedStatus.push(`each${i}=true`);
                    } else {
                        achievedStatus.push(`each${i}=false`);
                    }
                }
            }
            
            localStorage.setItem('nmboftrue', cnt);
            
            // 今日の日付のstatus_を更新
            const today = new Date().toISOString().split('T')[0];
            const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
            
            let statusValue = '';
            if (cnt === totalRehabilitations && totalRehabilitations > 0) {
                statusValue = 'clear';
            } else {
                statusValue = cnt.toString();
            }
            
            if (achievedStatus.length > 0) {
                statusValue += ',' + achievedStatus.join(',');
            }
            
            if (statusValue === '0' || statusValue === '') {
                localStorage.removeItem(`status_${today}`);
            } else {
                localStorage.setItem(`status_${today}`, statusValue);
            }
        }

        // データ更新
        function refreshData() {
            loadAdminData();
            showSuccessMessage('データを更新しました。');
        }

        // データを保存する
        function saveAllData() {
            try {
                const countInputs = document.querySelectorAll('.count-input');
                let saveCount = 0;
                
                countInputs.forEach(input => {
                    const date = input.dataset.date;
                    const rehabIndex = parseInt(input.dataset.rehabIndex);
                    const newCount = parseInt(input.value) || 0;
                    const currentCount = getCurrentRehabCount(date, rehabIndex);
                    
                    // 値が変更されている場合のみ保存
                    if (newCount !== currentCount) {
                        updateRehabCount(date, rehabIndex, newCount);
                        saveCount++;
                    }
                });
                
                if (saveCount > 0) {
                    loadAdminData(); // データを再読み込み
                    showSuccessMessage(`${saveCount}件のデータを保存しました。`);
                } else {
                    showSuccessMessage('変更されたデータはありませんでした。');
                }
            } catch (error) {
                console.error('データ保存エラー:', error);
                showErrorMessage('データの保存中にエラーが発生しました。');
            }
        }

        // 特定の日付とリハビリの実行回数を更新
        function updateRehabCount(date, rehabIndex, newCount) {
            const today = new Date().toISOString().split('T')[0];
            
            if (date === today) {
                // 今日の場合はカウンターを更新
                const countKey = `each${rehabIndex}_count`;
                localStorage.setItem(countKey, newCount.toString());
                
                // status_データも更新
                updateStatusDataAfterEdit();
            } else {
                // 過去の日付の場合はstatus_データを更新
                updatePastStatusDataWithNewCount(date, rehabIndex, newCount);
            }
        }

        // 今日のstatus_データを編集後に更新
        function updateStatusDataAfterEdit() {
            let cnt = 0;
            let achievedStatus = [];
            
            // 新しいカウンターシステム：each0_countなどをチェック
            for (let i = 0; i <= 3; i++) {
                const key2 = `rehabilitation${i + 1}`;
                const value2 = localStorage.getItem(key2);
                
                // 取り組むリハビリの場合のみ記録
                if (value2 === 'true') {
                    const countKey = `each${i}_count`;
                    const countValue = parseInt(localStorage.getItem(countKey), 10) || 0;
                    
                    if (countValue > 0) {
                        cnt++;
                        achievedStatus.push(`each${i}=${countValue}`);
                    } else {
                        achievedStatus.push(`each${i}=0`);
                    }
                }
            }
            
            // 自主トレーニングのデータも確認
            const today = new Date().toISOString().split('T')[0];
            if (SelfTrainingManager.hasRecord(today)) {
                achievedStatus.push(`each4=1`);
            }
            
            // status_を更新
            const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
            
            if (cnt === 0 && achievedStatus.filter(s => !s.startsWith('each4')).length === 0) {
                if (achievedStatus.some(s => s.startsWith('each4'))) {
                    localStorage.setItem(`status_${today}`, '0,' + achievedStatus.join(','));
                } else {
                    localStorage.removeItem(`status_${today}`);
                }
                localStorage.setItem('nmboftrue', '0');
            } else {
                let statusValue = '';
                if (cnt === totalRehabilitations && totalRehabilitations > 0) {
                    statusValue = 'clear';
                } else {
                    statusValue = cnt.toString();
                }
                
                statusValue += ',' + achievedStatus.join(',');
                localStorage.setItem(`status_${today}`, statusValue);
                localStorage.setItem('nmboftrue', cnt);
            }
        }

        // 過去のstatus_データを新しいカウントで更新
        function updatePastStatusDataWithNewCount(date, rehabIndex, newCount) {
            const statusKey = `status_${date}`;
            const statusValue = localStorage.getItem(statusKey);
            
            if (!statusValue) return;
            
            if (statusValue.includes(',')) {
                const parts = statusValue.split(',');
                const updatedParts = [parts[0]]; // 最初の数字部分は仮保持
                let targetFound = false;
                
                for (let i = 1; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.includes('=')) {
                        const [eachKey, value] = part.split('=');
                        const currentRehabIndex = parseInt(eachKey.replace('each', ''));
                        
                        if (currentRehabIndex === rehabIndex) {
                            // 対象のリハビリのカウントを更新
                            updatedParts.push(`${eachKey}=${newCount}`);
                            targetFound = true;
                        } else {
                            // その他はそのまま保持
                            updatedParts.push(part);
                        }
                    }
                }
                
                // 該当するリハビリが見つからなかった場合は追加
                if (!targetFound) {
                    updatedParts.push(`each${rehabIndex}=${newCount}`);
                }
                
                // 達成数を再計算
                let trueCount = 0;
                for (let i = 1; i < updatedParts.length; i++) {
                    const part = updatedParts[i];
                    if (part.includes('=') && !part.startsWith('each4')) {
                        const [, value] = part.split('=');
                        const numValue = parseInt(value, 10);
                        if (!isNaN(numValue) && numValue > 0) {
                            trueCount++;
                        } else if (value === 'true') {
                            trueCount++;
                        }
                    }
                }
                
                // 最初の数字部分を更新
                const totalRehabilitations = parseInt(localStorage.getItem('numberofClass') || 0);
                if (trueCount === totalRehabilitations && totalRehabilitations > 0) {
                    updatedParts[0] = 'clear';
                } else {
                    updatedParts[0] = trueCount.toString();
                }
                
                // 更新されたデータを保存
                localStorage.setItem(statusKey, updatedParts.join(','));
            }
        }

        // 成功メッセージ表示
        function showSuccessMessage(message) {
            // 簡単なtoast風メッセージ
            const toast = document.createElement('div');
            toast.className = 'alert alert-success position-fixed';
            toast.style.cssText = 'top: 20px; right: 20px; z-index: 1060; width: 300px;';
            toast.innerHTML = `
                <i class="bi bi-check-circle"></i> ${message}
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // エラーメッセージ表示
        function showErrorMessage(message) {
            const toast = document.createElement('div');
            toast.className = 'alert alert-danger position-fixed';
            toast.style.cssText = 'top: 20px; right: 20px; z-index: 1060; width: 300px;';
            toast.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i> ${message}
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }