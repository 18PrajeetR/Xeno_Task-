import { app } from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.API_PORT, () => {
  console.info(`Xeno CRM API listening on http://localhost:${config.API_PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
