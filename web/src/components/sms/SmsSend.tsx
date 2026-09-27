"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calculator, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { api, getRole } from "@/lib/api";
import { previewSmsSegments } from "./segments";
import { Meta } from "@/components/ui/Meta";

interface TemplateOption { id: string; name: string; body: string; kind: string }
interface BulkBody { phones: string[]; text: string }
interface BulkEstimate {
  recipientCount: number;
  deduplicatedCount: number;
  excludedArchivedCount?: number;
  estimatedSegments: number;
  estimatedCost: number;
}
interface BulkDraft { batchId: string; estimate: BulkEstimate; messageIds: string[] }

function parsePhones(value: string): string[] {
  return value.split(/[\s,;]+/).map((phone) => phone.trim()).filter(Boolean);
}

export function SmsSend() {
  const [recipients, setRecipients] = useState("");
  const [text, setText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<BulkEstimate | null>(null);
  const [estimateKey, setEstimateKey] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const isAdmin = getRole() === "ADMIN";

  const phones = useMemo(() => parsePhones(recipients), [recipients]);
  const body: BulkBody = useMemo(() => ({ phones, text }), [phones, text]);
  const requestKey = useMemo(() => JSON.stringify(body), [body]);
  const preview = previewSmsSegments(text);
  const isBulk = phones.length > 1;
  const estimateIsCurrent = Boolean(estimate && estimateKey === requestKey);

  useEffect(() => {
    let active = true;
    api<TemplateOption[]>("/sms/templates")
      .then((rows) => { if (active) setTemplates(rows); })
      .catch((err) => { if (active) setTemplateError(err instanceof Error ? err.message : "Загвар ачаалж чадсангүй."); });
    return () => { active = false; };
  }, []);

  function changeInput(change: () => void) {
    change();
    setEstimate(null);
    setEstimateKey("");
    setAcknowledged(false);
    setError(null);
    setSuccess(null);
    setPendingBatchId(null);
  }

  async function getEstimate() {
    if (!isAdmin || !isBulk || !text.trim()) return;
    setEstimating(true);
    setError(null);
    setSuccess(null);
    setPendingBatchId(null);
    setAcknowledged(false);
    try {
      // This exact body is also sent to POST /sms/bulk after confirmation.
      const result = await api<BulkEstimate>("/sms/bulk/estimate", { method: "POST", body });
      setEstimate(result);
      setEstimateKey(requestKey);
    } catch (err) {
      setEstimate(null);
      setEstimateKey("");
      setError(err instanceof Error ? err.message : "Өртгийн тооцоо авч чадсангүй.");
    } finally {
      setEstimating(false);
    }
  }

  async function sendSingle() {
    const phone = phones[0];
    if (!isAdmin || !phone || !text.trim() || !acknowledged) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api<{ messageId: string; segments: number }>("/sms/send", {
        method: "POST", body: { phone, text },
      });
      setSuccess(`Мессеж илгээгдлээ. ${result.segments} SMS хэсэг.`);
      setText("");
      setRecipients("");
      setSelectedTemplate("");
      setAcknowledged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Мессеж илгээж чадсангүй.");
    } finally {
      setSending(false);
    }
  }

  async function createAndStartBatch() {
    if (!isAdmin || !estimateIsCurrent || !acknowledged || sending) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      let batchId = pendingBatchId;
      if (!batchId) {
        const draft = await api<BulkDraft>("/sms/bulk", { method: "POST", body });
        batchId = draft.batchId;
        setPendingBatchId(batchId);
      }
      const result = await api<{ batchId: string; status: string; queued: number }>(`/sms/bulk/${batchId}/start`, { method: "POST" });
      setSuccess(`${result.queued} дугаарын илгээлт эхэллээ. Багцын дугаар: ${result.batchId}`);
      setText("");
      setRecipients("");
      setSelectedTemplate("");
      setEstimate(null);
      setEstimateKey("");
      setAcknowledged(false);
      setPendingBatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Бөөн илгээлтийг эхлүүлж чадсангүй.");
    } finally {
      setSending(false);
    }
  }

  if (!isAdmin) {
    return <Card><SectionHeader title="SMS илгээх эрхгүй" /><p className="text-sm text-ink-dim">Зардал үүсгэх илгээлтийг зөвхөн администратор хийнэ. Та түүх болон загварыг харах боломжтой.</p></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title="Хүлээн авагч" />
        <label htmlFor="sms-recipients" className="block text-sm font-semibold text-ink">Утасны дугаар</label>
        <textarea id="sms-recipients" value={recipients} onChange={(event) => changeInput(() => setRecipients(event.target.value))} placeholder="Жишээ: 99112233, 88112233" rows={3} className="mt-1 min-h-20 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        <p className="mt-1 text-xs text-ink-dim">Дугаар бүрийг зай, таслал эсвэл цэгтэй таслалаар тусгаарлана. Энэ хэсэгт анги сонгох боломж байхгүй.</p>
        {phones.length > 0 && <p className="mt-2 text-sm text-ink">Оруулсан дугаар: <strong>{phones.length}</strong>{phones.length > 1 ? " (илгээхээс өмнө сервер давхардлыг тооцно)" : ""}</p>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader title="Мессежийн агуулга" />
          {templates.length > 0 && (
            <div className="w-full sm:w-64">
              <label htmlFor="sms-template-select" className="sr-only">Загвар сонгох</label>
              <select id="sms-template-select" value={selectedTemplate} onChange={(event) => {
                const value = event.target.value;
                setSelectedTemplate(value);
                const template = templates.find((row) => row.id === value);
                if (template) changeInput(() => setText(template.body));
              }} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                <option value="">Загвар сонгох</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {templateError && <p className="mb-2 text-sm text-ink-dim">Загварын жагсаалт ачаалагдсангүй: {templateError}</p>}
        <label htmlFor="sms-body" className="block text-sm font-semibold text-ink">Илгээх текст</label>
        <textarea id="sms-body" value={text} onChange={(event) => changeInput(() => setText(event.target.value))} maxLength={1000} rows={5} placeholder="Мессежээ бичнэ үү" className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-dim">
          <Meta items={[`${text.length} тэмдэгт`, preview.encoding, `${preview.segments} хэсэг${preview.segments > 1 ? ` (нэг хэсэгт ${preview.encoding === "GSM-7" ? 153 : 67} нэгж)` : ""}`]} />
          <span>Илгээх дүнгийн тооцоог баталгаажуулахын өмнө серверээс авна.</span>
        </div>
      </Card>

      {isBulk && (
        <Card>
          <SectionHeader title="Илгээх өртгийн тооцоо" />
          <p className="mb-3 text-sm text-ink-dim">Дугаар болон текст өөрчлөгдвөл тооцоог шинээр авна. Серверийн тооцоо нь илгээхэд үүсэх багцтай ижил хүсэлтийн агуулгаар хийгдэнэ.</p>
          <Button type="button" variant="secondary" loading={estimating} disabled={estimating || sending || !text.trim()} onClick={() => void getEstimate()}><Calculator className="h-4 w-4" aria-hidden />{estimating ? "Тооцоолж байна" : "Серверээс тооцоо авах"}</Button>
          {estimateIsCurrent && estimate && (
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Илгээх дугаар (давхардал, архив хассан)</dt><dd className="mt-1 font-semibold">{estimate.deduplicatedCount.toLocaleString("mn-MN")}</dd></div>
              {estimate.excludedArchivedCount !== undefined && <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Архивласан хэрэглэгчийн хасагдсан дугаар</dt><dd className="mt-1 font-semibold">{estimate.excludedArchivedCount.toLocaleString("mn-MN")}</dd></div>}
              <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Оруулсан дугаар</dt><dd className="mt-1 font-semibold">{estimate.recipientCount.toLocaleString("mn-MN")}</dd></div>
              <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Нэг дугаарт ногдох хэсэг</dt><dd className="mt-1 font-semibold">{estimate.deduplicatedCount > 0 ? (estimate.estimatedSegments / estimate.deduplicatedCount).toLocaleString("mn-MN") : "—"}</dd></div>
              <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Нийт SMS хэсэг</dt><dd className="mt-1 font-semibold">{estimate.estimatedSegments.toLocaleString("mn-MN")}</dd></div>
              <div className="rounded-lg border border-line p-3"><dt className="text-xs text-ink-dim">Ойролцоо өртөг</dt><dd className="mt-1 font-semibold">₮{estimate.estimatedCost.toLocaleString("mn-MN")}</dd></div>
            </dl>
          )}
        </Card>
      )}

      {error && <ErrorState message={error} />}
      {success && <p role="status" className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{success}</p>}

      {phones.length > 0 && text.trim() && (
        <Card className="border-warning/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink">Илгээх үйлдлийг баталгаажуулах</h3>
              <p className="mt-1 text-sm text-ink-dim">SMS явуулсны дараа буцаах боломжгүй. Дугаар болон текстийг шалгаад үргэлжлүүлнэ үү.</p>
              {isBulk && estimateIsCurrent && estimate && <p className="mt-2 text-sm text-ink"><Meta items={[`${estimate.deduplicatedCount} дугаар`, `${estimate.estimatedSegments} хэсэг`, `ойролцоогоор ${estimate.estimatedCost.toLocaleString("mn-MN")}₮`]} /></p>}
              {pendingBatchId && <p className="mt-2 text-sm text-ink-dim">Ноорог үүссэн: {pendingBatchId}. Дахин ноорог үүсгэхгүйгээр илгээлтийг эхлүүлж болно.</p>}
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="h-4 w-4 accent-brand" />
                Би энэ SMS-г явуулбал буцаах боломжгүйг ойлгож байна.
              </label>
              <Button type="button" disabled={!acknowledged || sending || (isBulk && !estimateIsCurrent)} loading={sending} onClick={() => isBulk ? void createAndStartBatch() : void sendSingle()}>
                <Send className="h-4 w-4" aria-hidden />
                {sending ? "Илгээж байна" : pendingBatchId ? "Илгээлтийг эхлүүлэх" : isBulk ? "Багц үүсгээд илгээх" : "SMS илгээх"}
              </Button>
              {isBulk && !estimateIsCurrent && <p className="mt-2 text-xs text-ink-dim">Илгээх товчийг идэвхжүүлэхийн тулд одоогийн дугаар, текстээр серверийн тооцоо авна уу.</p>}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
