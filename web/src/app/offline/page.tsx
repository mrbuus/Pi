"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BookOpen, Trash2, WifiOff } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/kit/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/StateBlock";
import InstallPrompt from "@/components/pwa/InstallPrompt";

type Formula = { slug: string; title: string; latex: string; general: string; explanation: string; conditions: string[]; derivation: string[]; mnemonic: string; commonMistakes: string[]; eeshTip: string; savedAt: string; examples: { problem: string; steps: string[]; answer: string }[] };
const cacheName = "pi-public-formulas-v1";
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback); window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
async function readCachedFormulas(): Promise<Formula[]> {
  if (!("caches" in window)) throw new Error("storage unavailable");
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const formulas: Formula[] = [];
  for (const key of keys.slice(0, 500)) {
    if (!new URL(key.url).pathname.startsWith("/offline/formula/")) continue;
    const response = await cache.match(key);
    if (response) formulas.push(await response.json());
  }
  return formulas.sort((a, b) => a.title.localeCompare(b.title, "mn"));
}
const storageError = "Хадгалсан томьёог уншиж чадсангүй. Хөтчийн хадгалалтын эрхийг шалгана уу.";
export default function OfflinePage() {
  const [items, setItems] = useState<Formula[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => false);
  async function load() {
    setLoading(true); setError("");
    try {
      setItems(await readCachedFormulas());
    } catch { setError(storageError); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    void readCachedFormulas().then(value => { if (!cancelled) setItems(value); })
      .catch(() => { if (!cancelled) setError(storageError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function clear() {
    try { await caches.delete(cacheName); setItems([]); setConfirmClear(false); }
    catch { setError("Хадгалалтыг цэвэрлэж чадсангүй. Дахин оролдоно уу."); }
  }
  const filtered = items.filter(item => (item.title + " " + item.explanation).toLocaleLowerCase("mn").includes(query.toLocaleLowerCase("mn")));
  return <main className="mx-auto max-w-3xl space-y-6 p-4 pb-16 text-ink sm:p-8">
    <header className="space-y-3"><WifiOff className="size-8 text-brand" aria-hidden /><h1 className="text-2xl font-bold">Хадгалсан томьёо</h1><p className="text-ink-dim">Интернэттэй үед нээсэн томьёонууд энд хадгалагдана. Энэ төхөөрөмж дээрх хуулбар хуучирсан байж болно. Дүн, сурагчийн түүх, дадлагын бодлого хадгалахгүй.</p>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline" className="min-h-11"><a href="/app/formulas">{online ? "Томьёоны санг нээх" : "Холболтоо дахин шалгах"}</a></Button><Button onClick={load} variant="outline" className="min-h-11">Жагсаалтыг сэргээх</Button></div>
    </header>
    <InstallPrompt />
    <label className="block space-y-2"><span className="font-semibold">Томьёо хайх</span><input value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border-2 border-line bg-surface px-3" placeholder="Томьёоны нэр" /></label>
    <p className="text-sm text-ink-dim" role="status">{items.length} томьёо хадгалсан</p>
    {loading ? <LoadingState rows={3} /> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? <EmptyState icon={BookOpen} title={query ? "Хайлтад тохирох томьёо алга" : "Хадгалсан томьёо хараахан алга"} hint="Интернэттэй үед томьёоны дэлгэрэнгүйг нээгээд энд эргэж ирээрэй." /> : <div className="space-y-4">{filtered.map(item => <Card className="chunky overflow-hidden" key={item.slug}><CardHeader><CardTitle>{item.title}</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="overflow-x-auto"><MathText>{`$$${item.general || item.latex}$$`}</MathText></div>
      <div><MathText>{item.explanation}</MathText></div>
      {item.conditions.length > 0 && <div><h2 className="font-semibold">Хэрэглэх нөхцөл</h2>{item.conditions.map((condition, index) => <MathText key={index}>{`$${condition}$`}</MathText>)}</div>}
      {item.derivation.length > 0 && <ol className="list-decimal space-y-2 pl-5">{item.derivation.map((step, index) => <li key={index}><MathText>{step}</MathText></li>)}</ol>}
      {item.examples.map((example, index) => <details key={index} className="rounded-xl border border-line p-3"><summary className="min-h-11 cursor-pointer font-medium"><MathText>{example.problem}</MathText></summary><ol className="list-decimal space-y-2 pl-5">{example.steps.map((step, i) => <li key={i}><MathText>{step}</MathText></li>)}</ol><MathText>{example.answer}</MathText></details>)}
      {item.mnemonic && <div><MathText>{item.mnemonic}</MathText></div>}
      {item.commonMistakes.map((mistake, i) => <p key={i} className="text-sm text-ink-dim"><MathText>{mistake}</MathText></p>)}
      {item.eeshTip && <div><MathText>{item.eeshTip}</MathText></div>}
      <p className="text-xs text-ink-dim">Хадгалсан: {new Date(item.savedAt).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</p>
    </CardContent></Card>)}</div>}
    {items.length > 0 && <div className="flex flex-wrap items-center gap-3">{confirmClear ? <><p>Энэ төхөөрөмжийн томьёоны хуулбарыг цэвэрлэх үү?</p><Button onClick={clear} variant="danger" className="min-h-11">Тийм, цэвэрлэх</Button><Button variant="outline" onClick={() => setConfirmClear(false)} className="min-h-11">Болих</Button></> : <Button variant="outline" onClick={() => setConfirmClear(true)} className="min-h-11"><Trash2 aria-hidden />Хадгалалтыг цэвэрлэх</Button>}</div>}
  </main>;
}
