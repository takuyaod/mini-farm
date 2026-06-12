/**
 * mini-farm ESP32 ファームウェア
 *
 * ESPr Developer S3 Type-C (ESP32-S3-WROOM-1-N16R8) 向け
 *
 * ビルドマクロ（platformio.ini の build_flags で注入）:
 *   -D WIFI_SSID=\"your-ssid\"
 *   -D WIFI_PASSWORD=\"your-password\"
 *   -D API_KEY=\"your-api-key\"
 *   -D SUPABASE_URL=\"https://your-project.supabase.co\"
 *   -D SEND_INTERVAL_MS=600000
 *
 * 処理フロー:
 *   1. Wi-Fi 接続
 *   2. NTP 同期（失敗時は timestamp フィールドを省略）
 *   3. センサー値読み取り（MVP: ダミー値）
 *   4. JSON 生成 (ArduinoJson)
 *   5. HTTP POST → ${SUPABASE_URL}/functions/v1/readings-batch
 *   6. SEND_INTERVAL_MS 待機して繰り返す
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ---- ビルドマクロのデフォルト値（platformio.ini で上書きすること） --------
#ifndef WIFI_SSID
#  error "WIFI_SSID is not defined. Set it in platformio.ini build_flags."
#endif

#ifndef WIFI_PASSWORD
#  error "WIFI_PASSWORD is not defined. Set it in platformio.ini build_flags."
#endif

#ifndef API_KEY
#  error "API_KEY is not defined. Set it in platformio.ini build_flags."
#endif

#ifndef SUPABASE_URL
#  error "SUPABASE_URL is not defined. Set it in platformio.ini build_flags."
#endif

#ifndef SEND_INTERVAL_MS
#  define SEND_INTERVAL_MS 600000UL  // 10分（デフォルト）
#endif

// ---- 設定定数 ---------------------------------------------------------------
static const char* kWifiSsid       = WIFI_SSID;
static const char* kWifiPassword   = WIFI_PASSWORD;
static const char* kApiKey         = API_KEY;
static const char* kSupabaseUrl    = SUPABASE_URL;
static const unsigned long kSendIntervalMs = SEND_INTERVAL_MS;

// NTP 設定
static const char* kNtpServer1     = "pool.ntp.org";
static const char* kNtpServer2     = "time.google.com";
static const long  kGmtOffsetSec   = 0;       // UTC
static const int   kDaylightOffsetSec = 0;

// タイムアウト設定
static const unsigned long kWifiTimeoutMs = 30000UL;  // Wi-Fi 接続タイムアウト: 30秒
static const int           kHttpTimeoutMs = 10000;    // HTTP タイムアウト: 10秒
static const unsigned long kNtpTimeoutMs  = 10000UL;  // NTP 同期タイムアウト: 10秒

// Supabase ルート証明書（ISRG Root X1 / Let's Encrypt）
// openssl s_client -connect <project>.supabase.co:443 -showcerts で取得可能
static const char* kSupabaseRootCert = \
  "-----BEGIN CERTIFICATE-----\n"
  "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\n"
  "-----END CERTIFICATE-----\n";

// NTP 同期後の最小 UNIX タイムスタンプ（2020-01-01 00:00:00 UTC）
static const time_t kMinValidUnixTime = 1577836800L;

// ---- ヘルパー関数 -----------------------------------------------------------

/**
 * Wi-Fi に接続する。
 * 最大 kWifiTimeoutMs 待機し、接続できなかった場合は false を返す。
 */
bool connectWifi() {
  Serial.printf("[WiFi] SSID: %s に接続中...\n", kWifiSsid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(kWifiSsid, kWifiPassword);

  const unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startMs > kWifiTimeoutMs) {
      Serial.println("[WiFi] 接続タイムアウト");
      return false;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("[WiFi] 接続成功。IP: %s\n", WiFi.localIP().toString().c_str());
  return true;
}

/**
 * NTP で時刻を同期する。
 * 同期に成功し有効なタイムスタンプが取れた場合は true を返す。
 */
bool syncNtp() {
  Serial.println("[NTP] 時刻同期中...");
  configTime(kGmtOffsetSec, kDaylightOffsetSec, kNtpServer1, kNtpServer2);

  // 最大 kNtpTimeoutMs 待機
  const unsigned long startMs = millis();
  while (millis() - startMs < kNtpTimeoutMs) {
    time_t now = time(nullptr);
    if (now >= kMinValidUnixTime) {
      struct tm timeInfo;
      gmtime_r(&now, &timeInfo);
      char buf[32];
      strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
      Serial.printf("[NTP] 同期成功: %s\n", buf);
      return true;
    }
    delay(500);
  }
  Serial.println("[NTP] 同期失敗。timestamp フィールドを省略します");
  return false;
}

/**
 * 現在時刻を ISO 8601 形式（UTC）で buf に格納する。
 * NTP 同期済みであること（ntpSynced == true）を前提とする。
 */
void getTimestampISO8601(char* buf, size_t bufLen) {
  time_t now = time(nullptr);
  struct tm timeInfo;
  gmtime_r(&now, &timeInfo);
  strftime(buf, bufLen, "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
}

/**
 * idempotency_key を生成する。
 * フォーマット: device_<MACアドレス（コロン除去）>_<UNIXタイムスタンプ>
 * NTP 未同期時は millis() を代わりに使用する。
 */
void buildIdempotencyKey(char* buf, size_t bufLen, bool ntpSynced) {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[13];
  snprintf(macStr, sizeof(macStr), "%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  if (ntpSynced) {
    snprintf(buf, bufLen, "device_%s_%lu", macStr, (unsigned long)time(nullptr));
  } else {
    snprintf(buf, bufLen, "device_%s_ms%lu", macStr, millis());
  }
}

/**
 * センサー値を読み取る。
 * MVP: ダミー値を返す。実センサーを接続する場合はここを書き換える。
 */
struct SensorReadings {
  float ec;
  float ph;
  float waterTemp;
};

SensorReadings readSensors() {
  // MVP ダミー値
  // 実装時は ADC / I2C / UART などのセンサー読み取りに置き換える
  SensorReadings readings;
  readings.ec        = 1.8f;
  readings.ph        = 6.2f;
  readings.waterTemp = 22.5f;
  return readings;
}

/**
 * Edge Function にセンサーデータを HTTP POST する。
 * リクエストボディ形式:
 *   { "batches": [{ "timestamp": "...", "idempotency_key": "...", "readings": [...] }] }
 */
void postReadings(bool ntpSynced, const SensorReadings& sensors) {
  // JSON 構築
  // batches[0].readings に 3 要素 + オーバーヘッドで 512 バイト確保
  JsonDocument doc;
  JsonArray batches = doc["batches"].to<JsonArray>();
  JsonObject batch  = batches.add<JsonObject>();

  // timestamp（NTP 同期成功時のみ付与）
  if (ntpSynced) {
    char timestampBuf[32];
    getTimestampISO8601(timestampBuf, sizeof(timestampBuf));
    batch["timestamp"] = timestampBuf;
  }

  // idempotency_key
  char idempotencyKey[64];
  buildIdempotencyKey(idempotencyKey, sizeof(idempotencyKey), ntpSynced);
  batch["idempotency_key"] = idempotencyKey;

  // readings 配列
  JsonArray readings = batch["readings"].to<JsonArray>();

  JsonObject ecReading = readings.add<JsonObject>();
  ecReading["sensor_type"] = "ec";
  ecReading["value"]        = sensors.ec;

  JsonObject phReading = readings.add<JsonObject>();
  phReading["sensor_type"] = "ph";
  phReading["value"]        = sensors.ph;

  JsonObject tempReading = readings.add<JsonObject>();
  tempReading["sensor_type"] = "water_temp";
  tempReading["value"]        = sensors.waterTemp;

  // JSON をシリアライズ
  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.printf("[HTTP] POST %s/functions/v1/readings-batch\n", kSupabaseUrl);
  Serial.printf("[HTTP] Body: %s\n", jsonBody.c_str());

  // HTTP POST（WiFiClientSecure でサーバー証明書を検証）
  WiFiClientSecure wifiClient;
  wifiClient.setCACert(kSupabaseRootCert);

  HTTPClient http;
  char endpoint[384];
  snprintf(endpoint, sizeof(endpoint), "%s/functions/v1/readings-batch", kSupabaseUrl);

  http.begin(wifiClient, endpoint);
  http.setTimeout(kHttpTimeoutMs);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + kApiKey);

  int statusCode = http.POST(jsonBody);

  if (statusCode > 0) {
    Serial.printf("[HTTP] レスポンス: %d\n", statusCode);
#ifdef DEBUG
    String responseBody = http.getString();
    Serial.printf("[HTTP] レスポンスボディ: %s\n", responseBody.c_str());
#endif
  } else {
    Serial.printf("[HTTP] エラー: %s\n", http.errorToString(statusCode).c_str());
  }

  http.end();
}

// ---- Arduino エントリーポイント --------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== mini-farm ESP32 ファームウェア 起動 ===");
  Serial.printf("[Config] SUPABASE_URL: %s\n", kSupabaseUrl);
  Serial.printf("[Config] SEND_INTERVAL_MS: %lu\n", kSendIntervalMs);
}

void loop() {
  // Wi-Fi 接続（切断されている場合は再接続）
  if (WiFi.status() != WL_CONNECTED) {
    if (!connectWifi()) {
      Serial.printf("[Loop] Wi-Fi 接続失敗。%lu ms 後に再試行\n", kSendIntervalMs);
      delay(kSendIntervalMs);
      return;
    }
  }

  // NTP 同期（毎ループで試みる。高コストではないため許容）
  bool ntpSynced = syncNtp();

  // センサー読み取り
  SensorReadings sensors = readSensors();
  Serial.printf("[Sensor] EC=%.2f, pH=%.2f, 水温=%.2f\n",
                sensors.ec, sensors.ph, sensors.waterTemp);

  // データ送信
  postReadings(ntpSynced, sensors);

  // 次の送信まで待機
  Serial.printf("[Loop] %lu ms 後に次の送信\n", kSendIntervalMs);
  delay(kSendIntervalMs);
}
