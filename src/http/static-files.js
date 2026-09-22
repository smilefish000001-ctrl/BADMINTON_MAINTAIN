import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { sendJson } from "./response.js";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export async function serveStaticFile(req, res, url, publicDir) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(res, 400, { error: "網址格式錯誤" });
  }

  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const publicRoot = path.resolve(publicDir);
  let filePath = path.resolve(publicRoot, requested);

  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
    return sendJson(res, 403, { error: "禁止存取" });
  }

  try {
    if (!(await stat(filePath)).isFile()) throw new Error("not a file");
  } catch {
    filePath = path.join(publicRoot, "index.html");
  }

  try {
    const content = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-cache",
      ...SECURITY_HEADERS,
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    sendJson(res, 404, { error: "找不到檔案" });
  }
}
