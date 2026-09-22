import assert from "node:assert/strict";
import test from "node:test";
import { getUpcomingWeekDays } from "../public/week-dates.js";

test("整週日期以台灣今天起算，已過星期移到下一週", () => {
  const weekDays = getUpcomingWeekDays(new Date("2026-09-21T16:30:00.000Z"));

  assert.deepEqual(weekDays.map(({ key, date }) => ({ key, date })), [
    { key: 1, date: "9/28" },
    { key: 2, date: "9/22" },
    { key: 3, date: "9/23" },
    { key: 4, date: "9/24" },
    { key: 5, date: "9/25" },
    { key: 6, date: "9/26" },
    { key: 0, date: "9/27" },
  ]);
});

test("台灣日期不受伺服器 UTC 日期影響", () => {
  const weekDays = getUpcomingWeekDays(new Date("2026-12-31T16:10:00.000Z"));
  const friday = weekDays.find((day) => day.key === 5);
  const thursday = weekDays.find((day) => day.key === 4);

  assert.equal(friday.isoDate, "2027-01-01");
  assert.equal(thursday.isoDate, "2027-01-07");
});
