import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  CRM_SERVICE_TOKEN: z.string().min(12).default("development-service-token"),
  CALLBACK_SECRET: z.string().min(12).default("development-callback-secret"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
});

const parsed = schema.parse(process.env);

export const config = {
  ...parsed,
  API_PORT: parsed.PORT ?? parsed.API_PORT,
};
