import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

test("動態代表色使用符合 CSP 的樣式表規則", () => {
  assert.match(appSource, /insertRule\(/);
  assert.doesNotMatch(appSource, /style="--event-/);
  assert.doesNotMatch(appSource, /style\.setProperty\("--/);
  assert.match(cssSource, /background:var\(--entity-tint/);
});

test("整週卡片顏色可選擇維持原始樣式且不顯示色彩清單", () => {
  assert.match(htmlSource, /<option value="none">請選擇<\/option>/);
  assert.doesNotMatch(htmlSource, /week-color-legend/);
});
