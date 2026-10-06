# 羽球活動表

目前版本：**V1.1.4**

以 Node.js 24 開發、準備部署至 Railway 的羽球活動管理網站。目前完成可執行的基礎架構，業務功能將依後續需求逐步加入。

## 本機啟動與關閉

- 雙擊 `啟動.bat`：在背景啟動 Server，健康檢查成功後自動開啟瀏覽器。
- 雙擊 `關閉.bat`：關閉由上述工具啟動的 Server。
- 開發時也可執行 `npm run dev`，預設網址為 <http://127.0.0.1:3090/>。
- 背景執行紀錄位於 `.runtime/server.out.log` 與 `.runtime/server.err.log`，不會上傳 GitHub。

若要覆寫本機設定，請將 `.env.example` 複製為 `.env` 後修改；`.env` 已被 Git 忽略。

## 專案結構

```text
羽球活動表/
├─ public/                 瀏覽器端 HTML、CSS、JavaScript 與圖片
├─ src/
│  ├─ http/                HTTP 回應與靜態檔案處理
│  ├─ app.js               路由入口與登入 API
│  ├─ auth.js              管理員驗證與伺服器工作階段
│  └─ config.js            集中管理環境變數與路徑
├─ tests/                  Node.js 內建測試
├─ scripts/                Windows 背景啟停腳本
├─ data/                   本機持久資料（內容不進 Git）
├─ server.js               程式啟動入口
├─ railway.json            Railway 建置及健康檢查設定
├─ 啟動.bat / 關閉.bat     本機一鍵控制
└─ 上傳到GitHub.bat        檢查、測試、提交與推送工具
```

## 開發規範

1. `server.js` 只管理 Server 生命週期，不放業務邏輯。
2. 新 API 依功能拆至 `src/features/<功能名稱>/`，再由 `src/app.js` 掛載。
3. 前端頁面與元件放在 `public/`；若規模成長，再獨立成前端建置專案。
4. 所有可變設定使用環境變數，不在程式中寫入帳密、Token 或正式網址。
5. 執行寫入前先做輸入驗證；API 錯誤統一回傳 JSON。
6. 每項核心功能至少有正常流程與錯誤流程測試。
7. 提交前必須執行 `npm run check` 與 `npm test`。
8. 執行資料、Log、`.env`、資料庫與暫存檔不可進 Git。
9. 若採 SQLite，Railway 必須掛載 Volume 並維持單一 Replica；若需要水平擴充，改採 PostgreSQL。
10. 正式環境使用 Railway 提供的 `PORT`，程式必須監聽 `0.0.0.0`。

## 檢查

```powershell
npm run check
npm test
```

目前 `public/groups.js` 收錄 99 個球團、160 個每週場次，包含使用者提供的聊天紀錄，以及可公開核對的固定團資料。匯入時以「團名＋星期＋開始／結束時間＋球館」去重，只採用能確認固定週期、時段與球館的資訊；即時缺額不沿用，畫面統一顯示向團主確認，避免把過期名額當成現況。網路資料另保留 `source` 與 `sourceUrl`，方便日後複查。

網站預設以訪客模式進入，只能瀏覽整週活動。點選右上角「訪客」可登入系統管理員帳號，登入後才會顯示活動總覽、開團設定與球館維護；工作階段使用 HttpOnly、SameSite Cookie 保存。開發環境預設帳號及密碼均為 `0000`，上線前必須透過 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 環境變數覆寫，不可沿用測試密碼。

球館維護可點選卡片開啟修改視窗；目前修改結果會保存在該瀏覽器的 Local Storage，並同步更新畫面中的固定團與整週活動引用。串接正式資料庫後會改由 Server API 持久化，讓不同裝置共用資料。

固定團與球館皆可設定代表色。整週活動的卡片顏色預設為原始統一樣式，亦可切換「依揪團」或「依球館」著色；尚未設定的資料會取得穩定且彼此不同的預設色，自訂顏色與著色模式保存在該瀏覽器的 Local Storage。

固定團維護可在「收費」區塊新增、修改或刪除多筆收費內容；儲存後會同步更新整週活動及詳細資料，並保存在該瀏覽器的 Local Storage。

健康檢查：<http://127.0.0.1:3090/api/health>

## GitHub Pages 靜態版

專案會在推送至 `main` 後，透過 `.github/workflows/deploy-pages.yml` 將 `public/` 自動部署成 GitHub Pages：

<https://smilefish000001-ctrl.github.io/BADMINTON_MAINTAIN/>

第一次使用時，請至 GitHub 儲存庫的 **Settings → Pages → Build and deployment**，將 **Source** 設為 **GitHub Actions**。靜態版可直接瀏覽與篩選每週活動，不需要啟動 Node.js Server；登入、球團維護與球館維護仍須使用 Server 版本。

## GitHub 初次設定

先在 GitHub 建立空的 Repository，再於本資料夾執行：

```powershell
git init
git branch -M main
git add .
git commit -m "建立羽球活動表基礎架構"
git remote add origin https://github.com/你的帳號/你的Repository.git
git push -u origin main
```

完成一次設定後，日常更新可雙擊 `上傳到GitHub.bat`。批次檔會在檢查與測試前自動更新 `public/build-info.json`，因此 GitHub Pages 會顯示這次上傳的台灣時間；推送完成後，GitHub Actions 會自動重新部署靜態網站。

## Railway 部署

1. 在 Railway 選擇 `Deploy from GitHub repo` 並連接這個 Repository。
2. Variables 設定 `NODE_ENV=production`、`HOST=0.0.0.0`、`APP_NAME=羽球活動表`；`PORT` 由 Railway 提供，不要自行固定。
3. `railway.json` 會使用 `npm start` 啟動，並以 `/api/health` 做健康檢查。
4. 產生 Public Domain 後即可對外使用。
5. 未來若使用 SQLite，新增 Volume 並掛載至 `/data`，同時設定 `DATA_DIR=/data`、保持單一 Replica。

詳細技術架構請見 [`ARCHITECTURE.md`](./ARCHITECTURE.md)，開團資料欄位與資料表拆分草案請見 [`FIELD-SPEC.md`](./FIELD-SPEC.md)，台中市球館名錄的範圍與來源請見 [`VENUE-DATA.md`](./VENUE-DATA.md)。
