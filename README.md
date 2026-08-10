# 全球文字演化與書寫系統圖鑑

這是一個以地理分布、歷史傳播、書寫系統類型與語音學為四個入口的互動式網站。

## 本機預覽

此專案使用 `fetch()` 讀取 JSON，請以本機網頁伺服器開啟，不要直接雙擊 `index.html`。例如在專案目錄執行：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000/`。

## 資料架構

- `data/alphabet.json`、`abjad.json`、`abugida.json`：按書寫原理整理的類型資料。
- `data/chinese.json`、`japanese.json`、`korean.json`：特定語言的書寫案例，不與類型並列。
- `data/details/`：地圖國家詳細頁資料。
- `data/history-stories.json`：歷史地圖的路線、步驟、節點、關係類型與參考來源。

新增資料時，請先判斷內容屬於 typology（書寫原理）、script（文字符號系統）或 orthography（特定語言的書寫規則），避免混用層級。

## 歷史地圖資料原則

歷史頁的實線表示文字譜系，虛線表示借用後改造，點線表示文化環境或並用關係。點線不能解讀為字形直接演變。地圖是教學用簡圖，新增路線時應在 JSON 的 `sources` 欄位附上 Unicode 或其他可查核來源。
