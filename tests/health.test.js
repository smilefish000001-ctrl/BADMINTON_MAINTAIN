import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";

async function withServer(run) {
  const server = http.createServer(createApp({
    config: {
      appName: "測試羽球活動表",
      adminUsername: "admin-test",
      adminPassword: "secret-test",
      env: "test",
      publicDir: fileURLToPath(new URL("../public", import.meta.url)),
    },
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("GET /api/health 回傳服務狀態", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.app, "測試羽球活動表");
    assert.equal(body.version, "1.1.4");
    assert.match(body.time, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("不存在的 API 回傳 404", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/not-found`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "API 不存在" });
  });
});

test("管理員登入、查詢工作階段及登出", async () => {
  await withServer(async (baseUrl) => {
    const guestResponse = await fetch(`${baseUrl}/api/session`);
    assert.deepEqual(await guestResponse.json(), { authenticated: false, user: null });

    const failedResponse = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin-test", password: "wrong" }),
    });
    assert.equal(failedResponse.status, 401);

    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin-test", password: "secret-test" }),
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

    const sessionResponse = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
    const session = await sessionResponse.json();
    assert.equal(session.authenticated, true);
    assert.equal(session.user.role, "admin");
    assert.equal(session.user.username, "admin-test");

    const logoutResponse = await fetch(`${baseUrl}/api/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(logoutResponse.status, 200);
    const endedSession = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
    assert.deepEqual(await endedSession.json(), { authenticated: false, user: null });
  });
});
