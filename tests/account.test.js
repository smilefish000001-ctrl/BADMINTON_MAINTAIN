import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentUser, roles } from "../public/account.js";

test("預設登入帳號是最高權限管理員", () => {
  const user = getCurrentUser();

  assert.equal(user.username, "0000");
  assert.equal(user.role, "admin");
  assert.equal(user.roleLabel, "管理員");
  assert.deepEqual(user.permissions, ["*"]);
  assert.equal(roles.admin.description, "最高權限");
});
