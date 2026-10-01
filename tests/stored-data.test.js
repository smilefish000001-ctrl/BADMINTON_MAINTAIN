import assert from "node:assert/strict";
import test from "node:test";
import { mergeStoredGroups } from "../public/stored-data.js";

test("較新的內建球隊場次會與瀏覽器舊資料合併", () => {
  const seedGroups = [{
    id: "group-1",
    name: "測試球隊",
    importedAt: "2026-09-24",
    status: "active",
    favorite: false,
    color: "#111111",
    sessions: [
      { weekday: 2, start: "19:00", end: "21:00", venue: "甲館", prices: ["$200"] },
      { weekday: 4, start: "19:00", end: "21:00", venue: "乙館", prices: ["$230"] },
    ],
  }];
  const storedGroups = [{
    id: "group-1",
    name: "舊名稱",
    importedAt: "2026-09-21",
    status: "disabled",
    favorite: true,
    color: "#abcdef",
    sessions: [
      { weekday: 2, start: "19:00", end: "21:00", venue: "甲館", prices: ["$210"] },
    ],
  }];

  mergeStoredGroups(seedGroups, storedGroups);

  assert.equal(seedGroups[0].name, "測試球隊");
  assert.equal(seedGroups[0].status, "disabled");
  assert.equal(seedGroups[0].favorite, true);
  assert.equal(seedGroups[0].color, "#abcdef");
  assert.equal(seedGroups[0].sessions.length, 2);
  assert.deepEqual(seedGroups[0].sessions[0].prices, ["$210"]);
  assert.equal(seedGroups[0].sessions[1].venue, "乙館");
});

test("使用者自行建立的球隊與較新的本機資料會保留", () => {
  const seedGroups = [{
    id: "seeded",
    name: "內建球隊",
    importedAt: "2026-09-21",
    sessions: [{ weekday: 1, start: "19:00", end: "21:00", venue: "甲館" }],
  }];
  const storedGroups = [
    {
      id: "seeded",
      name: "本機修改名稱",
      importedAt: "2026-09-25",
      sessions: [{ weekday: 1, start: "20:00", end: "22:00", venue: "乙館" }],
    },
    {
      id: "custom",
      name: "自建球隊",
      sessions: [{ weekday: 5, start: "20:00", end: "22:00", venue: "丙館" }],
    },
  ];

  mergeStoredGroups(seedGroups, storedGroups);

  assert.equal(seedGroups[0].name, "本機修改名稱");
  assert.equal(seedGroups[0].sessions[0].venue, "乙館");
  assert.equal(seedGroups[1].name, "自建球隊");
});
