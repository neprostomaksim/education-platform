import "server-only";
import crypto from "node:crypto";
import { HttpError, readBody } from "@/lib/security/http";
type Value = string | { [key: string]: Value };
export type PaymentData = { [key: string]: Value };
const forbidden = new Set(["__proto__", "constructor", "prototype"]);
function setField(root: PaymentData, key: string, value: string) {
  if (!/^[a-zA-Z0-9_]+(?:\[[a-zA-Z0-9_]+\])*$/.test(key)) throw new HttpError(400, "Некорректное поле");
  const parts = key.replaceAll("]", "").split("[");
  if (parts.length > 8 || parts.some(p => forbidden.has(p))) throw new HttpError(400, "Недопустимое поле");
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      if (Object.hasOwn(current, part)) throw new HttpError(400, "Повторяющееся поле");
      current[part] = value;
    } else {
      if (!Object.hasOwn(current, part)) current[part] = Object.create(null) as PaymentData;
      if (typeof current[part] === "string") throw new HttpError(400, "Конфликт полей");
      current = current[part] as PaymentData;
    }
  }
}
export async function parsePayment(request: Request): Promise<PaymentData> {
  const bytes = await readBody(request, 128 * 1024);
  const type = request.headers.get("content-type") || "";
  const data: PaymentData = Object.create(null);
  let fields: Iterable<[string, string]>;
  if (type.startsWith("application/x-www-form-urlencoded")) {
    fields = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } else if (type.startsWith("multipart/form-data")) {
    const form = await new Response(bytes as BodyInit, { headers: { "content-type": type } }).formData();
    const entries: [string, string][] = [];
    for (const [key, value] of form) {
      if (typeof value !== "string") throw new HttpError(400, "Файлы не допускаются");
      entries.push([key, value]);
    }
    fields = entries;
  } else throw new HttpError(415, "Ожидается form-data");
  let count = 0;
  for (const [key, value] of fields) {
    if (++count > 256 || key.length > 256 || value.length > 16384) throw new HttpError(413, "Слишком много данных");
    setField(data, key, value);
  }
  return data;
}
function encode(value: Value): string {
  if (typeof value === "string") return JSON.stringify(value).replace(/\//g, "\\/").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const keys = Object.keys(value).sort((a, b) => {
    if (/^(0|[1-9]\d*)$/.test(a) && /^(0|[1-9]\d*)$/.test(b)) return Number(a) - Number(b);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const list = keys.every((key, index) => key === String(index));
  return list ? `[${keys.map(k => encode(value[k])).join(",")}]`
    : `{${keys.map(k => `${JSON.stringify(k)}:${encode(value[k])}`).join(",")}}`;
}
export function verifyPayment(data: PaymentData, signature: string, secret: string): boolean {
  if (!secret || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(encode(data)).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function field(data: PaymentData, name: string): string {
  return Object.hasOwn(data, name) && typeof data[name] === "string" ? data[name] as string : "";
}
export function minorUnits(value: string): number {
  if (!/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) throw new HttpError(400, "Некорректная сумма");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function validatePurchase(data: PaymentData) {
  const merchantId = field(data, "order_num");
  if (!merchantId.startsWith("prompts_")) return null;
  const match = /^prompts_([1-9]\d{0,14})_([A-Za-z0-9-]{1,100})$/.exec(merchantId);
  const transactionId = field(data, "order_id");
  const telegramId = Number(match?.[1]);
  if (!match || !Number.isSafeInteger(telegramId) || !/^[A-Za-z0-9-]{1,100}$/.test(transactionId)) throw new HttpError(400, "Некорректный заказ");
  if (field(data, "domain").toLowerCase() !== (process.env.PRODAMUS_DOMAIN || "dimablok.payform.ru").toLowerCase()) throw new HttpError(400, "Другая платёжная форма");
  const status = field(data, "payment_status");
  if (["order_canceled", "order_denied"].includes(status)) return null;
  if (status !== "success") throw new HttpError(400, "Нет подтверждения успешной оплаты");
  const amount = minorUnits(field(data, "sum"));
  const expected = minorUnits(process.env.PROMPTS_PRICE_RUB || "490");
  // This pinned Prodamus form settles in RUB and can omit the currency field.
  const currency = field(data, "currency") || "RUB";
  if (amount !== expected || amount <= 0 || currency !== "RUB") throw new HttpError(400, "Сумма или валюта не совпадает");
  const products = data.products;
  if (!products || typeof products === "string" || Object.keys(products).length !== 1) throw new HttpError(400, "Некорректная корзина");
  const item = products["0"];
  if (!item || typeof item === "string" || !field(item, "name") || field(item, "quantity") !== "1" ||
      minorUnits(field(item, "price")) !== expected || (field(item, "sum") && minorUnits(field(item, "sum")) !== expected)) throw new HttpError(400, "Товар не совпадает");
  if (process.env.PRODAMUS_PROMPTS_PRODUCT_NAME && field(item, "name") !== process.env.PRODAMUS_PROMPTS_PRODUCT_NAME) throw new HttpError(400, "Другой товар");
  return { merchantId, transactionId, telegramId, amount, currency };
}
