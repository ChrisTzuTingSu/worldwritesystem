document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#nav-links button[data-target]');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    const sections = document.querySelectorAll('.module-section');
    const sysButtons = document.querySelectorAll('.sys-btn');
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');
    const tableContainer = document.getElementById('table-container');
    const descContainer = document.getElementById('description-container');
    const synth = window.speechSynthesis;

    const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);

    let svgMapInstance = null;
    let isLeafletMapInitialized = false;
    let isSystemLoaded = false;
    let isLearningLoaded = false;

    navToggle?.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    function hideModal() {
        detailModal?.classList.add('modal-hidden');
    }

    closeModal?.addEventListener('click', hideModal);
    detailModal?.addEventListener('click', event => {
        if (event.target === detailModal) hideModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') hideModal();
    });

    navButtons.forEach(button => {
        button.addEventListener('click', event => {
            const targetId = event.currentTarget.dataset.target;
            navButtons.forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
            navLinks?.classList.remove('open');
            navToggle?.setAttribute('aria-expanded', 'false');
            window.scrollTo({ top: 0, behavior: 'auto' });
            setTimeout(() => handleModuleActivation(targetId), 50);
        });
    });

    document.querySelectorAll('[data-go-to]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector(`#global-nav button[data-target="${button.dataset.goTo}"]`)?.click();
        });
    });

    sysButtons.forEach(button => {
        button.addEventListener('click', event => {
            sysButtons.forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            window.loadSystemData?.(event.currentTarget.dataset.system);
        });
    });

    function handleModuleActivation(targetId) {
        if (targetId === 'modern-map-section') {
            initModernMap();
        } else if (targetId === 'history-map-section') {
            if (!isLeafletMapInitialized) {
                initHistoryMap();
                isLeafletMapInitialized = true;
            } else {
                window.leafletMapInstance?.invalidateSize();
            }
        } else if (targetId === 'system-section' && !isSystemLoaded) {
            window.loadSystemData?.('alphabet');
            isSystemLoaded = true;
        } else if (targetId === 'learning-section' && !isLearningLoaded) {
            initLearningLab();
            isLearningLoaded = true;
        }
    }

    function initModernMap() {
        if (svgMapInstance) return;

        svgMapInstance = new svgMap({
            targetElementID: 'svg-map-container',
            colorNoData: '#e9ecef',
            data: {
                data: { status: { name: '資料庫狀態', format: '{0}' } },
                applyData: 'status',
                values: {
                    TH: { status: '已建置專屬介紹', color: '#6ECCB0' },
                    TW: { status: '已建置專屬介紹', color: '#6ECCB0' },
                    FR: { status: '已建置專屬介紹', color: '#6ECCB0' }
                }
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.svgMap-country').forEach(element => {
                element.style.cursor = 'pointer';
                element.addEventListener('click', () => window.openLangDetail(element.dataset.id));
            });
        }, 500);
    }

    window.openLangDetail = async function(targetCode) {
        try {
            const response = await fetch(`data/details/${targetCode}.json`);
            if (!response.ok) throw new Error('Detail fetch failed');
            const data = await response.json();
            const displayTitle = data.title || data.language;
            let contentHTML = `<h2>${escapeHTML(displayTitle)}</h2>`;

            if (data.intro) contentHTML += `<p><strong>概論：</strong>${escapeHTML(data.intro)}</p>`;
            if (data.region) contentHTML += `<p><strong>主要使用地區：</strong>${escapeHTML(data.region)}</p>`;
            if (data.population) contentHTML += `<p><strong>使用人數：</strong>${escapeHTML(data.population)}</p>`;

            if (Array.isArray(data.languages)) {
                contentHTML += '<div class="modal-language-nav"><strong>語言導覽：</strong><br>';
                data.languages.forEach((lang, index) => {
                    contentHTML += `<a href="#lang-sec-${index}" class="modal-jump-link">${escapeHTML(lang.name)}</a>`;
                });
                contentHTML += '</div>';

                data.languages.forEach((lang, index) => {
                    contentHTML += `<h3 id="lang-sec-${index}" class="modal-section-title">${escapeHTML(lang.name)}</h3>`;
                    contentHTML += `<p>${escapeHTML(lang.desc)}</p><div class="alphabet-grid">`;
                    (lang.alphabet || []).forEach(item => {
                        const speakAttrs = lang.engineCode
                            ? `data-speak="${escapeHTML(item.char)}" data-lang="${escapeHTML(lang.engineCode)}"`
                            : '';
                        contentHTML += `<div class="alphabet-card" ${speakAttrs}><span class="alphabet-char">${escapeHTML(item.char)}</span><div class="alphabet-name">${escapeHTML(item.name)}</div></div>`;
                    });
                    contentHTML += '</div>';
                });
            } else if (data.alphabet) {
                contentHTML += '<h3>字母表（點擊發音）</h3><div class="alphabet-grid">';
                data.alphabet.forEach(item => {
                    const speakAttrs = data.engineCode
                        ? `data-speak="${escapeHTML(item.char)}" data-lang="${escapeHTML(data.engineCode)}"`
                        : '';
                    contentHTML += `<div class="alphabet-card" ${speakAttrs}><span class="alphabet-char">${escapeHTML(item.char)}</span><div class="alphabet-name">${escapeHTML(item.name)}</div></div>`;
                });
                contentHTML += '</div>';
            }

            modalBody.innerHTML = contentHTML;
            modalBody.querySelectorAll('[data-speak]').forEach(card => {
                card.addEventListener('click', () => window.speakText(card.dataset.speak, card.dataset.lang));
            });
            detailModal.classList.remove('modal-hidden');
        } catch (error) {
            console.error('Detail error:', error);
            alert('尚無此國家或語言的詳細資料。');
        }
    };

    window.speakText = function(text, lang) {
        if (!synth || !lang) return;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(String(text));
        utterance.lang = lang;
        utterance.rate = 0.8;
        synth.speak(utterance);
    };

    window.loadSystemData = async function(systemName) {
        if (!tableContainer || !descContainer) return;
        const fetchUrl = `data/${systemName}.json`;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            renderSystemContent(await response.json());
        } catch (error) {
            console.error('System data error:', error);
            tableContainer.innerHTML = `<div class="error-panel"><h3>資料載入失敗</h3><p>找不到 ${escapeHTML(fetchUrl)}，請檢查檔案是否完整上傳。</p></div>`;
        }
    };

    function renderSystemContent(data) {
        descContainer.innerHTML = `<h2>${escapeHTML(data.title)}</h2><p>${escapeHTML(data.description)}</p>`;
        let tableHTML = '<table class="evolution-table"><thead><tr>';
        data.headers.forEach(header => {
            if (header.langCode && header.hasDetail) {
                const detailCode = header.countryCode || header.langCode;
                tableHTML += `<th class="lang-header" data-detail="${escapeHTML(detailCode)}">${escapeHTML(header.name)}</th>`;
            } else {
                tableHTML += `<th>${escapeHTML(header.name)}</th>`;
            }
        });
        tableHTML += '</tr></thead><tbody>';

        data.rows.forEach(row => {
            tableHTML += `<tr><td>${escapeHTML(row.phonetic)}</td>`;
            row.characters.forEach((charData, index) => {
                if (!charData.char) {
                    tableHTML += '<td class="char-empty"></td>';
                    return;
                }
                const langCode = data.headers[index + 1]?.langCode;
                const speakAttrs = langCode
                    ? ` data-speak="${escapeHTML(charData.char)}" data-lang="${escapeHTML(langCode)}"`
                    : '';
                tableHTML += `<td class="char-cell"${speakAttrs}>${escapeHTML(charData.char)}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableContainer.innerHTML = `${tableHTML}</tbody></table>`;
        tableContainer.querySelectorAll('[data-detail]').forEach(header => {
            header.addEventListener('click', () => window.openLangDetail(header.dataset.detail));
        });
        tableContainer.querySelectorAll('[data-speak]').forEach(cell => {
            cell.addEventListener('click', () => window.speakText(cell.dataset.speak, cell.dataset.lang));
        });
    }

    async function initLearningLab() {
        const practiceLanguageTabs = document.getElementById('practice-language-tabs');
        const practiceCharacterTabs = document.getElementById('practice-character-tabs');
        const practiceLanguageGuide = document.getElementById('practice-language-guide');
        const practiceStrokes = document.getElementById('practice-strokes');
        const practiceGuide = document.getElementById('practice-guide');
        const practiceGlyph = document.getElementById('practice-glyph');
        const practiceCanvas = document.getElementById('practice-canvas');
        const practiceBoard = document.getElementById('practice-board');
        const practiceStatus = document.getElementById('practice-status');
        const practiceSpeak = document.getElementById('practice-speak');
        const animateButton = document.getElementById('practice-animate');
        const toggleGuideButton = document.getElementById('practice-toggle-guide');
        const clearButton = document.getElementById('practice-clear');
        const svgNamespace = 'http://www.w3.org/2000/svg';
        const glyphMeasureContext = document.createElement('canvas').getContext('2d');
        let practiceData;
        let featureData;
        let currentLanguage;
        let currentItem;
        let guideVisible = true;

        try {
            const [practiceResponse, featureResponse] = await Promise.all([
                fetch('data/practice.json'),
                fetch('data/language-features.json')
            ]);
            if (!practiceResponse.ok || !featureResponse.ok) throw new Error('Learning data fetch failed');
            [practiceData, featureData] = await Promise.all([
                practiceResponse.json(),
                featureResponse.json()
            ]);
        } catch (error) {
            console.error('Learning data error:', error);
            document.getElementById('practice-view').innerHTML = '<div class="error-panel"><h3>互動資料載入失敗</h3><p>請確認兩個學習資料檔案已完整上傳。</p></div>';
            return;
        }

        document.querySelectorAll('[data-learning-view]').forEach(tab => {
            tab.addEventListener('click', () => {
                const viewName = tab.dataset.learningView;
                document.querySelectorAll('[data-learning-view]').forEach(item => {
                    const isActive = item === tab;
                    item.classList.toggle('active', isActive);
                    item.setAttribute('aria-selected', String(isActive));
                });
                document.querySelectorAll('.learning-view').forEach(view => {
                    const isActive = view.id === `${viewName}-view`;
                    view.classList.toggle('active', isActive);
                    view.hidden = !isActive;
                });
            });
        });

        function clearCanvas(message = '已清除筆跡，可以重新描摹。') {
            const context = practiceCanvas.getContext('2d');
            context.clearRect(0, 0, practiceCanvas.width, practiceCanvas.height);
            practiceStatus.textContent = message;
        }

        function sizeCanvas() {
            const rect = practiceBoard.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            practiceCanvas.width = Math.round(rect.width * dpr);
            practiceCanvas.height = Math.round(rect.height * dpr);
            practiceCanvas.style.width = `${rect.width}px`;
            practiceCanvas.style.height = `${rect.height}px`;
            const context = practiceCanvas.getContext('2d');
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.lineWidth = Math.max(7, rect.width / 42);
            context.strokeStyle = '#1676a8';
        }

        function addStroke(stroke, index) {
            const path = document.createElementNS(svgNamespace, 'path');
            path.setAttribute('class', 'practice-stroke');
            path.setAttribute('d', stroke.d);
            path.dataset.strokeIndex = String(index);
            practiceStrokes.appendChild(path);

            const circle = document.createElementNS(svgNamespace, 'circle');
            circle.setAttribute('class', 'practice-start');
            circle.setAttribute('cx', stroke.start[0]);
            circle.setAttribute('cy', stroke.start[1]);
            circle.setAttribute('r', '13');
            circle.dataset.startX = stroke.start[0];
            circle.dataset.startY = stroke.start[1];
            practiceStrokes.appendChild(circle);

            const number = document.createElementNS(svgNamespace, 'text');
            number.setAttribute('class', 'practice-start-number');
            number.setAttribute('x', stroke.start[0]);
            number.setAttribute('y', stroke.start[1] + 5);
            number.dataset.startX = stroke.start[0];
            number.dataset.startY = stroke.start[1];
            number.textContent = String(index + 1);
            practiceStrokes.appendChild(number);
        }

        function alignStrokeGuidesToGlyph() {
            const paths = [...practiceStrokes.querySelectorAll('.practice-stroke')];
            if (!paths.length) return;
            const glyphStyle = getComputedStyle(practiceGlyph);
            glyphMeasureContext.font = `${glyphStyle.fontWeight} ${glyphStyle.fontSize} ${glyphStyle.fontFamily}`;
            glyphMeasureContext.textAlign = 'center';
            const glyphMetrics = glyphMeasureContext.measureText(practiceGlyph.textContent);
            const glyphBox = {
                x: 160 - glyphMetrics.actualBoundingBoxLeft,
                y: 244 - glyphMetrics.actualBoundingBoxAscent,
                width: glyphMetrics.actualBoundingBoxLeft + glyphMetrics.actualBoundingBoxRight,
                height: glyphMetrics.actualBoundingBoxAscent + glyphMetrics.actualBoundingBoxDescent
            };
            const boxes = paths.map(path => path.getBBox());
            const pathBox = boxes.reduce((box, item) => ({
                x: Math.min(box.x, item.x),
                y: Math.min(box.y, item.y),
                right: Math.max(box.right, item.x + item.width),
                bottom: Math.max(box.bottom, item.y + item.height)
            }), {
                x: boxes[0].x,
                y: boxes[0].y,
                right: boxes[0].x + boxes[0].width,
                bottom: boxes[0].y + boxes[0].height
            });
            pathBox.width = Math.max(1, pathBox.right - pathBox.x);
            pathBox.height = Math.max(1, pathBox.bottom - pathBox.y);
            const scaleX = glyphBox.width * .84 / pathBox.width;
            const scaleY = glyphBox.height * .84 / pathBox.height;
            const offsetX = glyphBox.x + (glyphBox.width - pathBox.width * scaleX) / 2 - pathBox.x * scaleX;
            const offsetY = glyphBox.y + (glyphBox.height - pathBox.height * scaleY) / 2 - pathBox.y * scaleY;
            const transform = `matrix(${scaleX} 0 0 ${scaleY} ${offsetX} ${offsetY})`;
            paths.forEach(path => path.setAttribute('transform', transform));
            practiceStrokes.querySelectorAll('[data-start-x]').forEach(marker => {
                const x = Number(marker.dataset.startX) * scaleX + offsetX;
                const y = Number(marker.dataset.startY) * scaleY + offsetY;
                if (marker.tagName === 'circle') {
                    marker.setAttribute('cx', x);
                    marker.setAttribute('cy', y);
                } else {
                    marker.setAttribute('x', x);
                    marker.setAttribute('y', y + 5);
                }
            });
        }

        function updatePracticeItem(item) {
            currentItem = item;
            document.getElementById('practice-name').textContent = item.name;
            document.getElementById('practice-character').textContent = item.char;
            practiceGlyph.textContent = item.char;
            practiceGuide.dataset.language = currentLanguage.id;
            document.getElementById('practice-sound').textContent = item.sound;
            document.getElementById('practice-example').textContent = item.example;
            document.getElementById('practice-note').textContent = item.note;
            practiceStrokes.replaceChildren();
            item.strokes.forEach(addStroke);
            requestAnimationFrame(alignStrokeGuidesToGlyph);
            practiceCharacterTabs.querySelectorAll('button').forEach(button => {
                const isActive = button.dataset.char === item.char;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
            clearCanvas('可用手指、觸控筆或滑鼠沿灰色線條描摹。');
        }

        function renderCharacterTabs(language) {
            practiceCharacterTabs.replaceChildren();
            language.items.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'practice-character-button';
                button.dataset.char = item.char;
                button.textContent = item.char;
                button.setAttribute('aria-label', `練習 ${item.name}`);
                button.addEventListener('click', () => updatePracticeItem(item));
                practiceCharacterTabs.appendChild(button);
            });
            updatePracticeItem(language.items[0]);
        }

        function selectPracticeLanguage(language) {
            currentLanguage = language;
            practiceLanguageGuide.textContent = language.guide;
            practiceLanguageTabs.querySelectorAll('button').forEach(button => {
                const isActive = button.dataset.language === language.id;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
            const sources = document.getElementById('practice-sources');
            sources.innerHTML = language.sources.map(source =>
                `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)}</a></li>`
            ).join('');
            renderCharacterTabs(language);
        }

        practiceData.languages.forEach(language => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'practice-language-button';
            button.dataset.language = language.id;
            button.innerHTML = `<strong>${escapeHTML(language.name)}</strong><span>${escapeHTML(language.nativeName)}</span>`;
            button.addEventListener('click', () => selectPracticeLanguage(language));
            practiceLanguageTabs.appendChild(button);
        });
        document.getElementById('practice-notice').textContent = practiceData.notice;

        animateButton.addEventListener('click', () => {
            const paths = [...practiceStrokes.querySelectorAll('.practice-stroke')];
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            let delay = 0;
            paths.forEach(path => {
                path.getAnimations().forEach(animation => animation.cancel());
                const length = path.getTotalLength();
                const duration = reduceMotion ? 1 : Math.max(750, length * 3.5);
                path.animate([
                    { strokeDasharray: length, strokeDashoffset: length, opacity: 1 },
                    { strokeDasharray: length, strokeDashoffset: 0, opacity: 1 }
                ], { duration, delay, easing: 'ease-in-out', fill: 'both' });
                delay += duration + (reduceMotion ? 0 : 180);
            });
            practiceStatus.textContent = `正在依序播放 ${paths.length} 個筆勢。`;
        });

        toggleGuideButton.addEventListener('click', () => {
            guideVisible = !guideVisible;
            practiceGuide.classList.toggle('guide-hidden', !guideVisible);
            toggleGuideButton.textContent = guideVisible ? '隱藏導引' : '顯示導引';
        });
        clearButton.addEventListener('click', () => clearCanvas());
        practiceSpeak.addEventListener('click', () => {
            if (currentItem && currentLanguage) window.speakText(currentItem.speak, currentLanguage.langCode);
        });

        let isDrawing = false;
        const drawContext = practiceCanvas.getContext('2d');
        function pointFromEvent(event) {
            const rect = practiceCanvas.getBoundingClientRect();
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
        practiceCanvas.addEventListener('pointerdown', event => {
            isDrawing = true;
            practiceCanvas.setPointerCapture(event.pointerId);
            const point = pointFromEvent(event);
            drawContext.beginPath();
            drawContext.moveTo(point.x, point.y);
            practiceStatus.textContent = '描摹中⋯⋯';
        });
        practiceCanvas.addEventListener('pointermove', event => {
            if (!isDrawing) return;
            const point = pointFromEvent(event);
            drawContext.lineTo(point.x, point.y);
            drawContext.stroke();
        });
        function finishDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            drawContext.closePath();
            practiceStatus.textContent = '完成一次描摹；目前版本不進行正確度評分。';
        }
        practiceCanvas.addEventListener('pointerup', finishDrawing);
        practiceCanvas.addEventListener('pointercancel', finishDrawing);
        practiceCanvas.addEventListener('lostpointercapture', finishDrawing);
        new ResizeObserver(sizeCanvas).observe(practiceBoard);

        function renderFeatureCards(filter = 'all') {
            const featureGrid = document.getElementById('feature-grid');
            const languages = filter === 'all'
                ? featureData.languages
                : featureData.languages.filter(language => language.id === filter);
            featureGrid.innerHTML = languages.map(language => `
                <article class="feature-card">
                    <header><div><p>${escapeHTML(language.nativeName)}</p><h2>${escapeHTML(language.name)}</h2></div><span>${escapeHTML(language.wordOrder)}</span></header>
                    <dl>
                        <div><dt>語系</dt><dd>${escapeHTML(language.family)}</dd></div>
                        <div><dt>文字</dt><dd>${escapeHTML(language.script)}</dd></div>
                        <div><dt>文法性別</dt><dd>${escapeHTML(language.gender)}</dd></div>
                        <div><dt>詞法輪廓</dt><dd>${escapeHTML(language.morphology)}</dd></div>
                    </dl>
                    <div class="feature-tags">${language.highlights.map(item => `<span>${escapeHTML(item)}</span>`).join('')}</div>
                    <p class="feature-example">${escapeHTML(language.example)}</p>
                    <a href="${escapeHTML(language.source)}" target="_blank" rel="noopener noreferrer">查看 WALS 語言頁 →</a>
                </article>`).join('');
        }

        const featureFilter = document.getElementById('feature-filter');
        [{ id: 'all', name: '全部比較' }, ...featureData.languages].forEach((language, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.featureFilter = language.id;
            button.textContent = language.name;
            button.classList.toggle('active', index === 0);
            button.addEventListener('click', () => {
                featureFilter.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
                renderFeatureCards(language.id);
            });
            featureFilter.appendChild(button);
        });
        document.getElementById('feature-method-note').textContent = featureData.methodNote;
        document.getElementById('feature-sources-list').innerHTML = featureData.sharedSources.map(source =>
            `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)}</a></li>`
        ).join('');

        selectPracticeLanguage(practiceData.languages[0]);
        renderFeatureCards();
        requestAnimationFrame(sizeCanvas);
    }

    async function initHistoryMap() {
        const mapContainer = document.getElementById('leaflet-map-container');
        const storyContainer = document.getElementById('story-container');
        const backBtn = document.getElementById('history-back-btn');

        window.leafletMapInstance = L.map('leaflet-map-container', {
            zoomControl: true,
            scrollWheelZoom: false,
            minZoom: 2
        }).setView([25, 35], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(window.leafletMapInstance);

        let historyData;
        try {
            const response = await fetch('data/history-stories.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            historyData = await response.json();
        } catch (error) {
            console.error('History data error:', error);
            storyContainer.classList.add('active');
            storyContainer.innerHTML = '<div class="history-error"><h2>歷史資料載入失敗</h2><p>請確認 data/history-stories.json 已上傳。</p></div>';
            return;
        }

        const storiesById = Object.fromEntries(historyData.stories.map(story => [story.id, story]));
        let currentLayers = [];
        let overviewLayers = [];
        let renderTimeout;
        let currentStory = null;

        function createNodeIcon(chars, label) {
            return L.divIcon({
                className: 'node-icon',
                iconSize: null,
                html: `<div class="node-content"><div class="node-chars">${escapeHTML(chars)}</div><div class="node-label">${escapeHTML(label)}</div></div>`
            });
        }

        function clearLayers(layerList) {
            layerList.forEach(layer => window.leafletMapInstance.removeLayer(layer));
            layerList.length = 0;
        }

        function arrowStyle(item, story) {
            const styles = {
                descent: { dashArray: null, opacity: 0.85 },
                adaptation: { dashArray: '10 8', opacity: 0.9 },
                context: { dashArray: '2 10', opacity: 0.65 }
            };
            return { color: story.color, weight: 3, ...(styles[item.relation] || styles.descent) };
        }

        function renderMapStep(index) {
            if (!currentStory) return;
            const step = currentStory.steps[index];
            if (!step) return;
            clearTimeout(renderTimeout);
            clearLayers(currentLayers);
            window.leafletMapInstance.flyTo(step.map.center, step.map.zoom, { duration: 0.8 });

            renderTimeout = setTimeout(() => {
                step.layers.forEach(item => {
                    if (item.type === 'node') {
                        currentLayers.push(L.marker([item.lat, item.lng], {
                            icon: createNodeIcon(item.chars, item.label)
                        }).addTo(window.leafletMapInstance));
                    } else if (item.type === 'arrow') {
                        currentLayers.push(L.polyline([item.start, item.end], {
                            ...arrowStyle(item, currentStory),
                            className: `flow-line relation-${item.relation || 'descent'}`
                        }).addTo(window.leafletMapInstance));
                    }
                });
            }, 850);
        }

        function renderStoryIndex() {
            currentStory = null;
            clearTimeout(renderTimeout);
            clearLayers(currentLayers);
            clearLayers(overviewLayers);
            backBtn.style.display = 'none';
            storyContainer.classList.add('active', 'history-index');
            storyContainer.scrollTop = 0;
            storyContainer.innerHTML = `
                <div class="history-index-inner">
                    <p class="eyebrow">SCRIPT HISTORY</p>
                    <h1>選擇一條文字歷史路線</h1>
                    <p class="history-method">${escapeHTML(historyData.methodNote)}</p>
                    <div class="history-route-list">
                        ${historyData.stories.map(story => `
                            <button class="history-route-card" data-story="${escapeHTML(story.id)}" style="--route-color:${escapeHTML(story.color)}">
                                <span class="history-route-category">${escapeHTML(story.category)}</span>
                                <strong>${escapeHTML(story.title)}</strong>
                                <small>${escapeHTML(story.summary)}</small>
                            </button>
                        `).join('')}
                    </div>
                    <div class="history-legend">
                        <span><i class="legend-line solid"></i>${escapeHTML(historyData.relationTypes.descent)}</span>
                        <span><i class="legend-line dashed"></i>${escapeHTML(historyData.relationTypes.adaptation)}</span>
                        <span><i class="legend-line dotted"></i>${escapeHTML(historyData.relationTypes.context)}</span>
                    </div>
                </div>`;

            storyContainer.querySelectorAll('[data-story]').forEach(button => {
                button.addEventListener('click', () => startStory(button.dataset.story));
            });

            window.leafletMapInstance.flyTo([25, 35], 2, { duration: 0.8 });
            historyData.stories.forEach(story => {
                const icon = L.divIcon({
                    className: 'global-origin',
                    iconSize: [18, 18],
                    html: `<div class="origin-marker" style="--route-color:${escapeHTML(story.color)}" aria-hidden="true"></div>`
                });
                const marker = L.marker([story.origin.lat, story.origin.lng], { icon }).addTo(window.leafletMapInstance);
                marker.bindTooltip(story.title, { direction: 'top', offset: [0, -8] });
                marker.on('click', () => startStory(story.id));
                overviewLayers.push(marker);
            });
            setTimeout(() => window.leafletMapInstance.invalidateSize(), 50);
        }

        function renderStoryHTML(story) {
            const sourcesHTML = story.sources.map(source =>
                `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)}</a></li>`
            ).join('');

            return story.steps.map((step, index) => `
                <article class="step" data-index="${index}">
                    <p class="step-period">${escapeHTML(step.period)}</p>
                    <h2>${escapeHTML(step.title)}</h2>
                    <p>${escapeHTML(step.body)}</p>
                    <span class="relation-badge">${escapeHTML(step.relation)}</span>
                    ${index === story.steps.length - 1 ? `<details class="story-sources"><summary>資料來源與延伸閱讀</summary><ul>${sourcesHTML}</ul></details>` : ''}
                </article>
            `).join('');
        }

        function startStory(storyId) {
            currentStory = storiesById[storyId];
            if (!currentStory) return;
            clearLayers(overviewLayers);
            storyContainer.classList.remove('history-index');
            storyContainer.innerHTML = renderStoryHTML(currentStory);
            storyContainer.scrollTop = 0;
            backBtn.style.display = 'block';
            storyContainer.querySelectorAll('.step').forEach(step => observer.observe(step));
            setTimeout(() => {
                window.leafletMapInstance.invalidateSize();
                renderMapStep(0);
                storyContainer.querySelector('.step')?.classList.add('active');
            }, 80);
        }

        backBtn.addEventListener('click', renderStoryIndex);

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting || !currentStory) return;
                storyContainer.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
                entry.target.classList.add('active');
                renderMapStep(Number(entry.target.dataset.index));
            });
        }, { root: storyContainer, rootMargin: '-40% 0px -40% 0px', threshold: 0 });

        renderStoryIndex();
    }
});
