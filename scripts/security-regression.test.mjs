import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire = createRequire(import.meta.url);
const origin = 'https://education-platform-chi-peach.vercel.app';
const key = 'fixture-not-a-real-secret';
const fixture = { domain: 'dimablok.payform.ru', order_id: '42', order_num: 'prompts_123_fixture', payment_status: 'success', sum: '490.00', products: [{ name: 'Библиотека промптов', price: '490.00', quantity: '1', sum: '490.00' }] };
const canonical = value => typeof value === 'string' ? JSON.stringify(value).replace(/\//g, '\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') : Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
const sign = data => crypto.createHmac('sha256', key).update(canonical(data)).digest('hex');
function flatten(data, prefix = '') {
  return Object.entries(data).flatMap(([k, v]) => typeof v === 'string' ? [[prefix ? `${prefix}[${k}]` : k, v]] : flatten(v, prefix ? `${prefix}[${k}]` : k));
}
function request(data = fixture, extra = {}, multipart = false) {
  const fields = flatten(data);
  const body = multipart ? new FormData() : new URLSearchParams();
  fields.forEach(([k, v]) => body.append(k, v));
  return new Request(`${origin}/api/prodamus/webhook`, { method: 'POST', body, headers: { sign: sign(data), ...extra } });
}
function harness(options = {}) {
  const calls = [], deliveries = [], modules = new Map();
  let sent = false;
  const env = { NODE_ENV: 'production', PRODAMUS_SECRET_KEY: key, TELEGRAM_BOT_TOKEN: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', ...options.env };
  const admin = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'record_prodamus_purchase') return { data: { id: 'purchase-fixture', status: options.refunded ? 'refunded' : 'paid' } };
      if (name === 'lease_purchase_delivery') return { data: sent ? { status: 'done' } : { status: 'leased', telegram_id: 123, lease: 'lease-fixture', claim_token: '00000000-0000-4000-8000-000000000001' } };
      if (name === 'finish_purchase_delivery') { sent = args.p_sent; return {}; }
      if (name === 'consume_request_limit') return { data: !options.rateLimited };
      if (name === 'claim_prompts_purchase') return { data: 'claimed' };
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const context = vm.createContext({ Buffer, URL, URLSearchParams, Request, Response, FormData, Headers, Blob, File, TextDecoder, TextEncoder, AbortSignal, Uint8Array, setTimeout, clearTimeout, console: { error() {}, warn() {}, log() {} }, process: { env, cwd: () => process.cwd() }, crypto: crypto.webcrypto,
    async fetch(url, init) { deliveries.push({ url, body: JSON.parse(init.body) }); return Response.json({ ok: !options.telegramFailure }, { status: options.telegramFailure ? 429 : 200 }); },
  });
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = { exports: {} }; modules.set(file, loadedModule);
    function require(name) {
      if (name.startsWith(".")) name = "@/" + path.relative(path.resolve("src"), path.resolve(path.dirname(file), name));
      if (name === 'server-only') return {};
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => admin };
      if (name === '@/lib/security/auth') return {
        async requireApiAccount(level) {
          const { HttpError } = load('src/lib/security/http.ts');
          if (options.unauthenticated) throw new HttpError(401, 'Unauthorized');
          if (level === 'admin' && !options.admin) throw new HttpError(403, 'Forbidden');
          return { user: { id: 'fixture-user' }, profile: { role: options.admin ? 'admin' : 'student', is_approved: true } };
        },
      };
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`));
      return nativeRequire(name);
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: file })(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { load, calls, deliveries, context };
}
const webhook = h => h.load('src/app/api/prodamus/webhook/route.ts');
test('rejects missing secret without writes', async () => {
  const h = harness({ env: { PRODAMUS_SECRET_KEY: '' } });
  assert.equal((await webhook(h).POST(request())).status, 503); assert.equal(h.calls.length, 0);
});
test('rejects bad HMAC without writes', async () => {
  const h = harness(); assert.equal((await webhook(h).POST(request(fixture, { sign: '0'.repeat(64) }))).status, 403); assert.equal(h.calls.length, 0);
});
test('prototype keys rejected before they mutate any object', async () => {
  for (const bad of ['__proto__[marker]', 'products[constructor][prototype][marker]', 'products[0][__proto__][marker]']) {
    const h = harness(); const req = new Request(`${origin}/api/prodamus/webhook`, { method: 'POST', body: new URLSearchParams({ [bad]: 'polluted' }) });
    assert.equal((await webhook(h).POST(req)).status, 400); assert.equal(vm.runInContext('({}).marker', h.context), undefined); assert.equal(h.calls.length, 0);
  }
});
test('rejects duplicate fields and excessive body/depth', async () => {
  for (const body of ['sum=490&sum=1', `a${'[a]'.repeat(9)}=1`, `a=${'x'.repeat(140000)}`]) {
    const h = harness(); const req = new Request(`${origin}/api/prodamus/webhook`, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.ok([400, 413].includes((await webhook(h).POST(req)).status)); assert.equal(h.calls.length, 0);
  }
});
test('accepts independently signed URL-encoded and multipart fixtures for 490 RUB', async () => {
  for (const multipart of [false, true]) {
    const h = harness(); assert.equal((await webhook(h).POST(request(fixture, {}, multipart))).status, 200);
    assert.equal(h.calls[0].args.p_amount_minor, 49000); assert.equal(h.calls[0].args.p_transaction_id, '42'); assert.equal(h.deliveries.length, 1);
  }
});
test('provider JSON signature escapes slashes in URLs and preserves Unicode', async () => {
  const data = { ...fixture, customer_extra: 'https://example.com/покупка', note: 'a\u2028b\u2029c' };
  const h = harness();
  assert.equal((await webhook(h).POST(request(data))).status, 200);
  const wrong = crypto.createHmac('sha256', key).update(canonical(data).replaceAll('\\/', '/')).digest('hex');
  assert.equal((await webhook(h).POST(request(data, { sign: wrong }))).status, 403);
});
test('rejects tampered price, currency, merchant, product total and missing status even with valid fixture signature', async () => {
  const invalid = [{ sum: '0.01' }, { sum: '490.001' }, { sum: '490e0' }, { currency: 'USD' }, { domain: 'other.payform.ru' }, { payment_status: '' }, { order_id: '' }, { products: [{ ...fixture.products[0], price: '1' }] }, { products: [{ ...fixture.products[0], quantity: '2' }] }];
  for (const change of invalid) { const h = harness(); assert.equal((await webhook(h).POST(request({ ...fixture, ...change }))).status, 400); assert.equal(h.calls.length, 0); }
});
test('unrelated signed funnel is ignored', async () => {
  const h = harness(); assert.equal((await webhook(h).POST(request({ ...fixture, order_num: 'other_123' }))).status, 200); assert.equal(h.calls.length, 0);
});
test('untrusted forwarded host cannot change activation origin', async () => {
  const h = harness(); assert.equal((await webhook(h).POST(request(fixture, { 'x-forwarded-host': 'collector.example', host: 'collector.example' }))).status, 200);
  assert.equal(new URL(h.deliveries[0].body.reply_markup.inline_keyboard[0][0].url).origin, origin);
});
test('delivery failure returns retryable error; duplicate success does not resend', async () => {
  const failed = harness({ telegramFailure: true }); assert.equal((await webhook(failed).POST(request())).status, 503);
  const h = harness(); await webhook(h).POST(request()); await webhook(h).POST(request()); assert.equal(h.deliveries.length, 1);
  const refunded = harness({ refunded: true }); await webhook(refunded).POST(request()); assert.equal(refunded.deliveries.length, 0);
});
test('test-purchase routes remain disabled even when env flag is true', async () => {
  const h = harness({ env: { ENABLE_TEST_PURCHASE: 'true' } });
  for (const name of ['simulate-purchase', 'send-claim']) {
    const route = h.load(`src/app/api/dev/${name}/route.ts`);
    assert.equal(route.GET().status, 404); assert.equal(route.POST().status, 404);
  }
  assert.equal(h.calls.length, 0);
});
test('same-origin redirect normalization preserves claim and blocks external forms', () => {
  const { safeNext } = harness().load('src/lib/security/redirect.ts');
  for (const value of ['//collector.example', '/\\collector.example', '@collector.example', 'https://collector.example', 'javascript:alert(1)', '/%2fcollector.example', '/\n/collector.example']) assert.equal(safeNext(value), '/dashboard');
  assert.equal(safeNext('/claim?token=fixture'), '/claim?token=fixture');
});
test('claim requires same origin, authenticated account, valid UUID and request quota', async () => {
  const call = (h, body, source = origin) => h.load('src/app/api/claim/route.ts').POST(new Request(`${origin}/api/claim`, { method: 'POST', headers: { origin: source, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  assert.equal((await call(harness(), { token: 'a' }, 'https://collector.example')).status, 403);
  assert.equal((await call(harness({ unauthenticated: true }), {})).status, 401);
  assert.equal((await call(harness(), { token: 'not-a-uuid' })).status, 400);
  assert.equal((await call(harness({ rateLimited: true }), {})).status, 429);
  const h = harness(); assert.equal((await call(h, { token: '00000000-0000-4000-8000-000000000001' })).status, 200);
  assert.equal(h.calls.at(-1).args.p_user_id, 'fixture-user');
});
test('non-admin cannot access purchase management or user mutations', async () => {
  const h = harness(); const req = new Request(`${origin}/api/admin/users`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await h.load('src/app/api/admin/users/route.ts').POST(req)).status, 403);
  assert.equal((await h.load('src/app/api/admin/purchases/route.ts').GET()).status, 403);
});
test('legacy images map to gated endpoints; references require exact URLs', () => {
  const h = harness(); const { protectedImageSource, lessonReferencesAsset } = h.load('src/lib/lesson-assets.ts');
  const url = 'https://project.supabase.co/storage/v1/object/public/lesson-images/lessons/a.png';
  assert.equal(protectedImageSource(url), '/api/lesson-images/lessons/a.png');
  assert.equal(lessonReferencesAsset(`![image](${url})`, '/api/lesson-images/lessons/a.png'), true);
  assert.equal(lessonReferencesAsset('![image](/api/lesson-images/lessons/a.png.other)', '/api/lesson-images/lessons/a.png'), false);
});
test('Service Worker purges legacy cache and never intercepts private documents/RSC/assets', async () => {
  const handlers = {}, deleted = [];
  const ctx = vm.createContext({ URL, self: { location: { origin }, clients: { claim() {} }, skipWaiting() {}, addEventListener: (name, fn) => { handlers[name] = fn; } }, caches: { keys: async () => ['lms-pwa-cache-v1', 'unrelated'], delete: async name => { deleted.push(name); } } });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), ctx);
  let activation; handlers.activate({ waitUntil(p) { activation = p; } }); await activation; assert.deepEqual(deleted, ['lms-pwa-cache-v1']);
  for (const target of ['/prompts', '/claim?token=fixture', '/dashboard', '/api/lesson-images/a.png', '/lesson-files/a.docx', '/courses/one?_rsc=abc']) {
    let intercepted = false; handlers.fetch({ request: new Request(origin + target), respondWith() { intercepted = true; } }); assert.equal(intercepted, false);
  }
});

test('private lesson files reject anonymous users and path traversal before reading', async () => {
  const h = harness({ unauthenticated: true });
  const route = h.load('src/app/lesson-files/[filename]/route.ts');
  for (const filename of ['../Anonymize.bas', 'a/b', '..']) {
    assert.equal((await route.GET(new Request(origin), { params: Promise.resolve({ filename }) })).status, 400);
  }
  const response = await route.GET(new Request(origin), { params: Promise.resolve({ filename: 'Anonymize.bas' }) });
  assert.equal(response.status, 401);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('upload denies students and rejects active content disguised as a raster image', async () => {
  const makeRequest = () => {
    const body = new FormData();
    body.set('file', new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'image.png', { type: 'image/png' }));
    return new Request(`${origin}/api/admin/upload`, { method: 'POST', body, headers: { origin } });
  };
  const student = harness();
  assert.equal((await student.load('src/app/api/admin/upload/route.ts').POST(makeRequest())).status, 403);
  const admin = harness({ admin: true });
  assert.equal((await admin.load('src/app/api/admin/upload/route.ts').POST(makeRequest())).status, 400);
});
