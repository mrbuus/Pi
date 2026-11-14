#!/bin/bash
# Серверийн аюулгүй байдлын засвар (2026-11-05 аудит #6, #13, #14). ЭЗНИЙ ЗӨВШӨӨРЛӨӨР л ажиллуулна.
# Ажиллуулах: ssh pimath 'bash -s' < ops/harden-server-2026-11-05.sh
# Давтан ажиллуулахад аюулгүй. Өмнөх тохиргооны нөөцийг /etc/nginx/nginx.conf.bak-<огноо>-д хадгална.
# Хэрэглэгчид мэдэгдэхгүй: nginx «reload» нь холболтыг таслахгүй; pm2 restart нь 1–3 секунд.
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
CONF=/etc/nginx/nginx.conf

sudo cp "$CONF" "$CONF.bak-$STAMP"

# #13 Server толгойд nginx-ийн хувилбар харуулахгүй
sudo sed -i 's/^\(\s*\)# server_tokens off;/\1server_tokens off;/' "$CONF"

# #13 Хуучирсан TLSv1, TLSv1.1-ийг хасна (сертификатын server блок аль хэдийн 1.2/1.3)
sudo sed -i 's/ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;/ssl_protocols TLSv1.2 TLSv1.3;/' "$CONF"

# #6 Хандалтын логт query string (?token=JWT) бичихгүй — зөвхөн зам ($uri)
if ! grep -q "log_format noquery" "$CONF"; then
  sudo sed -i 's#^\(\s*\)access_log /var/log/nginx/access.log;#\1log_format noquery '"'"'$remote_addr - $remote_user [$time_local] "$request_method $uri $server_protocol" $status $body_bytes_sent "$http_referer" "$http_user_agent"'"'"';\n\1access_log /var/log/nginx/access.log noquery;#' "$CONF"
fi

if ! sudo nginx -t; then
  echo "nginx -t АМЖИЛТГҮЙ — нөөцөөс сэргээж байна"
  sudo cp "$CONF.bak-$STAMP" "$CONF"
  exit 1
fi
sudo systemctl reload nginx
echo "nginx OK"

# #14 API, вэбийг зөвхөн localhost-д сонсгох (nginx-ээр л хандана)
cd ~/pimath
if ! grep -q "^HOST=" api/.env; then
  cp api/.env "api/.env.bak-$STAMP"
  echo "HOST=127.0.0.1" >> api/.env
fi
pm2 restart pimath-api --update-env
# Вэб: next start -H 127.0.0.1
if ! pm2 jlist | grep -q -- "-H 127.0.0.1"; then
  pm2 delete pimath-web
  (cd web && pm2 start bash --name pimath-web -- -c "npx next start -p 3381 -H 127.0.0.1")
  pm2 save
fi
sleep 5
curl -s -o /dev/null -w "pimath.mn %{http_code}\n" https://pimath.mn
curl -s -o /dev/null -w "api 401 хүлээгдэнэ: %{http_code}\n" https://pimath.mn/api/users/x
curl -sI https://pimath.mn | grep -i "^server:" || true
ss -ltnp 2>/dev/null | grep -E ":3380|:3381"
echo "Дууслаа. Хуучин access.log-д токен үлдсэн байж магадгүй — эзэн шийдвэрлэнэ (устгах эсэх)."
