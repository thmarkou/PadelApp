import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { apiConfig, loadPadelEnv } from "./env.js";
import { HttpError } from "./http/errors.js";
import { authRouter } from "./routes/auth.js";
import { bookingsRouter } from "./routes/bookings.js";
import { courtsRouter } from "./routes/courts.js";
import { playersRouter } from "./routes/players.js";
import { settingsRouter } from "./routes/settings.js";
import { tournamentsRouter } from "./routes/tournaments.js";
import { applyMigrations } from "./db/migrate.js";

loadPadelEnv();

const app = express();
const config = apiConfig();

function corsOrigin(): boolean | string[] {
  const raw = process.env.PADELAPP_WEB_ORIGIN?.trim();
  if (!raw) {
    return true;
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

app.use(
  cors({
    origin: corsOrigin(),
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "padelapp-api" });
});

app.use(authRouter);
app.use(settingsRouter);
app.use(courtsRouter);
app.use(playersRouter);
app.use(bookingsRouter);
app.use(tournamentsRouter);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Μη έγκυρα δεδομένα",
        code: "invalid_data",
        details: error.flatten(),
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Εσωτερικό σφάλμα", code: "internal" });
  },
);

await applyMigrations();
app.listen(config.port, config.host, () => {
  console.log(`PadelApp API http://${config.host}:${config.port}`);
});
