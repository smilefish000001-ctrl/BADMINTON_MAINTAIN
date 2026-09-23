import assert from "node:assert/strict";
import test from "node:test";
import { recurringGroups, recurringSessions } from "../public/groups.js";

test("匯入的固定團皆有可辨識的核心欄位", () => {
  assert.equal(recurringGroups.length, 54);
  assert.equal(recurringSessions.length, 93);

  for (const group of recurringGroups) {
    assert.ok(["active", "disabled"].includes(group.status));
    assert.equal(typeof group.favorite, "boolean");
  }

  for (const session of recurringSessions) {
    assert.ok(session.name);
    assert.ok(Number.isInteger(session.weekday));
    assert.match(session.start, /^\d{2}:\d{2}$/);
    assert.match(session.end, /^\d{2}:\d{2}$/);
    assert.ok(session.venue);
    assert.ok(session.level);
    assert.ok(session.prices.length > 0);
  }
});

test("羽艾有約已建立週一及週二固定場次", () => {
  const group = recurringGroups.find((item) => item.id === "grp-yu-ai-date");

  assert.equal(group.name, "羽艾有約");
  assert.deepEqual(group.facilities, ["淋浴間", "冷氣", "販賣機"]);
  assert.deepEqual(group.sessions.map((session) => [session.weekday, session.start, session.end]), [
    [1, "17:00", "19:00"],
    [2, "14:00", "16:00"],
  ]);
  assert.ok(group.sessions.every((session) => session.venue === "帥一成球館"));
});

test("T.S.D 已建立福慧羽球館週一固定場次", () => {
  const group = recurringGroups.find((item) => item.id === "grp-tsd");
  const [session] = group.sessions;

  assert.equal(group.name, "T.S.D");
  assert.equal(group.ball, "好神 4 號");
  assert.deepEqual([session.weekday, session.start, session.end], [1, "20:00", "22:00"]);
  assert.equal(session.venue, "福慧羽球館");
  assert.equal(session.courts, 2);
  assert.equal(session.courtNote, "基本 2 面（1、2 場）");
  assert.deepEqual(session.prices, ["男性 $190", "女性 $170"]);
});

test("新聊天紀錄只匯入可明確辨識的固定團", () => {
  const expected = new Map([
    ["曜丞羽球隊", 1],
    ["哈酷哪瑪踏踏", 1],
    ["美羽季節", 1],
    ["陽光羽球", 6],
  ]);

  for (const [name, sessionCount] of expected) {
    const group = recurringGroups.find((item) => item.name === name);
    assert.ok(group, `${name} 應已匯入`);
    assert.equal(group.sessions.length, sessionCount);
  }
});

test("2026-09-23 聊天紀錄新增三組明確的固定團", () => {
  const expected = new Map([
    ["CMP 球隊", 1],
    ["羽生聚來羽球隊", 10],
    ["酪梨羽球", 2],
  ]);

  for (const [name, sessionCount] of expected) {
    const group = recurringGroups.find((item) => item.name === name);
    assert.ok(group, `${name} 應已匯入`);
    assert.equal(group.sessions.length, sessionCount);
    assert.equal(group.source, "使用者提供的 2026-09-23 揪團聊天紀錄");
  }
});

test("固定場次以團名、星期、時間及球館去重", () => {
  const keys = recurringSessions.map((session) => [
    session.name,
    session.weekday,
    session.start,
    session.end,
    session.venue,
  ].join("|"));

  assert.equal(new Set(keys).size, keys.length);
});
