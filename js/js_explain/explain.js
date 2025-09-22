document.addEventListener('DOMContentLoaded', function() {
            // カスタムアコーディオンボタンをすべて取得
            var accordionButtons = document.querySelectorAll('.accordion-button-custom');

            accordionButtons.forEach(function(button) {
                var targetId = button.getAttribute('data-bs-target');
                var collapseElement = document.querySelector(targetId);
                var icon = button.querySelector('i');

                // 初期状態に応じてアイコンの向きを設定
                if (collapseElement.classList.contains('show')) {
                    button.classList.remove('collapsed');
                    icon.style.transform = 'rotate(0deg)'; // 開いているときも回転させない
                } else {
                    button.classList.add('collapsed');
                    icon.style.transform = 'rotate(0deg)';
                }

                // Bootstrapのcollapseイベントにリスナーを追加
                collapseElement.addEventListener('show.bs.collapse', function () {
                    icon.style.transform = 'rotate(0deg)'; // 開いたときに回転させない
                    button.classList.remove('collapsed');
                });

                collapseElement.addEventListener('hide.bs.collapse', function () {
                    icon.style.transform = 'rotate(0deg)'; // 閉じたときに回転させない
                    button.classList.add('collapsed');
                });
            });
        });