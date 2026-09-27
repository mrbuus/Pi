# T14 cron тохиргоо

Cron ажил Render дээр нэмэлт үйлчилгээ үүсгэхгүй. API-д `CRON_SECRET` тохируулж, хүсэлт бүрт `X-Cron-Secret` header явуулна. Нууц байхгүй бол endpoint `503`, буруу бол `401` буцаана. Нууц утгыг репод бичихгүй; Render Environment болон GitHub Actions Secrets-д ижил хүчтэй random secret-ийг гараар нэмнэ. Render Blueprint-д `CRON_SECRET`-ийг `sync: false` гэж үлдээсэн.

GitHub Actions schedule (нийтийн репод үнэгүй) ашиглах бол дараах workflow-г эзэн `.github/workflows/pi-reminders.yml` нэрээр нэмнэ. Салбарын PR-д workflow файл нэмэхгүй.

```yaml
name: Pi.mn reminders
on:
  schedule:
    - cron: "0 1 * * *" # 09:00 Ulaanbaatar, өдөр тутмын сануулгууд
    - cron: "0 12 * * 0" # Ням 20:00 Ulaanbaatar, долоо хоногийн тайлан
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Daily reminders
        if: github.event_name == 'workflow_dispatch' || github.event.schedule == '0 1 * * *'
        env:
          API_URL: ${{ vars.PI_API_URL }}
          CRON_SECRET: ${{ secrets.PI_CRON_SECRET }}
        run: |
          for job in payment-due homework-due mistakes-review; do
            curl --fail-with-body --retry 2 --retry-delay 5 -X POST \
              -H "X-Cron-Secret: ${CRON_SECRET}" \
              "${API_URL}/api/jobs/run?name=${job}"
          done
      - name: Sunday parent report
        if: github.event_name == 'workflow_dispatch' || github.event.schedule == '0 12 * * 0'
        env:
          API_URL: ${{ vars.PI_API_URL }}
          CRON_SECRET: ${{ secrets.PI_CRON_SECRET }}
        run: |
          curl --fail-with-body --retry 2 --retry-delay 5 -X POST \
            -H "X-Cron-Secret: ${CRON_SECRET}" \
            "${API_URL}/api/jobs/run?name=parent-weekly"
```

`PI_API_URL`-ийг GitHub repository variable болгон API үндсэн URL-аар тохируулна. `PI_CRON_SECRET`-ийг Actions secret болгон, яг ижил утгаар Render-д оруулна. `workflow_dispatch` нь дөрвөн ажлыг нэг дор ажиллуулна; туршилтад зөвхөн synthetic дата ашиглана.

UptimeRobot-оор ажиллуулах бол HTTP(s) monitor-оо POST method, `/api/jobs/run?name=...` URL, `X-Cron-Secret` header-тай тохируул. Daily job бүрийг 09:00 UB-д, parent-weekly-г Ням 20:00 UB-д тус тус тохируул. API нь идэвхгүй үед Render free service-ийг сэрээх эхний хүсэлт удаан үргэлжилж болох тул timeout-ийг 60 секундээс багагүй тавина. UptimeRobot төлөвлөгөө POST/header дэмжихгүй бол GitHub Actions хувилбарыг сонго.

`JobRun` нэг ажлын нэрийг 10 минутын турш давхар эхлүүлэхгүй. Reminder key давтагдсан бол мэдээллийн төвд шинэ мэдэгдэл үүсгэхгүй. SMTP тохиргоогүй бол имэйл чимээгүй алгасна. SMTP тохируулагдсан үед систем илгээх оролдлогыг SMTP руу өгөхөөс өмнө тэмдэглэдэг тул timeout-ын дараа давхар имэйл үүсэхээс сэргийлнэ; ийм тодорхойгүй тасалдлыг NotificationDelivery-ийн `emailError`-оос хянаж, шаардлагатай бол эзэн шалгана. Эзэн мөн Dashboard → Environment дээр CRON_SECRET болон SMTP-г тусад нь тохируулна.

Эцэг эхийн тайлан Ням гарагт 20:00 цагт илгээгдэнэ. Энэ нь тухайн мөчийн snapshot тул Ням гарагийн сүүлийн дөрвөн цагийн үйл явдал тайланд орохгүй. Тайлангийн хуудсанд snapshot авсан цагийг харуулна.
