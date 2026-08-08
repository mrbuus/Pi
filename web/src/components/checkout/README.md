# Checkout — QPay төлбөрийн UI

Худалдан авагч (сурагч/эцэг эх) талын, QPay-ээр төлөх бэлэн UI хэсгүүд.
Бэкэнд дээр `POST /payments` болон `GET /payments/:id` бэлэн болмогц шууд
залгаж ажиллуулах боломжтой — доорх гэрээнээс (contract) өөрчлөгдвөл зөвхөн
`types.ts`-г шинэчилнэ.

## Файлууд

| Файл | Юу вэ |
|---|---|
| `types.ts` | Бэкэндтэй ярилцах бүх төрөл (`PaymentMethod`, `CreatePaymentResponse`, ...) |
| `PaymentMethodPicker.tsx` | QPay / Дансаар / Бэлнээр сонгох 3 (эсвэл 2) карт |
| `QpayCheckout.tsx` | Нэхэмжлэх үүсгээд, QR/deeplink харуулж, төлөв хянана |

## Хэрхэн залгах вэ

Худалдан авагчийн хуудсан дээр (жишээ нь `web/src/app/app/buyer/page.tsx`)
ердийн урсгал ингэж харагдана:

```tsx
"use client";

import { useState } from "react";
import PaymentMethodPicker from "@/components/checkout/PaymentMethodPicker";
import QpayCheckout from "@/components/checkout/QpayCheckout";
import type { PaymentMethod } from "@/components/checkout/types";

function Checkout() {
  const [method, setMethod] = useState<PaymentMethod>("QPAY");
  const [paying, setPaying] = useState(false); // "Төлөх" дарсны дараа QpayCheckout харуулах эсэх

  const amount = 300_000;
  const description = "10-р сарын сургалтын төлбөр";

  return (
    <div className="space-y-4">
      <PaymentMethodPicker value={method} onChange={setMethod} />

      {method === "QPAY" && paying && (
        <QpayCheckout
          amount={amount}
          description={description}
          onCancel={() => setPaying(false)}
          onConfirmed={() => {
            // жишээ нь: эрхийн жагсаалтыг дахин ачаалах, амжилтын мессеж харуулах
          }}
        />
      )}

      {method === "QPAY" && !paying && (
        <button onClick={() => setPaying(true)}>Үргэлжлүүлэх</button>
      )}

      {method !== "QPAY" && (
        // Дансаар/Бэлнээр бол одоо байгаа "мэдэгдэх" урсгалыг ашиглаж болно —
        // энэ сан зөвхөн QPay-ийн автомат хэсгийг хариуцна.
        <ExistingBankOrCashFlow method={method} amount={amount} description={description} />
      )}
    </div>
  );
}
```

`PaymentMethodPicker` нь зөвхөн сонголт харуулна — QPay сонгогдвол
`QpayCheckout`-ыг өөрөө нэхэмжлэх үүсгэхийг даалгана. Дансаар/бэлнээр бол
одоо байгаа энгийн "төлсөнөө мэдэгдэх" урсгалыг (жишээ нь `buyer/page.tsx`
дотор аль хэдийн байгаа шиг) ашиглаад л болно — тэдгээрт автомат
баталгаажилт байхгүй тул QR/poll хэрэггүй.

## `PaymentMethodPicker` props

| Prop | Төрөл | Тайлбар |
|---|---|---|
| `value` | `PaymentMethod` | Одоо сонгогдсон арга |
| `onChange` | `(m: PaymentMethod) => void` | Хэрэглэгч өөр арга дарахад дуудагдана |
| `hideCash?` | `boolean` | `true` бол "Бэлнээр" картыг нуух (жишээ нь: зөвхөн онлайн урсгалд) |
| `className?` | `string` | Гаднаас нэмэлт class |

## `QpayCheckout` props

| Prop | Төрөл | Заавал уу | Тайлбар |
|---|---|---|---|
| `amount` | `number` | ✓ | Төгрөгөөр, бүхэл тоо |
| `description` | `string` | ✓ | Гүйлгээний тайлбар — нэхэмжлэлд бичигдэнэ |
| `forMonth?` | `string` | | Сарын төлбөрийн хувьд аль сарынх болохыг илгээнэ (жишээ: `"2026-10"`) |
| `auth?` | `boolean` | | API дуудлагад Bearer токен хавсаргах эсэх (өгөгдмөл: `true`) |
| `onConfirmed?` | `(p: PaymentDetails) => void` | | Төлбөр `CONFIRMED` боллоо гэдгийг мэдээд, эрх/жагсаалтаа дахин ачаалахад ашиглана |
| `onCancel?` | `() => void` | | Байвал дээд буланд "← Буцах" товч гарч, хэрэглэгч өөр арга сонгож чадна |
| `className?` | `string` | | Гаднаас нэмэлт class |

`QpayCheckout` бэлэн болмогц **өөрөө** `POST /payments`
(`method: "QPAY"`) дуудаж нэхэмжлэх үүсгэнэ — эцэг компонент нэхэмжлэх
урьдчилан үүсгэх шаардлагагүй.

## Дотоод ажиллагаа (мэдэж байвал зохих зүйлс)

- **Банкны лого**: Гадаад URL-ээс лого татахгүй (интернэт удаан үед UI эвдэрнэ).
  Оронд нь `lib.ts`-ийн `getBankColor()` + `getBankInitials()` функцаар
  өнгөлөг дугуй товчлол үүсгэнэ. Өнгө = банкны нэрийн FNV-1a hash,
  эхний 1-2 үсэг = текст дотор.
- **Утас vs компьютер**: QR болон банкны deeplink товчнуудыг ХАМТ нэг DOM
  дараалалд (эхлээд deeplink, дараа нь QR) байрлуулаад, `flex flex-col
  gap-5 md:flex-col-reverse` ангиар ашиглан жижиг дэлгэц дээр
  deeplink-үүд эхэнд, `md:` цэгээс дээш (720px+) QR эхэнд харагдахаар
  эргүүлдэг. Дэлгэцийн уншигчид DOM дараалал (deeplink → QR) хэвээр
  унших тул мобайл хэрэглэгчид зөв дараалал хэвээр байна.
- **Poll стратеги**: эхний 60 секундэд 5 секунд тутам, дараа нь ч 5 секунд
  тутам шалгана; нийт 5 минутын дараа автоматаар зогсоод "Шалгах" гар
  товч гарна. `setTimeout`-ийн гинжин дуудлагаар хийгдсэн (`setInterval`
  биш) — тиймээс интервалыг цаг хугацааны явцад өөрчлөх боломжтой, мөн
  unmount дээр `useEffect` cleanup-аар цэвэрхэн зогсдог.
- **Хуудас нуугдсан үед polling**: `document.hidden` шалгаж, хуудас нуугдсан
  үед timer зогсож, буцаж нээгдээд үргэлжлүүлнэ (мобайл төхөөрөмжийн
  батарей хэмнэлт).
- **Холболтын асуудал**: `window.online/offline` үйл явдлаар холболтын
  статусыг хэмжээд, сүлжээ таслагдвал `pending-offline` төлөвт орно.
  Хэрэглэгчид "төлбөр алдагдсаны санаа" санаж байна гэхэд, "холболт
  сэргэхэд автоматаар баталгаажуулна" гэхээр анхааруулна.
- **Секьюрити**: `qpay.invoiceId`, `payment.id` хэзээ ч URL/query
  параметрт бичигдэхгүй — зөвхөн component state дотор л байна. Ямар ч
  нууц (secret/token) UI дээр рендерлэгддэггүй, лог руу бичигддэггүй.
- **Аюулгүй байдал (a11y)**: төлөвийн текст `aria-live="polite"`
  бүхий `role="status"` элементэд бичигдэж, дэлгэцийн уншигч төлөв
  солигдох бүрт дуугардаг. Төлөв бүр өнгөнөөс гадна тусдаа дүрс + текст
  хослуулж илэрхийлэгддэг.

## Дараа нь хэн юу хийх ёстой

- Бэкэнд багийн `POST /payments`-ийн хариу `qpay` талбарыг яг гэрээний
  дагуу буцаах ёстой (`types.ts`-ийн `QpayInvoiceInfo` харна уу).
- `GET /payments/:id`-г ямар ч давхардал/rate-limit асуудалгүйгээр олон
  удаа дуудаж болохоор хийх ёстой (энэ сан 3с→10с гэж аяндаа удаашруулдаг
  ч, бэкэнд талдаа ч rate-limit-той байвал сайн).
- Дансаар/бэлнээр төлөх урсгалыг (гараар баталгаажуулах) энэ сан
  хамарахгүй — тэр хэсгийг buyer хуудсыг эзэмшигч тал өөрөө удирдана.
