import assert from "node:assert/strict";
import test from "node:test";
import { canAccessView, createGuestUser, createSessionUser, roles } from "../public/account.js";

test("預設使用者是只能瀏覽整週活動的訪客", () => {
  const user = createGuestUser();

  assert.equal(user.role, "guest");
  assert.equal(user.roleLabel, "訪客");
  assert.deepEqual(user.permissions, ["week:view"]);
  assert.equal(canAccessView(user, "week"), true);
  assert.equal(canAccessView(user, "activities"), false);
  assert.equal(canAccessView(user, "groups"), false);
  assert.equal(canAccessView(user, "venues"), false);
});

test("系統管理員可查看所有畫面", () => {
  const user = createSessionUser({ username: "0000", displayName: "系統管理員", role: "admin" });

  assert.equal(user.roleLabel, "系統管理員");
  assert.deepEqual(user.permissions, ["*"]);
  assert.equal(roles.admin.description, "可查看及維護全部資料");
  assert.equal(canAccessView(user, "activities"), true);
  assert.equal(canAccessView(user, "groups"), true);
  assert.equal(canAccessView(user, "venues"), true);
});
