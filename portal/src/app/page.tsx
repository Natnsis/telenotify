import { Developers } from '@/components/landing/developers';
import { Faq, FinalCta, Footer } from '@/components/landing/closing';
import { Features } from '@/components/landing/features';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingNav } from '@/components/landing/nav';
import { UseCases } from '@/components/landing/use-cases';

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <LandingNav />
      <main>
        <Hero />
        <UseCases />
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
