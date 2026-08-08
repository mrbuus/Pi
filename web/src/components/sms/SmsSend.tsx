"use client";

import { useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/Button";

const CYRILLIC_CHARS_PER_PART = 70;
const LATIN_CHARS_PER_PART = 160;

interface SendRequest {
  to: string[];
  text: string;
  templateId?: string;
}

export function SmsSend() {
  const [tab, setTab] = useState<"manual" | "bulk">("manual");
  const [recipients, setRecipients] = useState<string>("");
  const [text, setText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Текстийн урт хянах
  const isCyrillic = /[ёъэюяаблвгдзийкмнопрстуфхцчшщ]/i.test(text);
  const charsPerPart = isCyrillic ? CYRILLIC_CHARS_PER_PART : LATIN_CHARS_PER_PART;
  const partCount = text ? Math.ceil(text.length / charsPerPart) : 0;
  const remainingChars = partCount > 0 ? charsPerPart * partCount - text.length : 0;

  const recipientList = recipients
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  const recipientCount = recipientList.length;
  const messageCount = recipientCount * partCount;
  const estimatedCostPerMessage = isCyrillic ? 10 : 5; // Ойролцоо үнэ төгрөгөөр
  const estimatedCost = messageCount * estimatedCostPerMessage;

  const handleSend = async () => {
    if (!text || recipientCount === 0) {
      setError("Текст болон хүлээн авагч сонгоно уу");
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Нэг хүлээн авагч → /sms/send, олон → /sms/bulk (ноорог үүсгээд эхлүүлнэ).
      // ⚠️ Талбарын нэр сервертэй таарна: `phone` / `phones` (`to` БИШ).
      if (recipientList.length === 1) {
        await api("/sms/send", {
          method: "POST",
          body: { phone: recipientList[0], text, kind: "MANUAL" },
        });
      } else {
        const batch = await api<{ id: string }>("/sms/bulk", {
          method: "POST",
          body: { phones: recipientList, text, kind: "MANUAL" },
        });
        await api(`/sms/bulk/${batch.id}/start`, { method: "POST" });
      }

      // Амжилттай
      setText("");
      setRecipients("");
      setSelectedTemplate("");
      setShowConfirm(false);
      alert("SMS амжилттай илгээлээ!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Хүлээн авагч */}
      <Card>
        <SectionHeader title="Хүлээн авагчид" />
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-ink">Утасны дугаар эсвэл класс</label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="+976 XXXXXXXX, +976 YYYYYYYYY"
              className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              rows={4}
            />
            <p className="mt-1 text-xs text-ink-dim">
              Утасны дугаарыг таслалаар тусгаарлана. Класс сонгох шанс байхгүй (API байхгүй) — мөнгөний үнэ
              төлбөрт орно.
            </p>
          </div>
          {recipientCount > 0 && (
            <div className="flex items-baseline justify-between rounded-lg bg-brand/5 px-3 py-2">
              <span className="text-sm text-ink-dim">Хүлээн авагчидын тоо:</span>
              <span className="font-bold text-brand">{recipientCount}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Текст */}
      <Card>
        <SectionHeader
          title="Мессежийн агуулга"
          hint={
            <InfoHint>
              Кириллицын үсэгт нэг хэсэг нь {CYRILLIC_CHARS_PER_PART} тэмдэгт, латинаар {LATIN_CHARS_PER_PART}{" "}
              тэмдэгт хүртэл байна. Дээрх хэсгүүд нь тусдаа SMS болж явна.
            </InfoHint>
          }
        />
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Мессежийн текст эсвэл {{name}} гэх маягийн орлуулагч"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            rows={5}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-info/5 px-3 py-2">
            <Meta
              items={[
                `Урт: ${text.length} тэмдэгт`,
                `Хэсэг: ${partCount}`,
                `Үлдсэн: ${remainingChars}`,
              ]}
              className="text-sm text-ink-dim"
            />
            {partCount > 1 && <span className="text-xs text-brand-soft">Олон хэсэг SMS</span>}
          </div>
        </div>
      </Card>

      {/* Баталгаажуулах цонх */}
      {showConfirm && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              <div>
                <h4 className="font-bold text-warning">SMS явуулахаас өмнө баталгаажуулна уу</h4>
                <p className="mt-1 text-sm text-ink">
                  <strong>{recipientCount}</strong> хүнд, <strong>{messageCount}</strong> мессеж (
                  <strong>{partCount}</strong> хэсэгт) явуулах болно. Ойролцоо өртөг:{" "}
                  <strong className="font-mono">₮{estimatedCost.toLocaleString("mn-MN")}</strong>.
                </p>
                <p className="mt-2 text-xs text-ink-dim">SMS-г БУЦААХ БОЛОМЖ БАЙХГҮЙ. Анхаарлаар.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                disabled={sending}
                onClick={handleSend}
              >
                {sending ? "Явуулаж байна…" : "Баталгаажуулж явуулах"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={sending}
                onClick={() => setShowConfirm(false)}
              >
                Болих
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Алдаа */}
      {error && <ErrorState message={error} />}

      {/* Явуулах товч */}
      {!showConfirm && recipientCount > 0 && partCount > 0 && (
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => setShowConfirm(true)}
            disabled={!recipientCount || !partCount}
          >
            <Send className="h-4 w-4" aria-hidden />
            Баталгаажуулахаар явуулах ({messageCount} мессеж)
          </Button>
        </div>
      )}
    </div>
  );
}
