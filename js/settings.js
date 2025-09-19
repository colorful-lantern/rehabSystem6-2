// // htmlのid=rehabilitation1~5のcheckboxのvalueをlocalstorageに保存する
// ['save'].forEach(function(buttonId) {
//     document.getElementById(buttonId).addEventListener('click', function() {
//         document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
//             const key = checkbox.id;
//             const value = checkbox.checked;
//             localStorage.setItem(key, value);
//         });
//         saveCheckboxStates();
//     });
// });

// ['homebtn','explainbtn'].forEach(function(buttonId) {
//     document.getElementById(buttonId).addEventListener('click', function() {
//         document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
//             const key = checkbox.id;
//             const value = checkbox.checked;
//             localStorage.setItem(key, value);
//         });
//         saveCheckboxStatesMin();
//     });
// });


// // clearボタンが押されたら、index.html?clear=trueにリダイレクトする
// // document.getElementById('clear').addEventListener('click', function() {
// //     // localstorageのkey=nmberofClassが0のときは、alertで「リセット済みです」と表示
// //     if (localStorage.getItem('numberofClass') === '0') {
// //         alert('リセット済みです');
// //         return;
// //     }
// //     // index.html?clear=trueにリダイレクトする
// //     location.href = 'index.html?clear=true';
// // });

// function saveCheckboxStates() {
//     let cnt = 0;
//     document.querySelectorAll('#rehabilitation1, #rehabilitation2, #rehabilitation3, #rehabilitation4').forEach(function(checkbox) {
//         const key = checkbox.id;
//         const value = localStorage.getItem(key);
//         if (value === 'true') {
//             checkbox.checked = true;
//             cnt++;
//         } else {
//             checkbox.checked = false;
//         }
//     });
//     // numberofClassにcntを代入する
//     if(cnt>0){
//         // 同じディレクトリ内のindex.htmlにリダイレクトする
//         location.href = 'index.html';
//     }else{
//         // アラートで「1つ以上選択してください」と表示する
//         alert('リハビリは1つ以上選択してください');
//         return;
//     }
// }

// function saveCheckboxStatesMin() {
//     document.querySelectorAll('#rehabilitation1, #rehabilitation2, #rehabilitation3, #rehabilitation4, #rehabilitation5').forEach(function(checkbox) {
//         const key = checkbox.id;
//         const value = localStorage.getItem(key);
//         if (value === 'true') {
//             checkbox.checked = true;
//         } else {
//             checkbox.checked = false;
//         }
//     });
// }

// // localstrage のkey=rehabilitation1~5のvalueを取得して、htmlのid=rehabilitation1~5のcheckboxにチェックを入れる
// function loadCheckboxStates() {
//     let cnt = 0;
//     document.querySelectorAll('#rehabilitation1, #rehabilitation2, #rehabilitation3, #rehabilitation4, #rehabilitation5').forEach(function(checkbox) {
//         const key = checkbox.id;
//         const value = localStorage.getItem(key);
//         if (value === 'true') {
//             checkbox.checked = true;
//             cnt++;
//         } else {
//             checkbox.checked = false;
//         }
//     });
//     // numberofClassにcntを代入する
//     if(cnt>0){
//         numberOfClass = cnt;
//     }else{
//         numberOfClass = 0;
//     }
//     // localstrageのkey=numberofClassにcntを保存する
//     localStorage.setItem('numberofClass', numberOfClass);
// }
// loadCheckboxStates();