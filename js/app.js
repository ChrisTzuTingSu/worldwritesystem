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

    function initMap() {
        if (mapInstance) {
            mapInstance.invalidateSize(); 
            return;
        }

        mapInstance = L.map('map-container').setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 6,
            minZoom: 2
        }).addTo(mapInstance);

        fetch('data/countries.geojson')
            .then(response => {
                if (!response.ok) throw new Error('GeoJSON fetch failed');
                return response.json();
            })
            .then(geoData => {
                L.geoJSON(geoData, {
                    style: {
                        color: "#2c3e50",
                        weight: 1,
                        fillColor: "#e9ecef",
                        fillOpacity: 0.6
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('mouseover', function () {
                            this.setStyle({ fillColor: '#3498db', fillOpacity: 0.8 });
                        });
                        layer.on('mouseout', function () {
                            this.setStyle({ fillColor: '#e9ecef', fillOpacity: 0.6 });
                        });
                        
                        layer.on('click', function () {
                            const countryCode = feature.properties.ISO_A2; 
                            openLangDetail(countryCode);
                        });
                    }
                }).addTo(mapInstance);
            })
            .catch(error => {
                console.error('GeoJSON 載入失敗:', error);
                document.getElementById('map-container').innerHTML = '<p style="padding:2rem;">無法載入地理圖層，請確認 data/countries.geojson 檔案是否存在。</p>';
            });
    }

    window.openLangDetail = async function(targetCode) {
        try {
            const response = await fetch(`data/details/${targetCode}.json`);
            if (!response.ok) throw new Error('Detail fetch failed');
            const data = await response.json();
            
            let contentHTML = `
                <h2>${data.language}</h2>
                <p>概論：${data.intro}</p>
                <p>主要使用地區：${data.region}</p>
                <p>使用人數：${data.population}</p>
                <h3>字母表 (點擊發音)</h3>
                <div class="alphabet-grid">
            `;

            data.alphabet.forEach(item => {
                const clickAction = data.engineCode ? `onclick="speakText('${item.char}', '${data.engineCode}')"` : '';
                contentHTML += `
                    <div class="alphabet-card" ${clickAction}>
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
