import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const workflowSource = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");

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

test("GitHub Actions 會部署 public 目錄到 Pages", () => {
  assert.match(workflowSource, /branches: \[main\]/);
  assert.match(workflowSource, /uses: actions\/configure-pages@v5/);
  assert.match(workflowSource, /uses: actions\/upload-pages-artifact@v4/);
  assert.match(workflowSource, /path: public/);
  assert.match(workflowSource, /uses: actions\/deploy-pages@v4/);
});
