import assert from "node:assert/strict";
import test from "node:test";
import { venues } from "../public/venues.js";

test("帥一成球館已加入北屯區球館資料", () => {
  const venue = venues.find((item) => item.name === "帥一成球館");

  assert.equal(venues.length, 56);
  assert.equal(venue.district, "北屯區");
  assert.equal(venue.address, "臺中市北屯區環中東路二段472號");
  assert.equal(venue.type, "民營");
});

test("所有球館都有可辨識的狀態", () => {
  const validStatuses = new Set(["active", "disabled", "hidden"]);

  assert.ok(venues.every((venue) => validStatuses.has(venue.status)));
});
