#!/usr/bin/env bash
# Pi.mn мокапуудыг асааж, хөтчид нээнэ.
#   bash serve.sh            -> нүүр хуудас (home/)
#   bash serve.sh home/v1.html -> өөр хуудас
cd "$(dirname "$0")" || exit 1
PORT=8792
PAGE="${1:-home/}"

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >/tmp/pimn-mockup.log 2>&1 &
  sleep 1
fi

open "http://localhost:$PORT/$PAGE"
echo "Компьютер: http://localhost:$PORT/$PAGE"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
[ -n "$IP" ] && echo "Утас (нэг Wi-Fi): http://$IP:$PORT/$PAGE"
echo "Унтраах: kill \$(lsof -t -iTCP:$PORT -sTCP:LISTEN)"
