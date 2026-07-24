document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#system-nav button');
    const tableContainer = document.getElementById('table-container');
    const descContainer = document.getElementById('description-container');

    // 語音合成引擎初始化
    const synth = window.speechSynthesis;

    // 綁定導覽列點擊事件
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 更新按鈕狀態
            navButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const targetSystem = e.target.getAttribute('data-target');
            loadSystemData(targetSystem);
        });
    });

    // 非同步載入 JSON 資料
    async function loadSystemData(systemName) {
        try {
            // 部署至 GitHub Pages 時，路徑依賴相對位置
            const response = await fetch(`data/${systemName}.json`);
            if (!response.ok) throw new Error('Data fetch failed');
            
            const data = await response.json();
            renderContent(data);
        } catch (error) {
            console.error('Error loading data:', error);
            tableContainer.innerHTML = '<p>資料載入失敗，請確認檔案路徑或伺服器狀態。</p>';
        }
    }

    // 渲染說明與表格
    function renderContent(data) {
        // 渲染說明區塊
        descContainer.innerHTML = `
            <h2>${data.title}</h2>
            <p>${data.description}</p>
        `;

        // 建構表格 HTML
        let tableHTML = '<table class="evolution-table"><thead><tr>';
        
        // 生成表頭
        data.headers.forEach(header => {
            tableHTML += `<th>${header.name}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        // 生成表格內容
        data.rows.forEach(row => {
            tableHTML += '<tr>';
            // 第一欄通常為發音標示，不具備發音事件
            tableHTML += `<td>${row.phonetic}</td>`;
            
            // 生成各語言字母儲存格
            row.characters.forEach((charData, index) => {
                if (charData.char) {
                    const langCode = data.headers[index + 1].langCode;
                    tableHTML += `<td class="char-cell" onclick="speakText('${charData.char}', '${langCode}')">${charData.char}</td>`;
                } else {
                    tableHTML += '<td class="char-empty"></td>';
                }
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        tableContainer.innerHTML = tableHTML;
    }

    // 將真實發音函式暴露至全域以供 onClick 呼叫
    window.speakText = function(text, lang) {
        // 若瀏覽器支援語音合成且有傳入語言代碼
        if (synth && lang) {
            // 阻斷前次未完成的語音
            synth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            // 略微放慢語速以提升辨識度
            utterance.rate = 0.8; 
            
            synth.speak(utterance);
        }
    };

    // 預設載入全音素文字
    navButtons[0].click();
});
