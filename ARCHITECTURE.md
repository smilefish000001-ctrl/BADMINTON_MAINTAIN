# 羽球活動表架構規範

## 目標

- 可在 Windows 本機一鍵啟停並自動開啟瀏覽器。
- 可直接推送 GitHub，由 Railway 自動部署。
- 以 Node.js 24 為單一執行環境，初期避免不必要的相依套件。
- 功能、資料與介面可漸進擴充，不綁死目前尚未定義的需求。

## 分層原則

```text
Browser → public/ → src/app.js（路由）→ src/features/（功能服務）→ data/ 或外部資料庫
                         ↓
                    src/http/（共用 HTTP 工具）
```

- `public/`：只負責畫面與呼叫 API，不直接持有機密資料。
- `src/app.js`：辨識路由並交給功能模組，不直接寫大型業務流程。
- `src/features/`：每個功能自行包含 route、service、validation、repository 等需要的檔案。
- `src/http/`：共用協定層，例如 JSON 回應、Cookie、安全標頭、靜態檔案。
- `data/`：僅供本機或 Railway Volume 的持久資料，禁止提交實際資料。

建議的未來功能模組範例：

```text
src/features/events/
├─ events.routes.js        HTTP 輸入與輸出
├─ events.service.js       活動規則與流程
├─ events.repository.js    資料存取
└─ events.validation.js    欄位驗證
```

## API 約定

- 路徑統一以 `/api/` 開頭，資源名稱使用小寫複數，例如 `/api/events`。
- 成功回應使用合適的 `2xx`；輸入錯誤用 `400`、未授權用 `401`、禁止用 `403`、不存在用 `404`、資料衝突用 `409`。
- 錯誤至少提供 `{ "error": "可理解的訊息" }`，不得回傳 Stack Trace 或機密設定。
- 日期時間儲存為 UTC ISO 8601；畫面顯示時再轉換為使用者時區。
- ID 優先使用 UUID，避免把連號暴露成資料量或權限線索。

## 資料庫決策

需求尚未確認前不預建資料表。確定功能後再選擇：

- 單一服務、低至中流量：SQLite + Railway Volume，成本與維護最簡單。
- 多 Replica、多人同時大量操作或需要複雜查詢：Railway PostgreSQL。

不論採哪一種，資料庫初始化與 Migration 必須可重複執行，且不可依賴手動修改正式資料庫。

## 設定與安全

- 正式機密只放 Railway Variables；本機機密只放 `.env`。
- `.env.example` 只列變數名稱與安全範例，不放正式帳密。
- 驗證所有外部輸入並限制請求大小；登入功能加入安全 Cookie、密碼雜湊與嘗試次數限制。
- 權限在 Server 端判斷，不能只靠隱藏前端按鈕。
- 定期備份持久資料，並實際演練還原。

## Git 與部署流程

```text
本機修改 → npm run check → npm test → Git commit → push main
→ Railway 自動建置 → /api/health 通過 → 新版本上線
```

- `main` 保持可部署狀態；大型功能使用功能分支與 Pull Request。
- 禁止強制推送覆蓋遠端更新。
- 部署是否成功以 Railway Deployment 的 Commit SHA、狀態與健康檢查為準。

## 完成功能的最低標準

- 手機與桌面尺寸皆可操作。
- API 有輸入驗證、明確錯誤訊息與權限檢查。
- 核心流程有自動測試。
- `npm run check`、`npm test`、`/api/health` 全部通過。
- README、環境變數範例與資料遷移說明同步更新。

