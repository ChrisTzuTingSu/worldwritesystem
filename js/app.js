document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#system-nav button');
    const tabularView = document.getElementById('tabular-view');
    const mapView = document.getElementById('map-view');
    const tableContainer = document.getElementById('table-container');
    const descContainer = document.getElementById('description-container');
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');

    const synth = window.speechSynthesis;
    let mapInstance = null; 

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const targetSystem = e.target.getAttribute('data-target');
            
            if (targetSystem === 'map_view') {
                tabularView.classList.add('hidden');
                mapView.classList.remove('hidden');
                initMap();
            } else {
                mapView.classList.add('hidden');
                tabularView.classList.remove('hidden');
                loadSystemData(targetSystem);
            }
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
            tableContainer.innerHTML = '<p>資料載入失敗，請確認檔案路徑或伺服器狀態。</p>';
        }
    }

    function renderContent(data) {
        descContainer.innerHTML = `<h2>${data.title}</h2><p>${data.description}</p>`;
        let tableHTML = '<table class="evolution-table"><thead><tr>';
        
        data.headers.forEach(header => {
            if (header.hasDetail) {
                const targetFile = header.countryCode || header.langCode;
                tableHTML += `<th class="lang-header" onclick="openLangDetail('${targetFile}')">${header.name}</th>`;
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

    function initMap() {
        if (mapInstance) {
            return;
        }

        document.getElementById('map-container').innerHTML = '';

        mapInstance = new svgMap({
            targetElementID: 'map-container',
            data: {
                data: {
                    status: {
                        name: '資料庫狀態',
                        format: '{0}'
                    }
                },
                applyData: 'status',
                values: {
                    TH: { status: '已建置專屬介紹', color: '#6ECCB0' },
                    TW: { status: '已建置專屬介紹', color: '#6ECCB0' },
                    FR: { status: '已建置專屬介紹', color: '#6ECCB0' }
                }
            }
        });

        setTimeout(() => {
            const mapElements = document.querySelectorAll('.svgMap-country');
            mapElements.forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', function() {
                    const countryCode = this.getAttribute('data-id');
                    openLangDetail(countryCode);
                });
            });
        }, 500);
    }

    window.openLangDetail = async function(targetCode) {
        try {
            const response = await fetch(`data/details/${targetCode}.json`);
            if (!response.ok) throw new Error('Detail fetch failed');
            const data = await response.json();
            
            const displayTitle = data.title || data.language;
            let contentHTML = `<h2>${displayTitle}</h2>`;

            if (data.intro) contentHTML += `<p>概論：${data.intro}</p>`;
            if (data.region) contentHTML += `<p>主要使用地區：${data.region}</p>`;
            if (data.population) contentHTML += `<p>使用人數：${data.population}</p>`;

            if (data.languages && Array.isArray(data.languages)) {
                contentHTML += `<div style="margin-bottom: 1.5rem; padding: 1rem; background: #f1f3f5; border-radius: 4px;">`;
                contentHTML += `<strong>語系導覽：</strong><br>`;
                data.languages.forEach((lang, idx) => {
                    contentHTML += `<a href="#lang-sec-${idx}" style="margin-right: 1rem; color: #2c3e50; text-decoration: underline; display: inline-block; margin-top: 0.5rem;">${lang.name}</a>`;
                });
                contentHTML += `</div>`;

                data.languages.forEach((lang, idx) => {
                    contentHTML += `<h3 id="lang-sec-${idx}" style="margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">${lang.name}</h3>`;
                    contentHTML += `<p>${lang.desc}</p>`;
                    contentHTML += `<div class="alphabet-grid">`;
                    lang.alphabet.forEach(item => {
                        const clickAction = lang.engineCode ? `onclick="speakText('${item.char}', '${lang.engineCode}')"` : '';
                        contentHTML += `
                            <div class="alphabet-card" ${clickAction}>
                                <span class="alphabet-char">${item.char}</span>
                                <div class="alphabet-name">${item.name}</div>
                            </div>
                        `;
                    });
                    contentHTML += `</div>`;
                });
            } else if (data.alphabet) {
                contentHTML += `<h3>字母表 (點擊發音)</h3><div class="alphabet-grid">`;
                data.alphabet.forEach(item => {
                    const clickAction = data.engineCode ? `onclick="speakText('${item.char}', '${data.engineCode}')"` : '';
                    contentHTML += `
                        <div class="alphabet-card" ${clickAction}>
                            <span class="alphabet-char">${item.char}</span>
                            <div class="alphabet-name">${item.name}</div>
                        </div>
                    `;
                });
                contentHTML += `</div>`;
            }

            modalBody.innerHTML = contentHTML;
            detailModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert('尚無此國家或語言的詳細資料。');
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
