import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { Developers } from '@/components/landing/developers';
import { Ethiopia } from '@/components/landing/ethiopia';
import { Faq, FinalCta, Footer } from '@/components/landing/closing';
import { Features } from '@/components/landing/features';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingNav } from '@/components/landing/nav';
import { Pricing } from '@/components/landing/pricing';
import { Savings } from '@/components/landing/savings';
import { Sdk } from '@/components/landing/sdk';
import { UseCases } from '@/components/landing/use-cases';
import { VerifySection } from '@/components/landing/verify-section';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Structured data so search engines know this is a software product with a free plan.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'ETB', description: 'Free plan: 2,000 messages a month' },
};

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main>
        <Hero />
        <UseCases />
        <Ethiopia />
        <VerifySection />
        <Savings />
        <Features />
        <HowItWorks />
        <Developers />
        <Sdk />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
