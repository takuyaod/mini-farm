import express from "express";

// 開発用の短縮間隔（本番ESP32は shared/constants.ts の SEND_INTERVAL_MS = 10分）
const DEV_INTERVAL_MS = 5000;
const PORT = Number(process.env.PORT ?? 3001);
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://host.docker.internal:54321";
const DEVICE_API_KEY = process.env.DEVICE_API_KEY;
const USER_JWT_TOKEN = process.env.USER_JWT_TOKEN ?? "";

// USER_JWT_TOKEN が設定されている場合はそちらを優先する。
// 未設定の場合は DEVICE_API_KEY を使用する。
if (!USER_JWT_TOKEN && !DEVICE_API_KEY) {
  console.error("Either DEVICE_API_KEY or USER_JWT_TOKEN must be set. Copy .env.example to .env and set the value.");
  process.exit(1);
}

// 実際に Authorization ヘッダーに使用するトークン
const AUTH_TOKEN = USER_JWT_TOKEN || DEVICE_API_KEY!;

if (USER_JWT_TOKEN) {
  console.log("Using USER_JWT_TOKEN as Bearer token (login user mode).");
} else {
  console.log("Using DEVICE_API_KEY as Bearer token (device key mode).");
}

const BASE_VALUES = { ec: 1.5, ph: 6.5, water_temp: 22.0 };
const JITTER = { ec: 0.1, ph: 0.2, water_temp: 0.5 };

function jitter(base: number, range: number): number {
  return Math.round((base + (Math.random() * 2 - 1) * range) * 100) / 100;
}

function buildPayload(timestamp: string) {
  return {
    timestamp,
    idempotency_key: `emulator_${Date.now()}`,
    readings: [
      { sensor_type: "ec",         value: jitter(BASE_VALUES.ec,         JITTER.ec) },
      { sensor_type: "ph",         value: jitter(BASE_VALUES.ph,         JITTER.ph) },
      { sensor_type: "water_temp", value: jitter(BASE_VALUES.water_temp, JITTER.water_temp) },
    ],
  };
}

/** バッチ送信用ペイロードを生成する（count 件分のバッチを作成） */
function buildBatchPayload(count: number) {
  const now = Date.now();
  const batches = Array.from({ length: count }, (_, i) => {
    const batchTime = new Date(now - (count - 1 - i) * DEV_INTERVAL_MS).toISOString();
    return {
      timestamp: batchTime,
      idempotency_key: `emulator_batch_${now}_${i}`,
      readings: [
        { sensor_type: "ec",         value: jitter(BASE_VALUES.ec,         JITTER.ec) },
        { sensor_type: "ph",         value: jitter(BASE_VALUES.ph,         JITTER.ph) },
        { sensor_type: "water_temp", value: jitter(BASE_VALUES.water_temp, JITTER.water_temp) },
      ],
    };
  });
  return { batches };
}

async function postReading() {
  const timestamp = new Date().toISOString();
  const payload = buildPayload(timestamp);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/readings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`[${timestamp}] POST → ${res.status} ${body}`);
  } catch (err) {
    console.error(`[${timestamp}] POST → ERROR: ${(err as Error).message}`);
  }
}

/** バッチ送信テスト用: count 件分のデータを1リクエストでまとめて送信する */
async function postBatch(count: number) {
  const timestamp = new Date().toISOString();
  const payload = buildBatchPayload(count);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/readings-batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`[${timestamp}] POST batch(${count}) → ${res.status} ${body}`);
  } catch (err) {
    console.error(`[${timestamp}] POST batch → ERROR: ${(err as Error).message}`);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let state: "running" | "stopped" = "stopped";

function start() {
  if (state === "running") return;
  state = "running";
  // 起動直後に1回即時送信し、その後インターバル開始
  postReading();
  timer = setInterval(postReading, DEV_INTERVAL_MS);
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
  res.json({ status: state, interval_ms: DEV_INTERVAL_MS });
});

// バッチ送信テスト用エンドポイント（開発専用）
// count パラメータで送信バッチ数を指定（デフォルト: 3）
app.post("/start-batch", async (req, res) => {
  const rawCount = req.body?.count ?? 3;
  const count = Number(rawCount);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    res.status(400).json({ error: "count must be a positive integer (max 20)" });
    return;
  }
  await postBatch(count);
  res.json({ sent: count });
});

// 開発専用サービス。本番環境・外部ネットワークには公開しないこと
app.listen(PORT, () => {
  console.log(`Emulator listening on port ${PORT} (stopped)`);
});
