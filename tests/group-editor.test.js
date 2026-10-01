import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("固定團收費可新增、修改與刪除", () => {
  assert.match(htmlSource, /id="group-price-editor"/);
  assert.match(htmlSource, /id="add-group-price"/);
  assert.match(appSource, /function addGroupPriceRow/);
  assert.match(appSource, /renderGroupPrices\(session\?\.prices \|\| \[\]\)/);
  assert.match(appSource, /prices: readGroupPrices\(\)/);
  assert.doesNotMatch(appSource, /prices: \["價格待確認"\]/);
});

test("固定團與收費修改會保存在瀏覽器", () => {
  assert.match(appSource, /badminton-group-directory-v1/);
  assert.match(appSource, /localStorage\.setItem\(groupStorageKey, JSON\.stringify\(recurringGroups\)\)/);
});
