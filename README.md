# mini-farm

ESP32センサーデータをSupabaseに送信し、Next.jsダッシュボードでリアルタイム監視する農園モニタリングシステム。

## 起動手順

DevContainerを開くだけで全サービスが自動起動します（`postStartCommand`で`supabase start && docker compose up -d`が実行されます）。

### 前提条件

- Docker Desktop がホストにインストールされていること
- VS Code + Dev Containers 拡張機能

### 手順

1. リポジトリをクローン
2. VS Code でフォルダを開く
3. 「Reopen in Container」を選択
4. 自動で全サービスが起動するまで待つ

### エミュレータの操作

エミュレータは起動時に停止状態で待機します。送信を開始・停止するには以下を使います。

```bash
# 送信開始
curl -X POST http://localhost:3001/start

# 送信停止
curl -X POST http://localhost:3001/stop

# 状態確認
curl http://localhost:3001/status
```

## ポート一覧

| ポート | サービス |
|--------|----------|
| 3000   | Next.js ダッシュボード |
| 3001   | ESP32 エミュレータ API |
| 54321  | Supabase API |
| 54323  | Supabase Studio |
