# Gateways модуль — QPay v2 (бодит) + DigiPay (хараахан не)

Энэ модуль `PaymentGateway` нэртэй провайдер-агностик интерфэйс дээр
суурилсан төлбөрийн гарцуудыг агуулна:

- `qpay.service.ts` — бодит QPay v2 интеграц (developer.qpay.mn баримт
  бичигт үндэслэсэн).
- `digipay.service.ts` — албан ёсны API баримт бичиг олдоогүй тул
  ХЭРЭГЖЭЭГҮЙ (NOT IMPLEMENTED) адаптер. Доор дэлгэрэнгүй.
- `gateways.controller.ts` — `GET /gateways/status` (ADMIN) болон
  `POST /gateways/qpay/callback` (нээлттэй, QPay-ээс дуудагдана).
- `gateway.types.ts` — нийтлэг интерфэйс.

Энэ модуль `app.module.ts`-д бүртгэгдсэн (`GatewaysModule` импортлогдож,
`imports` жагсаалтад орсон) бөгөөд `payments` модуль
`forwardRef(() => GatewaysModule)`-ээр `QpayService`-ийг импортлон QPAY
төлбөр үүсэхэд ашигладаг.

## 1. Орчны хувьсагчид (.env)

```bash
# Sandbox:    https://merchant-sandbox.qpay.mn
# Production: https://merchant.qpay.mn
QPAY_BASE_URL="https://merchant-sandbox.qpay.mn"
QPAY_CLIENT_ID="..."
QPAY_CLIENT_SECRET="..."
QPAY_INVOICE_CODE="..."          # QPay-с олгосон invoice_code
QPAY_CALLBACK_URL="https://api.pi.mn/gateways/qpay/callback"

# Заавал биш — /v2/auth/token хариунд expires_in ирэхгүй тохиолдолд
# ашиглах fallback TTL (секундээр). Анхны утга: 3600.
QPAY_TOKEN_TTL_FALLBACK_SECONDS=3600
```

Эдгээрийн аль нэг нь дутвал `QpayService.isConfigured()` `false` буцаана,
`createInvoice`/`checkPayment` дуудагдвал Монгол хэлээр тодорхой алдаа
шидэгдэнэ — **аппликейшн асахад огт нөлөөлөхгүй** (санаатайгаар боот-г
блоклохгүй байхаар зохион байгуулсан).

## 2. Sandbox vs Production

- Sandbox дээр туршихдаа `QPAY_BASE_URL`-г
  `https://merchant-sandbox.qpay.mn` болгож, QPay-с олгосон sandbox
  `client_id`/`client_secret`/`invoice_code` ашиглана.
- Production-д шилжихдээ зөвхөн эдгээр 5 орчны хувьсагчийг сольж өгнө —
  кодод ямар ч base URL хатуу бичээгүй.

## 3. Callback-г локал дээр туршиж үзэх

QPay сервэр таны локал машин руу шууд хүрч чадахгүй тул tunnel хэрэгтэй:

```bash
# жишээ нь ngrok, cloudflared, эсвэл ижил төстэй хэрэгсэл
ngrok http 3000
```

Гарсан нийтийн URL-г (жишээ нь `https://xxxx.ngrok-free.app`) ашиглан:

1. `QPAY_CALLBACK_URL="https://xxxx.ngrok-free.app/gateways/qpay/callback"`
   болгож `.env`-д тохируулна (invoice үүсгэхээс ӨМНӨ өөрчилсөн байх
   ёстой, учир нь callback_url нь invoice бүрт бичигдэнэ).
2. QPay Merchant дашбоард дээрх мерчант тохиргоонд энэ callback domain-г
   whitelist хийлгэх шаардлагатай байж болно (QPay-тэй гэрээ хийхдээ
   асууна уу — энэ бол QPay талын мерчант тохиргоо, кодоор шийдэгдэхгүй).
3. Invoice үүсгээд (`QpayService.createInvoice`) sandbox апп/QR-аар
   төлбөр хийхэд QPay callback-г tunnel-ээр дамжуулан локал руу илгээнэ.
4. Лог дээр `QPay callback боловсрууллаа: ...` мөрийг харна.

## 4. QPay-д whitelist хийлгэх зүйлс

- Callback URL (эцсийн production domain, `/gateways/qpay/callback`).
- Мерчантын `invoice_receiver_code`-той холбоотой тохиргоо (хэрэв QPay
  талаас тодорхой код шаардвал).

## 5. Баталгаажуулах ёстой зүйлс (sandbox холбогдмогц)

Task-ийн даалгаварт QPay v2-ийн зөвхөн дараах зүйлс **баталгаажсан** гэж
өгөгдсөн:

- `/v2/auth/token` → Basic auth → `access_token` + `refresh_token`
- `/v2/auth/refresh` → refresh_token-оор сэргээнэ
- `/v2/invoice` → хариунд `invoice_id`, `qr_text`, `qr_image`, банкны
  deeplink URL-ууд байна
- `/v2/payment/check` → төлбөрийн статус + гүйлгээний дэлгэрэнгүй

Эдгээрээс **давсан** нарийн талбарын нэрс (жишээ нь `urls[].link`,
`rows[].payment_status`, `paid_amount`) нь `qpay.service.ts`-д нийтлэг
баримтжуулалтад тулгуурласан **таамаглал** тул код дотор тодорхой комментоор
тэмдэглэсэн байгаа. **Sandbox-той анх удаа бодитоор холбогдоход эдгээр
talбарын нэрийг бодит хариутай тулгаж баталгаажуулж/засварлана уу.**

## 6. DigiPay — нээлттэй асуултууд

Монголын "DigiPay" төлбөрийн системийн албан ёсны нийтийн API баримт
бичиг хайхад олдсонгүй. Хайлтад гарч ирсэн `digipay.guru` нь олон улсын,
холбоогүй white-label платформ; `digipay.my` нь Малайзын үйлчилгээ — аль
нь ч энэ context-ийн Монголын DigiPay биш. Тиймээс `digipay.service.ts`
нь зөвхөн `PaymentGateway` интерфэйсийг хэрэгжүүлсэн, дуудагдах бүрдээ
"DigiPay-ийн API мэдээлэл хараахан тодорхойгүй байна" гэсэн алдаа шиддэг
**NOT-IMPLEMENTED** адаптер юм.

Бодит интеграц хийхийн тулд DigiPay-ээс (эсвэл тэдэнтэй гэрээ хийсэн
хэлтсээс) дараах мэдээллийг авах шаардлагатай:

- Sandbox болон production base URL
- Нэвтрэлтийн схем (API key? OAuth2? HMAC signature?)
- Invoice/захиалга үүсгэх endpoint болон хүсэлт/хариуны бүтэц
- Callback/webhook-ийн бүтэц, баталгаажуулах арга (signature header гэх мэт)
- Гүйлгээ шалгах (verify/check) endpoint
- Мерчант credential-үүд (client id/secret эсвэл ижил төстэй)

Эдгээр мэдээлэл гарт ирмэгц `digipay.service.ts`-г `qpay.service.ts`-тэй
адил хэв маягаар (env-based config, token кэш хэрэгтэй бол, timeout,
логгинг) бичиж болно.

## 7. Одоогийн байдал

`GatewaysModule` нь `app.module.ts`-д бүртгэгдсэн, `payments` модуль
`forwardRef(() => GatewaysModule)`-ээр `QpayService`-ийг ашигладаг тул
энэ талаар нэмэлт өөрчлөлт шаардлагагүй. Үлдсэн ажлууд: §5-д дурдсан
sandbox талбарын нэр баталгаажуулалт, болон §6-д дурдсан DigiPay-ийн
API мэдээлэл авах ажил.
