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
        const practiceGroupTabs = document.getElementById('practice-group-tabs');
        const practiceCharacterTabs = document.getElementById('practice-character-tabs');
        const practiceLanguageGuide = document.getElementById('practice-language-guide');
        const practiceStrokes = document.getElementById('practice-strokes');
        const practiceGuide = document.getElementById('practice-guide');
        const practiceGlyph = document.getElementById('practice-glyph');
        const practiceCanvas = document.getElementById('practice-canvas');
        const practiceBoard = document.getElementById('practice-board');
        const practiceStatus = document.getElementById('practice-status');
        const practicePosition = document.getElementById('practice-position');
        const practiceSpeak = document.getElementById('practice-speak');
        const animateButton = document.getElementById('practice-animate');
        const toggleGuideButton = document.getElementById('practice-toggle-guide');
        const clearButton = document.getElementById('practice-clear');
        const previousButton = document.getElementById('practice-previous');
        const nextButton = document.getElementById('practice-next');
        const masteredButton = document.getElementById('practice-mastered');
        const progressText = document.getElementById('learning-progress-text');
        const progressBar = document.getElementById('learning-progress-bar');
        const progressTrack = document.querySelector('.progress-track');
        const progressReset = document.getElementById('learning-progress-reset');
        const wordLanguageTabs = document.getElementById('word-language-tabs');
        const wordGrid = document.getElementById('word-grid');
        const quizLanguageTabs = document.getElementById('quiz-language-tabs');
        const quizStart = document.getElementById('quiz-start');
        const quizStartPanel = document.getElementById('quiz-start-panel');
        const quizQuestionPanel = document.getElementById('quiz-question-panel');
        const quizSummary = document.getElementById('quiz-summary');
        const quizCounter = document.getElementById('quiz-counter');
        const quizQuestion = document.getElementById('quiz-question');
        const quizListen = document.getElementById('quiz-listen');
        const quizOptions = document.getElementById('quiz-options');
        const quizFeedback = document.getElementById('quiz-feedback');
        const quizNext = document.getElementById('quiz-next');
        const svgNamespace = 'http://www.w3.org/2000/svg';
        const glyphMeasureContext = document.createElement('canvas').getContext('2d');
        let practiceData;
        let featureData;
        let currentLanguage;
        let currentItem;
        let currentItems = [];
        let currentGroup = 'all';
        let currentWordLanguage;
        let currentQuizLanguage;
        let quizItems = [];
        let quizIndex = 0;
        let quizCorrect = 0;
        let quizAnswered = false;
        let guideVisible = true;
        let motionHideTimer;
        const progressKey = 'worldwritesystem-learning-v2';
        let learningProgress = loadProgress();

        function loadProgress() {
            try {
                const saved = JSON.parse(localStorage.getItem(progressKey));
                return saved && typeof saved === 'object'
                    ? { letters: saved.letters || {}, words: saved.words || {}, quiz: saved.quiz || { correct: 0, total: 0 } }
                    : { letters: {}, words: {}, quiz: { correct: 0, total: 0 } };
            } catch (error) {
                return { letters: {}, words: {}, quiz: { correct: 0, total: 0 } };
            }
        }

        function saveProgress() {
            try {
                localStorage.setItem(progressKey, JSON.stringify(learningProgress));
            } catch (error) {
                console.warn('Learning progress could not be saved', error);
            }
            updateProgressSummary();
        }

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
            const itemFields = practiceData.itemFormat || ['char', 'group', 'name', 'sound', 'example', 'speak'];
            const wordFields = practiceData.wordFormat || ['native', 'translation', 'category'];
            practiceData.languages.forEach(language => {
                language.items = language.items.map((entry, index) => {
                    const item = Array.isArray(entry)
                        ? Object.fromEntries(itemFields.map((field, fieldIndex) => [field, entry[fieldIndex]]))
                        : { ...entry };
                    const guide = language.guides?.[item.char] || {};
                    return {
                        ...item,
                        id: `${language.id}-${item.group || 'all'}-${index}`,
                        note: guide.note || item.note || '此字目前只提供實際字形描摹與例詞發音，尚未加入經審核的筆勢示意。',
                        strokes: guide.strokes || item.strokes || []
                    };
                });
                language.starterWords = (language.starterWords || []).map((entry, index) => {
                    const word = Array.isArray(entry)
                        ? Object.fromEntries(wordFields.map((field, fieldIndex) => [field, entry[fieldIndex]]))
                        : { ...entry };
                    return { ...word, id: `${language.id}-word-${index}` };
                });
            });
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
                if (viewName === 'practice') requestAnimationFrame(sizeCanvas);
            });
        });

        function progressList(kind, languageId) {
            if (!learningProgress[kind][languageId]) learningProgress[kind][languageId] = [];
            return learningProgress[kind][languageId];
        }

        function hasProgress(kind, languageId, itemId) {
            return progressList(kind, languageId).includes(itemId);
        }

        function toggleProgress(kind, languageId, itemId) {
            const items = progressList(kind, languageId);
            const index = items.indexOf(itemId);
            if (index >= 0) items.splice(index, 1);
            else items.push(itemId);
            saveProgress();
            return index < 0;
        }

        function updateProgressSummary() {
            if (!practiceData) return;
            const totals = practiceData.languages.reduce((summary, language) => {
                summary.total += language.items.length + language.starterWords.length;
                summary.done += language.items.filter(item => hasProgress('letters', language.id, item.id)).length;
                summary.done += language.starterWords.filter(word => hasProgress('words', language.id, word.id)).length;
                return summary;
            }, { done: 0, total: 0 });
            const percent = totals.total ? Math.round(totals.done / totals.total * 100) : 0;
            progressText.textContent = `已學 ${totals.done}／${totals.total} 項 · 測驗 ${learningProgress.quiz.correct}／${learningProgress.quiz.total} 題答對`;
            progressBar.style.width = `${percent}%`;
            progressTrack.setAttribute('aria-valuenow', String(percent));
            if (currentItem && currentLanguage) {
                const learned = hasProgress('letters', currentLanguage.id, currentItem.id);
                masteredButton.classList.toggle('learned', learned);
                masteredButton.textContent = learned ? '已學會，可取消' : '標記已學';
                masteredButton.setAttribute('aria-pressed', String(learned));
            }
        }

        progressReset.addEventListener('click', () => {
            if (!window.confirm('要清除這台裝置上的字母、單字與測驗紀錄嗎？')) return;
            learningProgress = { letters: {}, words: {}, quiz: { correct: 0, total: 0 } };
            saveProgress();
            if (currentWordLanguage) renderWordCards(currentWordLanguage);
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
            clearTimeout(motionHideTimer);
            practiceStrokes.classList.add('motion-hidden');
            if (item.strokes.length) requestAnimationFrame(alignStrokeGuidesToGlyph);
            animateButton.disabled = item.strokes.length === 0;
            animateButton.textContent = item.strokes.length ? '播放筆勢示意' : '目前沒有筆勢示意';
            practiceCharacterTabs.querySelectorAll('button').forEach(button => {
                const isActive = button.dataset.itemId === item.id;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
            const itemIndex = currentItems.findIndex(candidate => candidate.id === item.id);
            practicePosition.textContent = `${itemIndex + 1}／${currentItems.length} · ${currentLanguage.groups?.find(group => group.id === item.group)?.label || '字母練習'}`;
            previousButton.disabled = currentItems.length < 2;
            nextButton.disabled = currentItems.length < 2;
            updateProgressSummary();
            clearCanvas(item.strokes.length
                ? '可沿單一淺灰字形描摹；藍色線只會在播放時短暫顯示。'
                : '可沿單一淺灰字形描摹；此字目前不顯示未經審核的筆勢線。');
        }

        function renderCharacterTabs(language, group = 'all') {
            currentGroup = group;
            currentItems = group === 'all'
                ? language.items
                : language.items.filter(item => item.group === group);
            practiceCharacterTabs.replaceChildren();
            currentItems.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'practice-character-button';
                button.dataset.itemId = item.id;
                button.textContent = item.char;
                button.setAttribute('aria-label', `練習 ${item.name}`);
                button.addEventListener('click', () => updatePracticeItem(item));
                practiceCharacterTabs.appendChild(button);
            });
            if (currentItems.length) updatePracticeItem(currentItems[0]);
        }

        function renderGroupTabs(language) {
            practiceGroupTabs.replaceChildren();
            [{ id: 'all', label: `全部 · ${language.items.length}` }, ...(language.groups || [])].forEach((group, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = group.label;
                button.classList.toggle('active', index === 0);
                button.setAttribute('aria-pressed', String(index === 0));
                button.addEventListener('click', () => {
                    practiceGroupTabs.querySelectorAll('button').forEach(item => {
                        const active = item === button;
                        item.classList.toggle('active', active);
                        item.setAttribute('aria-pressed', String(active));
                    });
                    renderCharacterTabs(language, group.id);
                });
                practiceGroupTabs.appendChild(button);
            });
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
            renderGroupTabs(language);
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

        function stepPractice(direction) {
            if (!currentItem || currentItems.length < 2) return;
            const index = currentItems.findIndex(item => item.id === currentItem.id);
            const nextIndex = (index + direction + currentItems.length) % currentItems.length;
            updatePracticeItem(currentItems[nextIndex]);
            practiceCharacterTabs.querySelector(`[data-item-id="${CSS.escape(currentItems[nextIndex].id)}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        previousButton.addEventListener('click', () => stepPractice(-1));
        nextButton.addEventListener('click', () => stepPractice(1));
        masteredButton.addEventListener('click', () => {
            if (!currentItem || !currentLanguage) return;
            const learned = toggleProgress('letters', currentLanguage.id, currentItem.id);
            practiceStatus.textContent = learned ? '已加入這台裝置的學習紀錄。' : '已從學習紀錄移除。';
        });

        animateButton.addEventListener('click', () => {
            const paths = [...practiceStrokes.querySelectorAll('.practice-stroke')];
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            clearTimeout(motionHideTimer);
            practiceStrokes.classList.remove('motion-hidden');
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
            practiceStatus.textContent = `正在依序播放 ${paths.length} 個簡化筆勢示意。`;
            motionHideTimer = window.setTimeout(() => {
                practiceStrokes.classList.add('motion-hidden');
                practiceStatus.textContent = '筆勢示意已隱藏，可沿單一淺灰字形繼續描摹。';
            }, delay + 600);
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

        function setActiveLanguageButton(container, languageId) {
            container.querySelectorAll('button').forEach(button => {
                const active = button.dataset.language === languageId;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
        }

        function addLanguageButtons(container, onSelect) {
            practiceData.languages.forEach(language => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'practice-language-button';
                button.dataset.language = language.id;
                button.innerHTML = `<strong>${escapeHTML(language.name)}</strong><span>${escapeHTML(language.nativeName)}</span>`;
                button.addEventListener('click', () => onSelect(language));
                container.appendChild(button);
            });
        }

        function renderWordCards(language) {
            currentWordLanguage = language;
            setActiveLanguageButton(wordLanguageTabs, language.id);
            wordGrid.innerHTML = language.starterWords.map(word => {
                const learned = hasProgress('words', language.id, word.id);
                return `<article class="word-card${learned ? ' learned' : ''}" data-word-id="${escapeHTML(word.id)}">
                    <span class="word-category">${escapeHTML(word.category)}</span>
                    <h2 lang="${escapeHTML(language.langCode)}">${escapeHTML(word.native)}</h2>
                    <p>${escapeHTML(word.translation)}</p>
                    <div>
                        <button type="button" data-word-speak="${escapeHTML(word.id)}">播放</button>
                        <button type="button" data-word-master="${escapeHTML(word.id)}" aria-pressed="${String(learned)}">${learned ? '已學會' : '標記已學'}</button>
                    </div>
                </article>`;
            }).join('');
            wordGrid.querySelectorAll('[data-word-speak]').forEach(button => {
                button.addEventListener('click', () => {
                    const word = language.starterWords.find(item => item.id === button.dataset.wordSpeak);
                    if (word) window.speakText(word.native, language.langCode);
                });
            });
            wordGrid.querySelectorAll('[data-word-master]').forEach(button => {
                button.addEventListener('click', () => {
                    toggleProgress('words', language.id, button.dataset.wordMaster);
                    renderWordCards(language);
                });
            });
        }

        function shuffle(items) {
            const copy = [...items];
            for (let index = copy.length - 1; index > 0; index -= 1) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
            }
            return copy;
        }

        function selectQuizLanguage(language) {
            currentQuizLanguage = language;
            setActiveLanguageButton(quizLanguageTabs, language.id);
            quizSummary.textContent = `${language.name}題庫含 ${language.items.length} 個字母與聲調練習項目。每回隨機抽五題。`;
        }

        function quizPool(language) {
            const seen = new Set();
            return language.items.filter(item => {
                if (seen.has(item.char)) return false;
                seen.add(item.char);
                return true;
            });
        }

        function startQuiz() {
            if (!currentQuizLanguage) return;
            quizItems = shuffle(quizPool(currentQuizLanguage)).slice(0, 5);
            quizIndex = 0;
            quizCorrect = 0;
            quizStartPanel.hidden = true;
            quizQuestionPanel.hidden = false;
            renderQuizQuestion();
        }

        function renderQuizQuestion() {
            const target = quizItems[quizIndex];
            quizAnswered = false;
            quizCounter.textContent = `第 ${quizIndex + 1}／${quizItems.length} 題`;
            quizFeedback.textContent = '';
            quizFeedback.className = 'quiz-feedback';
            quizNext.hidden = true;
            const listeningQuestion = quizIndex % 2 === 1;
            const cue = target.name.replace(target.char, '').replace(/^\s*·?\s*/, '');
            quizQuestion.textContent = listeningQuestion
                ? '播放例詞後，選出它對應的練習字母。'
                : `哪一個字母是「${cue}」？`;
            quizListen.hidden = !listeningQuestion;
            quizListen.onclick = () => window.speakText(target.speak, currentQuizLanguage.langCode);
            const distractors = shuffle(quizPool(currentQuizLanguage).filter(item => item.char !== target.char)).slice(0, 3);
            const options = shuffle([target, ...distractors]);
            quizOptions.innerHTML = options.map(item =>
                `<button type="button" data-answer="${escapeHTML(item.id)}" aria-label="選擇 ${escapeHTML(item.char)}">${escapeHTML(item.char)}</button>`
            ).join('');
            quizOptions.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => answerQuiz(button, target));
            });
        }

        function answerQuiz(button, target) {
            if (quizAnswered) return;
            quizAnswered = true;
            const correct = button.dataset.answer === target.id;
            quizOptions.querySelectorAll('button').forEach(option => {
                option.disabled = true;
                const isCorrect = option.dataset.answer === target.id;
                option.classList.toggle('correct', isCorrect);
                option.classList.toggle('wrong', option === button && !isCorrect);
            });
            learningProgress.quiz.total += 1;
            if (correct) {
                quizCorrect += 1;
                learningProgress.quiz.correct += 1;
                if (!hasProgress('letters', currentQuizLanguage.id, target.id)) {
                    progressList('letters', currentQuizLanguage.id).push(target.id);
                }
                quizFeedback.textContent = `答對了。${target.example}`;
                quizFeedback.classList.add('correct');
            } else {
                quizFeedback.textContent = `正確答案是 ${target.char}。${target.example}`;
                quizFeedback.classList.add('wrong');
            }
            saveProgress();
            quizNext.textContent = quizIndex === quizItems.length - 1 ? '查看結果' : '下一題';
            quizNext.hidden = false;
        }

        function advanceQuiz() {
            quizIndex += 1;
            if (quizIndex < quizItems.length) {
                renderQuizQuestion();
                return;
            }
            quizQuestionPanel.hidden = true;
            quizStartPanel.hidden = false;
            quizSummary.textContent = `本回答對 ${quizCorrect}／${quizItems.length} 題。答對的字母已加入本機學習紀錄。`;
            quizStart.textContent = '再挑戰一次';
        }

        addLanguageButtons(wordLanguageTabs, renderWordCards);
        addLanguageButtons(quizLanguageTabs, selectQuizLanguage);
        quizStart.addEventListener('click', startQuiz);
        quizNext.addEventListener('click', advanceQuiz);

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
                    ${language.source ? `<a href="${escapeHTML(language.source)}" target="_blank" rel="noopener noreferrer">查看語言資料頁 →</a>` : ''}
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
        renderWordCards(practiceData.languages[0]);
        selectQuizLanguage(practiceData.languages[0]);
        renderFeatureCards();
        updateProgressSummary();
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
