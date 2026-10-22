'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Card, CodeBlock, PageHeader } from '@/components/ui';
import { API_BASE_URL } from '@/lib/api';
import { useOrgParams } from '@/lib/hooks';

const testCustomers = [
  ['test_linked', 'Immediately QUEUED, then SENT.'],
  ['test_not_linked', 'Immediately UNDELIVERABLE, reason not_linked.'],
  ['test_blocked', 'Immediately UNDELIVERABLE, reason blocked.'],
  ['test_chat_gone', 'QUEUED, then UNDELIVERABLE with reason chat_gone (via webhook).'],
  ['test_telegram_down', 'QUEUED, then FAILED with reason telegram_unavailable (via webhook).'],
];

const statuses = [
  ['QUEUED', 'Accepted and being sent. The final result arrives as a webhook event.'],
  ['SENT', 'Telegram accepted the message.'],
  ['UNDELIVERABLE', 'This customer cannot be reached on Telegram. Use your own fallback (SMS, email…).'],
  ['FAILED', 'Telegram kept failing or rejected the message. Retry later or fall back.'],
];

export default function DocsPage() {
  const { orgId, env } = useOrgParams();
  const key = env === 'sandbox' ? 'tn_test_…' : 'tn_live_…';
  const h = `  -H "x-api-key: ${key}" \\\n  -H "content-type: application/json"`;

  return (
    <>
      <PageHeader
        title="Integration guide"
        description={
          <>
            Base URL <code className="font-mono text-ink">{API_BASE_URL}</code>. Full reference:{' '}
            <Link className="font-medium text-brand hover:underline" href={`/o/${orgId}/${env}/api-reference`}>
              API reference
            </Link>{' '}
            · SDK: <code className="font-mono text-ink">@telenotify/node</code>
          </>
        }
      />
      <div className="space-y-6">
        <Section n={1} title="Connect a customer to your bot">
          <p>Create a one-time link for a customer in your system and show it in your app, a receipt or an SMS. When they tap it and press Start, they&apos;re connected.</p>
          <CodeBlock
            language="bash"
            code={`curl -X POST ${API_BASE_URL}/v1/customers/link \\\n${h} \\\n  -d '{"externalId": "customer_123", "phone": "0911223344"}'\n\n# → { "url": "https://t.me/your_bot?start=…", "expiresAt": "…" }`}
          />
          <p>
            <code className="font-mono text-ink">externalId</code> is your own id for the customer. The phone is optional; on a live bot, it lets customers connect by sharing their number instead.
          </p>
        </Section>

        <Section n={2} title="Send a message">
          <CodeBlock
            language="bash"
            code={`curl -X POST ${API_BASE_URL}/v1/messages \\\n${h} \\\n  -d '{\n    "to": "customer_123",\n    "text": "Your order #1042 is out for delivery",\n    "buttons": [[{ "text": "Track order", "url": "https://shop.example.com/o/1042" }]],\n    "idempotencyKey": "order-1042-shipped"\n  }'`}
          />
          <p>Reusing an idempotency key returns the original message instead of sending twice.</p>
        </Section>

        <Section n={3} title="Fall back when Telegram can't reach the customer">
          <p>Telenotify only sends on Telegram. When a customer can&apos;t be reached, we tell you, and your existing SMS or email provider takes over.</p>
          <Table rows={statuses} />
          <CodeBlock
            language="javascript"
            code={`const res = await fetch('${API_BASE_URL}/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': process.env.TELENOTIFY_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ to: customer.id, text }),
});
const message = await res.json();

if (message.status === 'UNDELIVERABLE') {
  await sendSms(customer.phone, text); // your own provider
}
// QUEUED: the final result arrives as a webhook event (message.sent / undeliverable / failed).`}
          />
          <p>
            You can also check first: <code className="font-mono text-ink">GET /v1/customers/:externalId</code> returns{' '}
            <code className="font-mono text-ink">reachable: true | false</code>.
          </p>
        </Section>

        <Section n={4} title="Listen for events">
          <p>Set a webhook URL to receive message.sent, message.undeliverable, message.failed, message.received, customer.linked and customer.blocked. Verify the signature using the snippet on the Webhooks page.</p>
          <CodeBlock
            language="json"
            code={`{
  "event": "message.undeliverable",
  "environment": "${env}",
  "createdAt": "2026-10-21T09:30:00.000Z",
  "data": { "id": "…", "to": "customer_123", "status": "UNDELIVERABLE", "reason": "blocked", "text": "…" }
}`}
          />
        </Section>

        <div id="verify">
          <Section n={5} title="Verify a phone number without SMS">
            <p>
              Replace SMS one-time codes. Create a verification, send the person to its link (a “Verify with Telegram” button), and they share their number with your bot in one tap. Telegram vouches the number belongs to that account, so there&apos;s no code to type and no resend.
            </p>
            <CodeBlock
              language="bash"
              code={`curl -X POST ${API_BASE_URL}/v1/verifications \\\n${h} \\\n  -d '{"phone": "0911223344", "externalId": "customer_123"}'\n\n# → { "id": "…", "status": "PENDING", "url": "https://t.me/your_bot?start=v_…" }`}
            />
            <Table
              rows={[
                ['PENDING', 'Link created, not opened yet.'],
                ['AWAITING_CONTACT', 'Opened in Telegram; waiting for the person to share their number.'],
                ['VERIFIED', 'Done. phone holds the verified number. With externalId, the customer is also linked for notifications.'],
                ['FAILED', 'reason phone_mismatch: the Telegram number differs from the phone you passed.'],
                ['EXPIRED', 'Not completed in time (default 10 minutes; set expiresInMinutes up to 60).'],
              ]}
              mono
            />
            <p>
              Poll <code className="font-mono text-ink">GET /v1/verifications/:id</code> or listen for <code className="font-mono text-ink">verification.completed</code> and{' '}
              <code className="font-mono text-ink">verification.failed</code>. People without Telegram can still use your SMS flow.
            </p>
          </Section>
        </div>

        <div id="test-customers">
          <Section n={6} title="Test customers (sandbox)">
            <p>Send to these ids with a sandbox key to see every outcome without Telegram. Use them to test your fallback code.</p>
            <Table rows={testCustomers} mono />
          </Section>
        </div>

        <Section n={7} title="Going live">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Connect your own @BotFather bot in Live → Telegram bot.</li>
            <li>Create a live key (tn_live_…) and set an HTTPS webhook URL.</li>
            <li>Swap the key in your server config. The API is the same.</li>
          </ol>
        </Section>
      </div>
    </>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent text-xs font-bold text-white">{n}</span>
          {title}
        </span>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </Card>
  );
}

function Table({ rows, mono }: { rows: string[][]; mono?: boolean }) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {rows.map(([name, description]) => (
        <div key={name} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:gap-4">
          <dt className={`text-ink sm:w-44 sm:shrink-0 ${mono ? 'font-mono text-xs leading-5' : 'font-medium'}`}>{name}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}
