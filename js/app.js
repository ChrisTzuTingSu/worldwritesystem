document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#global-nav button');
    const sections = document.querySelectorAll('.module-section');
    
    let isSvgMapInitialized = false;
    let isLeafletMapInitialized = false;
    
    const synth = window.speechSynthesis;
    let svgMapInstance = null;
    
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            detailModal.classList.add('modal-hidden');
        });
    }
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            handleModuleActivation(targetId);
        });
    });

    function handleModuleActivation(targetId) {
        if (targetId === 'modern-map-section') {
            if (!isSvgMapInitialized) {
                // 延遲 100 毫秒，確保 display: block 已完成 DOM 渲染
                setTimeout(() => {
                    initModernMap();
                    isSvgMapInitialized = true;
                }, 100);
            } else {
                // 若已初始化，手動觸發視窗尺寸改變事件，迫使 svgMap 重新計算寬高
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 50);
            }
        } 
        else if (targetId === 'history-map-section') {
            if (!isLeafletMapInitialized) {
                setTimeout(() => {
                    initHistoryMap();
                    isLeafletMapInitialized = true;
                }, 100);
            } else {
                if (window.leafletMapInstance) {
                    setTimeout(() => window.leafletMapInstance.invalidateSize(), 100);
                }
            }
        }
        else if (targetId === 'system-section') {
            // 此處預留供靜態表格載入使用
        }
    }

    function initModernMap() {
        const mapContainer = document.getElementById('svg-map-container');
        mapContainer.innerHTML = '';

        svgMapInstance = new svgMap({
            targetElementID: 'svg-map-container',
            colorNoData: '#e9ecef', 
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

        mapContainer.addEventListener('click', (e) => {
            const countryPath = e.target.closest('.svgMap-country');
            if (countryPath) {
                const countryCode = countryPath.getAttribute('data-id');
                if (countryCode) {
                    openLangDetail(countryCode);
                }
            }
        });
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
            detailModal.classList.remove('modal-hidden');
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

    function initHistoryMap() {
        const mapContainer = document.getElementById('leaflet-map-container');
        const storyContainer = document.getElementById('story-container');
        const backBtn = document.getElementById('history-back-btn');

        window.leafletMapInstance = L.map('leaflet-map-container', {
            zoomControl: false,
            scrollWheelZoom: false,
            dragging: false
        }).setView([20, 45], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.leafletMapInstance);

        let currentLayers = [];
        let globalLayers = [];
        let renderTimeout; 
        let globalTimeout;

        function createNodeIcon(chars, label) {
            return L.divIcon({
                className: 'node-icon',
                iconSize: null, 
                html: `
                    <div class="node-content">
                        <div class="node-chars">${chars}</div>
                        <div class="node-label">${label}</div>
                    </div>
                `
            });
        }

        const evolutionaryStories = {
            "phoenician": {
                title: "腓尼基文字傳播史",
                originLat: 33.8,
                originLng: 35.5,
                htmlContent: `
                    <div class="step" data-index="0">
                        <h2>起源：腓尼基文字的傳播</h2>
                        <p>約公元前1050年，活躍於黎凡特地區的腓尼基人發展出世界上最早被廣泛使用的輔音音素文字（Abjad）。此系統僅表記子音，母音需仰賴語境判斷。</p>
                    </div>
                    <div class="step" data-index="1">
                        <h2>向西演化：希臘文與母音的誕生</h2>
                        <p>當腓尼基文字傳入古希臘時，遇到了語音結構的挑戰。希臘人借用了部分希臘語中不存在的腓尼基子音符號，將其重定義為母音符號。此一結構性轉變標誌著全音素文字（Alphabet）的誕生，並進一步向西衍伸出拉丁字母與西里爾字母。</p>
                    </div>
                    <div class="step" data-index="2">
                        <h2>向東演化：亞蘭文與輔音系統的延續</h2>
                        <p>在陸路方面，腓尼基文字向東傳播演化為亞蘭文（Aramaic）。亞蘭文隨後成為中東地區的官方通用語，其字體演化最終孕育出現代的希伯來文與阿拉伯文。</p>
                    </div>
                `,
                mapData: [
                    {
                        center: [33.8, 35.5], zoom: 5,
                        layers: [
                            { type: 'node', lat: 33.8, lng: 35.5, chars: '𐤀𐤁𐤂𐤃', label: 'Phoenician' }
                        ]
                    },
                    {
                        center: [40.0, 22.0], zoom: 5,
                        layers: [
                            { type: 'node', lat: 33.8, lng: 35.5, chars: '𐤀𐤁𐤂𐤃', label: 'Phoenician' },
                            { type: 'node', lat: 38.5, lng: 22.0, chars: 'ΑΒΓΔ', label: 'Ancient Greek' },
                            { type: 'arrow', start: [33.8, 35.5], end: [38.5, 22.0], color: '#2980b9' },
                            { type: 'node', lat: 42.5, lng: 12.0, chars: 'ABCD', label: 'Latin' },
                            { type: 'arrow', start: [38.5, 22.0], end: [42.5, 12.0], color: '#2c3e50' },
                            { type: 'node', lat: 49.0, lng: 31.0, chars: 'АБВГ', label: 'Cyrillic' },
                            { type: 'arrow', start: [38.5, 22.0], end: [49.0, 31.0], color: '#2c3e50' }
                        ]
                    },
                    {
                        center: [31.0, 38.0], zoom: 5,
                        layers: [
                            { type: 'node', lat: 33.8, lng: 35.5, chars: '𐤀𐤁𐤂𐤃', label: 'Phoenician' },
                            { type: 'node', lat: 34.5, lng: 40.0, chars: '𐡀𐡁𐡂𐡃', label: 'Aramaic' },
                            { type: 'arrow', start: [33.8, 35.5], end: [34.5, 40.0], color: '#d35400' },
                            { type: 'node', lat: 31.5, lng: 35.0, chars: 'אבגד', label: 'Hebrew' },
                            { type: 'arrow', start: [34.5, 40.0], end: [31.5, 35.0], color: '#c0392b' },
                            { type: 'node', lat: 25.0, lng: 43.0, chars: 'ابجد', label: 'Arabic' },
                            { type: 'arrow', start: [34.5, 40.0], end: [25.0, 43.0], color: '#c0392b' }
                        ]
                    }
                ]
            },
            "sino-tibetan": {
                title: "漢藏語系 (Sino-Tibetan) 發展",
                originLat: 34.0,
                originLng: 108.0,
                htmlContent: `
                    <div class="step" data-index="0">
                        <h2>起源：漢字的成形</h2>
                        <p>漢字作為世界上最古老且持續使用的語素文字之一，起源於黃河流域。早期的甲骨文與金文奠定了方塊字的基礎。</p>
                    </div>
                    <div class="step" data-index="1">
                        <h2>東亞文化圈的擴散</h2>
                        <p>漢字隨著文化與宗教交流，廣泛傳入朝鮮半島、日本與越南。各國在借用漢字的同時，也發展出如假名等符合自身語言音節特徵的表音系統。</p>
                    </div>
                `,
                mapData: [
                    {
                        center: [34.0, 108.0], zoom: 5,
                        layers: [
                            { type: 'node', lat: 34.0, lng: 108.0, chars: '天地玄黃', label: 'Chinese (漢字)' }
                        ]
                    },
                    {
                        center: [28.0, 122.0], zoom: 4, 
                        layers: [
                            { type: 'node', lat: 34.0, lng: 108.0, chars: '天地玄黃', label: 'Chinese (漢字)' },
                            { type: 'node', lat: 37.5, lng: 127.0, chars: '가나다라', label: 'Korean (諺文)' },
                            { type: 'arrow', start: [34.0, 108.0], end: [37.5, 127.0], color: '#8e44ad' },
                            { type: 'node', lat: 35.0, lng: 139.0, chars: 'あいうえ', label: 'Japanese (假名)' },
                            { type: 'arrow', start: [34.0, 108.0], end: [35.0, 139.0], color: '#8e44ad' },
                            { type: 'node', lat: 21.0, lng: 105.0, chars: '喃字', label: 'Vietnamese (字喃)' },
                            { type: 'arrow', start: [34.0, 108.0], end: [21.0, 105.0], color: '#8e44ad' }
                        ]
                    }
                ]
            }
        };

        let currentStoryData = null;

        function clearMapLayers() {
            currentLayers.forEach(layer => window.leafletMapInstance.removeLayer(layer));
            currentLayers = [];
        }

        function clearGlobalLayers() {
            globalLayers.forEach(layer => window.leafletMapInstance.removeLayer(layer));
            globalLayers = [];
        }

        function renderMapData(index) {
            if (!currentStoryData) return;
            const data = currentStoryData.mapData[index];
            if (!data) return;

            clearTimeout(renderTimeout);
            clearMapLayers();
            
            window.leafletMapInstance.flyTo(data.center, data.zoom, { duration: 1.2 });

            renderTimeout = setTimeout(() => {
                data.layers.forEach(item => {
                    if (item.type === 'node') {
                        const marker = L.marker([item.lat, item.lng], { icon: createNodeIcon(item.chars, item.label) }).addTo(window.leafletMapInstance);
                        currentLayers.push(marker);
                    } else if (item.type === 'arrow') {
                        const line = L.polyline([item.start, item.end], {
                            color: item.color,
                            weight: 3,
                            className: 'flow-line'
                        }).addTo(window.leafletMapInstance);
                        currentLayers.push(line);
                    }
                });
            }, 1200);
        }

        function initGlobalView() {
            clearTimeout(renderTimeout);
            clearTimeout(globalTimeout);
            clearMapLayers();
            clearGlobalLayers();
            
            storyContainer.classList.remove('active');
            storyContainer.innerHTML = ''; 
            mapContainer.classList.remove('story-mode');
            backBtn.style.display = 'none';
            currentStoryData = null;
            
            setTimeout(() => window.leafletMapInstance.invalidateSize(), 500);
            
            window.leafletMapInstance.flyTo([20, 45], 3, { duration: 1.2 });

            globalTimeout = setTimeout(() => {
                Object.keys(evolutionaryStories).forEach(key => {
                    const story = evolutionaryStories[key];
                    const icon = L.divIcon({
                        className: 'global-origin',
                        html: `<div class="origin-marker" style="width: 20px; height: 20px;"></div><div class="origin-label">${story.title}</div>`,
                        iconSize: [20, 20]
                    });
                    
                    const marker = L.marker([story.originLat, story.originLng], { icon: icon }).addTo(window.leafletMapInstance);
                    marker.on('click', () => startStoryMode(key));
                    globalLayers.push(marker);
                });
            }, 1200);
        }

        function startStoryMode(storyId) {
            currentStoryData = evolutionaryStories[storyId];
            if(!currentStoryData) return;

            clearTimeout(globalTimeout);
            clearGlobalLayers();
            
            storyContainer.innerHTML = currentStoryData.htmlContent;

            mapContainer.classList.add('story-mode');
            storyContainer.classList.add('active');
            backBtn.style.display = 'block';
            
            const steps = storyContainer.querySelectorAll('.step');
            steps.forEach(step => observer.observe(step));

            setTimeout(() => {
                window.leafletMapInstance.invalidateSize();
                storyContainer.scrollTo({ top: 0, behavior: 'smooth' });
                renderMapData(0); 
            }, 500);
        }

        backBtn.addEventListener('click', () => {
            initGlobalView();
        });

        const observerOptions = {
            root: storyContainer,
            rootMargin: '-40% 0px -40% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && storyContainer.classList.contains('active')) {
                    const steps = storyContainer.querySelectorAll('.step');
                    steps.forEach(s => s.classList.remove('active'));
                    entry.target.classList.add('active');

                    const index = entry.target.getAttribute('data-index');
                    renderMapData(parseInt(index));
                }
            });
        }, observerOptions);

        initGlobalView();
    }
});
