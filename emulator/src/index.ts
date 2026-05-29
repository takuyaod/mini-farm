import express from "express";

// 開発用の短縮間隔（本番ESP32は shared/constants.ts の SEND_INTERVAL_MS = 10分）
const INTERVAL_MS = 5000;
const PORT = Number(process.env.PORT ?? 3001);
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://host.docker.internal:54321";
const DEVICE_API_KEY = process.env.DEVICE_API_KEY ?? "dev-api-key-001";

const BASE_VALUES = { ec: 1.5, ph: 6.5, water_temp: 22.0 };
const JITTER = { ec: 0.1, ph: 0.2, water_temp: 0.5 };

function jitter(base: number, range: number): number {
  return Math.round((base + (Math.random() * 2 - 1) * range) * 100) / 100;
}

function buildPayload() {
  return {
    ec: jitter(BASE_VALUES.ec, JITTER.ec),
    ph: jitter(BASE_VALUES.ph, JITTER.ph),
    water_temp: jitter(BASE_VALUES.water_temp, JITTER.water_temp),
  };
}

async function postReading() {
  const payload = buildPayload();
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/readings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEVICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    console.log(`[${timestamp}] POST → ${res.status}`);
  } catch (err) {
    console.error(`[${timestamp}] POST → ERROR: ${(err as Error).message}`);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let state: "running" | "stopped" = "stopped";

function start() {
  if (state === "running") return;
  state = "running";
  postReading();
  timer = setInterval(postReading, INTERVAL_MS);
}

function stop() {
  if (state === "stopped") return;
  state = "stopped";
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

const app = express();
app.use(express.json());

app.post("/start", (_req, res) => {
  start();
  res.json({ status: state });
});

app.post("/stop", (_req, res) => {
  stop();
  res.json({ status: state });
});

app.get("/status", (_req, res) => {
  res.json({ status: state, interval_ms: INTERVAL_MS });
});

// 開発専用サービス。本番環境・外部ネットワークには公開しないこと
app.listen(PORT, () => {
  console.log(`Emulator listening on port ${PORT} (stopped)`);
});
