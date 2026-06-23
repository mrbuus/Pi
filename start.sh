#!/usr/bin/env bash
# ============================================================================
# Pi.mn-ийг нэг командаар асаах скрипт (хөгжүүлэлтийн орчин)
#
# Ажиллуулах:   ./start.sh
# Зогсоох:      Ctrl + C  (API ба web хоёулаа зэрэг зогсоно)
#
# Энэ скрипт 3 зүйлийг бэлдэнэ:
#   1. PostgreSQL (Homebrew) — асаалттай эсэхийг шалгаж, асаагаагүй бол асаана
#   2. API сервер  → http://localhost:3000
#   3. Web сервер  → http://localhost:3001
# ============================================================================

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▶ PostgreSQL шалгаж байна…"
if ! /opt/homebrew/opt/postgresql@16/bin/pg_isready >/dev/null 2>&1; then
  echo "  PostgreSQL асааж байна…"
  brew services start postgresql@16 >/dev/null
  sleep 3
fi
echo "  ✓ PostgreSQL бэлэн"

# API-г арын процессоор асаана
echo "▶ API сервер асааж байна (http://localhost:3000)…"
( cd "$ROOT/api" && npm run start:dev ) &
API_PID=$!

# Ctrl+C дармагц API-г ч хамт зогсооно
cleanup() {
  echo ""
  echo "■ Серверүүдийг зогсоож байна…"
  kill "$API_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# API бэлэн болтол хүлээнэ
echo "  API бэлэн болохыг хүлээж байна…"
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/api >/dev/null 2>&1; then
    echo "  ✓ API бэлэн"
    break
  fi
  sleep 2
done

# Web-ийг үндсэн процессоор асаана (логийг нь энд харна)
echo "▶ Web сервер асааж байна (http://localhost:3001)…"
echo ""
echo "  ➜ Браузераа нээгээд:  http://localhost:3001"
echo "  ➜ Зогсоохдоо:         Ctrl + C"
echo ""
cd "$ROOT/web" && npm run dev
