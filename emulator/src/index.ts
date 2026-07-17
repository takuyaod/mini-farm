import express from "express";

// 開発用の短縮間隔（本番ESP32は shared/constants.ts の SEND_INTERVAL_MS = 10分）
const DEV_INTERVAL_MS = 5000;
const PORT = Number(process.env.PORT ?? 3001);
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://host.docker.internal:54321";

// 開発用デフォルト擬似MAC（supabase/seed.sql の開発用 active デバイスと整合させる）
const DEFAULT_DEVICE_MAC = "AA:BB:CC:DD:EE:01";
const DEVICE_MAC = process.env.DEVICE_MAC ?? DEFAULT_DEVICE_MAC;

// enroll 送信時の firmware_ver（devices.firmware_ver は VARCHAR(20)。supabase/seed.sql の開発用デバイスと同じ値）
const EMULATOR_FIRMWARE_VER = "0.0.1";

console.log(`Using DEVICE_MAC=${DEVICE_MAC} (X-Device-MAC header mode, keyless enroll).`);

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

/** ステータスコードに応じて承認待ち・拒否の理由をログに出す（実機の挙動可視化用） */
function logAuthFailureIfAny(timestamp: string, status: number): void {
  if (status === 401) {
    console.warn(`[${timestamp}] Unauthorized (401): MAC ${DEVICE_MAC} is not enrolled. POST /start を実行して enroll してください。`);
  } else if (status === 403) {
    console.warn(`[${timestamp}] Forbidden (403): MAC ${DEVICE_MAC} is not active yet (pending承認待ち、revoked、またはゾーン未割当/非アクティブ)。ダッシュボードで承認してください。`);
  }
}

/** 実機ESP32の起動時挙動を模倣し、起動時に毎回 enroll する（無認証・冪等）。2xx のみ true を返す */
async function enroll(): Promise<boolean> {
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mac_address: DEVICE_MAC, firmware_ver: EMULATOR_FIRMWARE_VER }),
    });
    const bodyText = await res.text();
    console.log(`[${timestamp}] POST /enroll → ${res.status} ${bodyText}`);

    if (res.ok) {
      try {
        const parsed = JSON.parse(bodyText) as { status?: string };
        if (parsed.status === "pending") {
          console.warn(`[${timestamp}] Device ${DEVICE_MAC} is pending approval. ダッシュボードで承認するまで readings は 403 になります。`);
        } else if (parsed.status === "active") {
          console.log(`[${timestamp}] Device ${DEVICE_MAC} is active.`);
        }
      } catch {
        // レスポンスボディのパースに失敗しても、生ログは既に出力済みなので握りつぶす
      }
    } else {
      console.error(`[${timestamp}] enroll failed (${res.status}): ${bodyText}`);
    }

    return res.ok;
  } catch (err) {
    console.error(`[${timestamp}] POST /enroll → ERROR: ${(err as Error).message}`);
    return false;
  }
}

async function postReading() {
  const timestamp = new Date().toISOString();
  const payload = buildPayload(timestamp);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/readings`, {
      method: "POST",
      headers: {
        "X-Device-MAC": DEVICE_MAC,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`[${timestamp}] POST → ${res.status} ${body}`);
    logAuthFailureIfAny(timestamp, res.status);
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
        "X-Device-MAC": DEVICE_MAC,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`[${timestamp}] POST batch(${count}) → ${res.status} ${body}`);
    logAuthFailureIfAny(timestamp, res.status);
  } catch (err) {
    console.error(`[${timestamp}] POST batch → ERROR: ${(err as Error).message}`);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let state: "running" | "stopped" = "stopped";

/** enroll が成功（2xx）した場合のみ送信を開始する。失敗時は送信を開始しない */
async function start(): Promise<boolean> {
  if (state === "running") return true;

  const enrolled = await enroll();
  if (!enrolled) {
    console.error("[emulator] enroll failed. Not starting.");
    return false;
  }

  state = "running";
  // 起動直後に1回即時送信し、その後インターバル開始
  postReading();
  timer = setInterval(postReading, DEV_INTERVAL_MS);
  return true;
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

app.post("/start", async (_req, res) => {
  if (state === "running") {
    res.json({ status: state });
    return;
  }

  const started = await start();
  if (!started) {
    res.status(502).json({ status: state, message: "enroll failed" });
    return;
  }
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
