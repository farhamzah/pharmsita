import { createServer } from "node:http";
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

const server = createServer((req, res) => {
  void app.handle(req, res);
});

server.listen(config.port, () => {
  console.log(`PharmSITA API listening on http://localhost:${config.port}${config.apiPrefix}`);
});
