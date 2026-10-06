import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const workflowSource = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const uploadSource = await readFile(new URL("../上傳到GitHub.bat", import.meta.url), "utf8");
const buildInfo = JSON.parse(await readFile(new URL("../public/build-info.json", import.meta.url), "utf8"));

test("靜態頁使用相對資源路徑，可部署在 GitHub Pages 專案子目錄", () => {
  assert.match(htmlSource, /href="\.\/styles\.css\?v=/);
  assert.match(htmlSource, /href="\.\/icon\.svg"/);
  assert.match(htmlSource, /src="\.\/app\.js\?v=/);
  assert.doesNotMatch(htmlSource, /(?:href|src)="\/(?:styles\.css|icon\.svg|app\.js)/);
});

test("GitHub Pages 使用唯讀靜態模式，不呼叫登入與版本 API", () => {
  assert.match(appSource, /location\.hostname\.endsWith\("\.github\.io"\)/);
  assert.match(appSource, /if \(staticMode\) \{[\s\S]*?renderCurrentUser\(\);[\s\S]*?return;/);
  assert.match(appSource, /GitHub Pages 靜態版/);
});

test("靜態頁顯示資料最後更新時間且略過瀏覽器快取", () => {
  assert.match(htmlSource, /id="data-last-updated"/);
  assert.match(appSource, /build-info\.json\?ts=\$\{Date\.now\(\)\}/);
  assert.match(appSource, /timeZone: "Asia\/Taipei"/);
  assert.ok(Number.isFinite(new Date(buildInfo.lastUpdatedAt).getTime()));
});

test("GitHub 上傳批次檔會自動刷新靜態資料時間", () => {
  assert.match(uploadSource, /public\\build-info\.json/);
  assert.match(uploadSource, /DateTimeOffset.*Now/);
  assert.match(uploadSource, /git push origin main/);
});

test("GitHub Actions 會部署 public 目錄到 Pages", () => {
  assert.match(workflowSource, /branches: \[main\]/);
  assert.match(workflowSource, /uses: actions\/configure-pages@v5/);
  assert.match(workflowSource, /uses: actions\/upload-pages-artifact@v4/);
  assert.match(workflowSource, /path: public/);
  assert.match(workflowSource, /uses: actions\/deploy-pages@v4/);
});
