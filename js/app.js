document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#global-nav button');
    const sections = document.querySelectorAll('.module-section');
    
    let isSvgMapInitialized = false;
    let isLeafletMapInitialized = false;
    
    // 導覽列切換邏輯
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

    // 模組啟動攔截器
    function handleModuleActivation(targetId) {
        if (targetId === 'modern-map-section') {
            if (!isSvgMapInitialized) {
                initModernMap();
                isSvgMapInitialized = true;
            }
        } 
        else if (targetId === 'history-map-section') {
            if (!isLeafletMapInitialized) {
                initHistoryMap();
                isLeafletMapInitialized = true;
            } else {
                // 已初始化過，視窗重新顯露時需重算地圖尺寸
                if (window.leafletMapInstance) {
                    setTimeout(() => window.leafletMapInstance.invalidateSize(), 100);
                }
            }
        }
        else if (targetId === 'system-section') {
            // 可在此觸發預設表格資料載入
        }
    }

    // --- 以下為各模組初始化函式預留區 ---

    function initModernMap() {
        console.log("啟動現代地理分佈 (svgMap)");
        // 稍後將 svgMap 程式碼移入此處
    }

    function initHistoryMap() {
        console.log("啟動歷史演化流變 (Leaflet)");
        // 稍後將 Leaflet 滾動敘事程式碼移入此處
    }
});
