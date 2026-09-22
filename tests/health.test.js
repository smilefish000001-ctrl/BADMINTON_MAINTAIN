import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";

async function withServer(run) {
  const server = http.createServer(createApp({
    config: {
      appName: "測試羽球活動表",
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
    assert.equal(body.version, "1.0.0");
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
