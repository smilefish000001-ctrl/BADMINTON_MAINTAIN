import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("整週活動提供球館與球隊多選篩選", () => {
  assert.match(htmlSource, /id="week-venue-options"/);
  assert.match(htmlSource, /id="week-group-options"/);
  assert.match(appSource, /selectedVenues\.has\(activity\.venue\)/);
  assert.match(appSource, /selectedGroups\.has\(activity\.groupId\)/);
});

test("點擊多選清單外部會自動收合，且同時只展開一個清單", () => {
  assert.match(appSource, /event\.target instanceof Element && event\.target\.closest\("\.multi-filter"\)/);
  assert.match(appSource, /if \(otherFilter !== filter\) otherFilter\.open = false/);
  assert.match(appSource, /filter\.open = false/);
});

test("整週活動可依球隊與球館狀態篩選", () => {
  assert.match(htmlSource, /id="week-group-status-filter"/);
  assert.match(htmlSource, /id="week-venue-status-filter"/);
  assert.match(appSource, /groupStatus: weekGroupStatusFilter\.value/);
  assert.match(appSource, /venueStatus: weekVenueStatusFilter\.value/);
});

test("我的最愛篩選僅供管理員使用", () => {
  assert.match(htmlSource, /id="week-favorite-filter" data-admin-only hidden/);
  assert.match(htmlSource, /id="group-favorite-input"/);
  assert.match(htmlSource, /id="venue-favorite-input"/);
  assert.match(appSource, /favoritesOnly: weekFavoritesOnly\.checked/);
  assert.match(appSource, /isAdmin: currentUser\.role === "admin"/);
});

test("球隊及球館的狀態選單不再提供隱藏", () => {
  const statusSelects = [...htmlSource.matchAll(/<select id="(?:group|venue)-status-(?:filter|input)">([\s\S]*?)<\/select>/g)];
  assert.equal(statusSelects.length, 4);
  assert.ok(statusSelects.every((match) => !match[1].includes('value="hidden"')));
});

test("畫面顯示目前版本", () => {
  assert.match(htmlSource, /id="app-version">V1\.1\.3/);
  assert.match(appSource, /fetch\("\/api\/health"/);
});
