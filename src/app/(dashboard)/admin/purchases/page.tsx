"use client";
import { useCallback, useEffect, useState } from "react";
interface Purchase { id: string; provider_order_id: string; status: string; amount: number | null; amount_minor: number | null; currency: string; claimed_at: string | null; delivery_sent_at: string | null; claim_expires_at: string }
export default function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/purchases", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.purchases);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить оплаты"); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  const act = async (id: string, action: string) => {
    if (action === "record_refund" && !window.confirm("Возврат уже выполнен в Prodamus? Это действие отзовёт доступ по покупке и не может быть отменено.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Операция не выполнена"); }
    finally { setBusy(false); }
  };
  return <section>
    <h2 className="text-xl font-semibold mb-3">Оплаты</h2>
    <p className="text-sm text-muted mb-4">Последние 100 покупок. Возврат денег оформляется в Prodamus; здесь отмечается его выполнение и закрывается доступ по покупке.</p>
    {error && <p role="alert" className="text-error mb-4">{error}</p>}
    <div className="space-y-3">{rows.map(p => <article key={p.id} className="rounded-xl border border-border p-4">
      <p className="font-medium break-all">{p.provider_order_id}</p>
      <p className="text-sm text-muted">{((p.amount_minor ?? (p.amount ?? 0) * 100) / 100).toFixed(2)} {p.currency} · {p.status === "paid" ? "Оплачено" : "Возвращено"} · {p.claimed_at ? "Активировано" : "Не активировано"}</p>
      {p.status === "paid" && <div className="flex flex-wrap gap-3 mt-3">
        {(!p.delivery_sent_at || new Date(p.claim_expires_at) <= new Date()) && !p.claimed_at && <button disabled={busy} onClick={() => act(p.id, "retry_delivery")} className="text-accent disabled:opacity-50">Отправить ссылку активации</button>}
        <button disabled={busy} onClick={() => act(p.id, "record_refund")} className="text-error disabled:opacity-50">Отметить возврат</button>
      </div>}
    </article>)}</div>
  </section>;
}
