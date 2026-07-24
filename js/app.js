document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#system-nav button');
    const tableContainer = document.getElementById('table-container');
    const descContainer = document.getElementById('description-container');
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');

    const synth = window.speechSynthesis;

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const targetSystem = e.target.getAttribute('data-target');
            loadSystemData(targetSystem);
        });
    });

    closeModal.addEventListener('click', () => {
        detailModal.classList.add('hidden');
    });

    async function loadSystemData(systemName) {
        try {
            const response = await fetch(`data/${systemName}.json`);
            if (!response.ok) throw new Error('Data fetch failed');
            const data = await response.json();
            renderContent(data);
        } catch (error) {
            console.error('Error:', error);
            tableContainer.innerHTML = '<p>資料載入失敗，請確認檔案路徑。</p>';
        }
    }

    function renderContent(data) {
        descContainer.innerHTML = `<h2>${data.title}</h2><p>${data.description}</p>`;
        let tableHTML = '<table class="evolution-table"><thead><tr>';
        
        data.headers.forEach(header => {
            if (header.langCode && header.hasDetail) {
                tableHTML += `<th class="lang-header" onclick="openLangDetail('${header.langCode}')">${header.name}</th>`;
            } else {
                tableHTML += `<th>${header.name}</th>`;
            }
        });
        tableHTML += '</tr></thead><tbody>';

        data.rows.forEach(row => {
            tableHTML += '<tr>';
            tableHTML += `<td>${row.phonetic}</td>`;
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

    window.openLangDetail = async function(langCode) {
        try {
            const response = await fetch(`data/details/${langCode}.json`);
            if (!response.ok) throw new Error('Detail fetch failed');
            const data = await response.json();
            
            let contentHTML = `
                <h2>${data.language}</h2>
                <p><strong>語言簡介：</strong>${data.intro}</p>
                <p><strong>主要使用地區：</strong>${data.region}</p>
                <p><strong>使用人數：</strong>${data.population}</p>
                <h3>字母表 (點擊發音)</h3>
                <div class="alphabet-grid">
            `;

            data.alphabet.forEach(item => {
                contentHTML += `
                    <div class="alphabet-card" onclick="speakText('${item.char}', '${langCode}')">
                        <span class="alphabet-char">${item.char}</span>
                        <div class="alphabet-name">${item.name}</div>
                    </div>
                `;
            });

            contentHTML += '</div>';
            modalBody.innerHTML = contentHTML;
            detailModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert('尚無此語言的詳細資料。');
        }
    };

    window.speakText = function(text, lang) {
        if (synth && lang) {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.8; 
            synth.speak(utterance);
        }
    };

    navButtons[0].click();
});
