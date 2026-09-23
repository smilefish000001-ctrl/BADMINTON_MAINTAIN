import assert from "node:assert/strict";
import test from "node:test";
import { matchesWeekEntityFilters } from "../public/week-filters.js";

const activeGroup = { status: "active", favorite: false };
const disabledGroup = { status: "disabled", favorite: true };
const activeVenue = { status: "active", favorite: false };
const favoriteVenue = { status: "active", favorite: true };

test("球隊與球館狀態必須同時符合", () => {
  assert.equal(matchesWeekEntityFilters({ group: activeGroup, venue: activeVenue, groupStatus: "active", venueStatus: "active" }), true);
  assert.equal(matchesWeekEntityFilters({ group: disabledGroup, venue: activeVenue, groupStatus: "active", venueStatus: "active" }), false);
});

test("管理員可篩選最愛球隊或最愛球館", () => {
  assert.equal(matchesWeekEntityFilters({ group: disabledGroup, venue: activeVenue, favoritesOnly: true, isAdmin: true }), true);
  assert.equal(matchesWeekEntityFilters({ group: activeGroup, venue: favoriteVenue, favoritesOnly: true, isAdmin: true }), true);
  assert.equal(matchesWeekEntityFilters({ group: activeGroup, venue: activeVenue, favoritesOnly: true, isAdmin: true }), false);
});

test("訪客無法使用我的最愛篩選", () => {
  assert.equal(matchesWeekEntityFilters({ group: disabledGroup, venue: favoriteVenue, favoritesOnly: true, isAdmin: false }), false);
});
