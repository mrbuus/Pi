"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/kit/card";
import { toast } from "sonner";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
function subscribeInstalled(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => { media.removeEventListener("change", callback); window.removeEventListener("appinstalled", callback); };
}
const noSubscribe = () => () => {};
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const standalone = useSyncExternalStore(subscribeInstalled, isStandalone, () => false);
  const [acceptedInstall, setAcceptedInstall] = useState(false);
  const installed = standalone || acceptedInstall;
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setPrompt(null); setAcceptedInstall(true); };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", done); };
  }, []);
  async function install() {
    if (!prompt) return;
    setBusy(true);
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { toast.error("Суулгах цонх нээгдсэнгүй. Хөтчийн цэснээс суулгах боломжийг шалгана уу."); }
    finally { setPrompt(null); setBusy(false); }
  }
  if (installed) return <p className="text-sm text-success">Pi.mn энэ төхөөрөмжид суусан байна.</p>;
  return <Card className="chunky"><CardHeader><CardTitle>Pi.mn-ийг утсандаа суулгах</CardTitle></CardHeader><CardContent className="space-y-3">
    {prompt ? <Button onClick={install} disabled={busy} className="min-h-11 btn-3d"><Download aria-hidden />{busy ? "Нээж байна" : "Суулгах"}</Button> : ios ? <p className="flex flex-wrap items-center gap-2 text-sm text-ink-dim"><Share aria-hidden className="size-5" />Safari-ийн Хуваалцах цэсийг нээгээд <SquarePlus aria-hidden className="size-5" />Нүүр дэлгэцэнд нэмэхийг сонгоно.</p> : <p className="text-sm text-ink-dim">Хөтчийн цэсэн дэх «Апп суулгах» сонголтыг ашиглана. Зарим хөтөч суулгах боломж дэмждэггүй.</p>}
    <p className="text-sm text-ink-dim">Офлайн үед хадгалсан томьёогоо уншина. Шалгалт өгөх, дүн болон хувийн мэдээллээ үзэхэд интернэт хэрэгтэй.</p>
  </CardContent></Card>;
}
