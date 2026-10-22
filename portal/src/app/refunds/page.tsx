import type { Metadata } from 'next';
import { LEGAL, LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Refund Policy · Telenotify' };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" intro="Telenotify is billed monthly in advance. Here is how cancellations and refunds work.">
      <section>
        <h2>1. Try before you pay</h2>
        <p>The sandbox and the Free plan cost nothing, so you can test the full integration before choosing a paid plan.</p>
      </section>
      <section>
        <h2>2. Cancelling</h2>
        <p>You can cancel or downgrade at any time. Your plan stays active until the end of the month you paid for, then moves to the Free plan. Unused messages don&apos;t carry over to the next month.</p>
      </section>
      <section>
        <h2>3. When we refund</h2>
        <ul>
          <li>If you paid for a plan and ask within <b>7 days</b> of the payment without having used more than 10% of its monthly quota, we refund the full amount.</li>
          <li>If Telenotify was unavailable for more than 72 hours in total during a paid month because of a problem on our side, we refund that month proportionally.</li>
          <li>Duplicate or mistaken payments are always refunded in full.</li>
        </ul>
      </section>
      <section>
        <h2>4. When we don&apos;t</h2>
        <p>We don&apos;t refund partial months after the 7-day window, quota you didn&apos;t use, or accounts suspended for breaking our Terms of Service.</p>
      </section>
      <section>
        <h2>5. How to request a refund</h2>
        <p>Email {LEGAL.email} from your account email with your organization name and payment reference. Approved refunds go back to the original payment method, usually within 7 to 14 business days depending on the payment provider.</p>
      </section>
    </LegalPage>
  );
}
