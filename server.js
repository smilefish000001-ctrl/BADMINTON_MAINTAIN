import http from "node:http";
import { createApp } from "./src/app.js";
import { config } from "./src/config.js";

const server = http.createServer(createApp());

server.listen(config.port, config.host, () => {
  console.log(`${config.appName} 已啟動：http://127.0.0.1:${server.address().port}`);
});

function shutdown(signal) {
  console.log(`收到 ${signal}，正在關閉服務...`);
  server.close((error) => {
    if (error) {
      console.error("關閉服務失敗", error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

