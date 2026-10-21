import { Developers } from '@/components/landing/developers';
import { Ethiopia } from '@/components/landing/ethiopia';
import { Faq, FinalCta, Footer } from '@/components/landing/closing';
import { Features } from '@/components/landing/features';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingNav } from '@/components/landing/nav';
import { Savings } from '@/components/landing/savings';
import { UseCases } from '@/components/landing/use-cases';
import { VerifySection } from '@/components/landing/verify-section';

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
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
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
