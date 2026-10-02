import assert from "node:assert/strict";
import test from "node:test";
import { venues } from "../public/venues.js";
import { entityNameKey } from "../public/name-normalization.js";

test("帥一成球館已加入北屯區球館資料", () => {
  const venue = venues.find((item) => item.name === "帥一成球館");

  assert.equal(venues.length, 57);
  assert.equal(venue.district, "北屯區");
  assert.equal(venue.address, "臺中市北屯區環中東路二段472號");
  assert.equal(venue.type, "民營");
});

test("亞伯林羽球館振興店已加入東區球館資料", () => {
  const venue = venues.find((item) => item.name === "亞伯林羽球館（振興店）");

  assert.equal(venue.district, "東區");
  assert.equal(venue.address, "臺中市東區振興路284巷2號");
  assert.equal(venue.status, "active");
});

test("所有球館都有可辨識的狀態", () => {
  const validStatuses = new Set(["active", "disabled"]);

  assert.ok(venues.every((venue) => validStatuses.has(venue.status)));
  assert.ok(venues.every((venue) => typeof venue.favorite === "boolean"));
});

test("球館名稱忽略空白後仍不可重複", () => {
  const keys = venues.map((venue) => entityNameKey(venue.name));
  assert.equal(new Set(keys).size, keys.length);
});
