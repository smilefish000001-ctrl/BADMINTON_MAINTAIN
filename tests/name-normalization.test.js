import assert from "node:assert/strict";
import test from "node:test";
import { entityNameKey, normalizeEntityName, sameEntityName } from "../public/name-normalization.js";
import { dedupeGroupsByName } from "../public/stored-data.js";

test("名稱顯示會清除頭尾空白並合併連續空白", () => {
  assert.equal(normalizeEntityName("  Have　 a   time 羽球團  "), "Have a time 羽球團");
});

test("球團與球館名稱比對會忽略半形及全形空白", () => {
  assert.equal(entityNameKey("羽 I 同在 羽球團"), entityNameKey("羽I同在羽球團"));
  assert.equal(sameEntityName("大智 羽球館", "大智羽球館"), true);
});

test("舊球團資料若只差空白會合併並保留不同場次", () => {
  const groups = [
    {
      id: "first",
      name: "羽 I 同在羽球團",
      sessions: [{ weekday: 4, start: "20:00", end: "22:00", venue: "普那 羽球運動會館" }],
    },
    {
      id: "duplicate",
      name: "羽I同在羽球團",
      sessions: [
        { weekday: 4, start: "20:00", end: "22:00", venue: "普那羽球運動會館" },
        { weekday: 6, start: "14:00", end: "16:00", venue: "大智羽球館" },
      ],
    },
  ];

  dedupeGroupsByName(groups);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "羽 I 同在羽球團");
  assert.equal(groups[0].sessions.length, 2);
  assert.equal(groups[0].sessions[0].venue, "普那 羽球運動會館");
});
