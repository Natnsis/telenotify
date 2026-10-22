const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { Telenotify, TelenotifyError, webhooks, WebhookSignatureError } = require('../dist');

function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  fn.calls = calls;
  return fn;
}

const client = (fetch, extra = {}) => new Telenotify({ apiKey: 'tn_test_x', baseUrl: 'http://api.test/', fetch, maxRetries: 2, ...extra });

test('sends a message with the API key and JSON body', async () => {
  const fetch = fakeFetch([{ body: { id: 'm1', status: 'QUEUED' } }]);
  const message = await client(fetch).messages.send({ to: 'cust_1', text: 'hi' });
  assert.equal(message.status, 'QUEUED');
  const { url, init } = fetch.calls[0];
  assert.equal(url, 'http://api.test/v1/messages');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['x-api-key'], 'tn_test_x');
  assert.deepEqual(JSON.parse(init.body), { to: 'cust_1', text: 'hi' });
});

test('surfaces API errors with status and code, without retrying 4xx', async () => {
  const fetch = fakeFetch([{ status: 402, body: { message: 'Monthly quota used up', code: 'quota_exceeded' } }]);
  await assert.rejects(client(fetch).messages.send({ to: 'c', text: 'x', idempotencyKey: 'k' }), (error) => {
    assert.ok(error instanceof TelenotifyError);
    assert.equal(error.status, 402);
    assert.ok(error.isQuotaExceeded);
    return true;
  });
  assert.equal(fetch.calls.length, 1);
});

test('retries 5xx and network errors for idempotent requests', async () => {
  const fetch = fakeFetch([{ status: 503 }, new TypeError('fetch failed'), { body: { id: 'm1', status: 'SENT' } }]);
  const message = await client(fetch).messages.send({ to: 'c', text: 'x', idempotencyKey: 'order-1' });
  assert.equal(message.status, 'SENT');
  assert.equal(fetch.calls.length, 3);
});

test('does not retry a send without an idempotency key', async () => {
  const fetch = fakeFetch([{ status: 503 }, { body: {} }]);
  await assert.rejects(client(fetch).messages.send({ to: 'c', text: 'x' }), (error) => error.status === 503);
  assert.equal(fetch.calls.length, 1);
});

test('builds query strings and encodes ids', async () => {
  const fetch = fakeFetch([{ body: { data: [], nextCursor: null } }, { body: { externalId: 'a/b' } }]);
  const api = client(fetch);
  await api.messages.list({ customer: 'cust 1', status: 'SENT', limit: 5 });
  await api.customers.get('a/b');
  assert.equal(fetch.calls[0].url, 'http://api.test/v1/messages?customer=cust+1&status=SENT&limit=5');
  assert.equal(fetch.calls[1].url, 'http://api.test/v1/customers/a%2Fb');
});

test('requires an API key and a base URL', () => {
  assert.throws(() => new Telenotify({}), /apiKey/);
  const saved = process.env.TELENOTIFY_API_URL;
  delete process.env.TELENOTIFY_API_URL;
  assert.throws(() => new Telenotify({ apiKey: 'k' }), /TELENOTIFY_API_URL/);
  process.env.TELENOTIFY_API_URL = 'http://from-env.test';
  assert.doesNotThrow(() => new Telenotify({ apiKey: 'k' }));
  if (saved === undefined) delete process.env.TELENOTIFY_API_URL;
  else process.env.TELENOTIFY_API_URL = saved;
});

test('verifies and parses signed webhook events', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ id: 'evt_1', event: 'message.sent', environment: 'sandbox', createdAt: 'x', data: { id: 'm1' } });
  const t = Math.floor(Date.now() / 1000);
  const header = `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  assert.equal(webhooks.constructEvent(body, header, secret).data.id, 'm1');
  assert.equal(webhooks.verifySignature(body + ' ', header, secret), false);
  assert.throws(() => webhooks.constructEvent(body, header, 'wrong'), WebhookSignatureError);
  const old = t - 3600;
  const stale = `t=${old},v1=${createHmac('sha256', secret).update(`${old}.${body}`).digest('hex')}`;
  assert.equal(webhooks.verifySignature(body, stale, secret), false);
});

test('sends by template and lists templates', async () => {
  const fetch = fakeFetch([{ body: { id: 'm2', status: 'QUEUED', template: 'order_ready' } }, { body: [{ key: 'order_ready', placeholders: ['name'] }] }]);
  const tn = client(fetch);
  await tn.messages.send({ to: 'c', template: 'order_ready', params: { name: 'Hana' }, locale: 'am' });
  assert.deepEqual(JSON.parse(fetch.calls[0].init.body), { to: 'c', template: 'order_ready', params: { name: 'Hana' }, locale: 'am' });
  const templates = await tn.templates.list();
  assert.equal(fetch.calls[1].url, 'http://api.test/v1/templates');
  assert.deepEqual(templates[0].placeholders, ['name']);
});
