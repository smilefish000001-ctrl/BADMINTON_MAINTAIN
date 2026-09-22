import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readPort(value) {
  const port = Number(value ?? 3090);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT 必須是 0 到 65535 的整數");
  }
  return port;
}

export const config = Object.freeze({
  appName: process.env.APP_NAME?.trim() || "羽球活動表",
  env: process.env.NODE_ENV?.trim() || "development",
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: readPort(process.env.PORT),
  publicDir: path.join(projectRoot, "public"),
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(projectRoot, "data"),
});

