import { config } from "./config.js";
import { sendJson } from "./http/response.js";
import { serveStaticFile } from "./http/static-files.js";

export function createApp(options = {}) {
  const appConfig = options.config ?? config;

  return async function app(req, res) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          app: appConfig.appName,
          version: process.env.npm_package_version || "0.1.0",
          time: new Date().toISOString(),
        });
      }

      if (url.pathname.startsWith("/api/")) {
        return sendJson(res, 404, { error: "API 不存在" });
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        return sendJson(res, 405, { error: "不支援此請求方法" }, { Allow: "GET, HEAD" });
      }

      return await serveStaticFile(req, res, url, appConfig.publicDir);
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: "伺服器處理失敗" });
    }
  };
}

