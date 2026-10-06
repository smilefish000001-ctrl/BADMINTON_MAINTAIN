import { config } from "./config.js";
import { createAuthService, readJsonBody } from "./auth.js";
import { sendJson } from "./http/response.js";
import { serveStaticFile } from "./http/static-files.js";

export const APP_VERSION = "1.1.3";

export function createApp(options = {}) {
  const appConfig = options.config ?? config;
  const auth = createAuthService({
    adminUsername: appConfig.adminUsername || "0000",
    adminPassword: appConfig.adminPassword || "0000",
    secureCookie: appConfig.env === "production",
  });

  return async function app(req, res) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          app: appConfig.appName,
          version: APP_VERSION,
          time: new Date().toISOString(),
        });
      }

      if (req.method === "GET" && url.pathname === "/api/session") {
        const user = auth.getUser(req.headers.cookie);
        return sendJson(res, 200, { authenticated: Boolean(user), user });
      }

      if (req.method === "POST" && url.pathname === "/api/login") {
        let body;
        try {
          body = await readJsonBody(req);
        } catch (error) {
          const status = error.message === "REQUEST_TOO_LARGE" ? 413 : 400;
          return sendJson(res, status, { error: "登入資料格式錯誤" });
        }
        const result = auth.login(body.username, body.password);
        if (!result) return sendJson(res, 401, { error: "帳號或密碼錯誤" });
        return sendJson(res, 200, { authenticated: true, user: result.user }, { "Set-Cookie": result.cookie });
      }

      if (req.method === "POST" && url.pathname === "/api/logout") {
        return sendJson(res, 200, { authenticated: false, user: null }, { "Set-Cookie": auth.logout(req.headers.cookie) });
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
