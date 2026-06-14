import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { errorHandler } from "./lib/http.js";
import { router } from "./routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN.split(","), credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp());
app.use("/api/v1", router);
app.use(errorHandler);
