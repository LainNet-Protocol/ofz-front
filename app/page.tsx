import { LandingHero } from '@/components/landing/landing-hero';
import { StepsSection } from '@/components/landing/steps-section';
import { CallToActionSection } from '@/components/landing/call-to-action-section';

export default function Home() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <StepsSection />
      <CallToActionSection />
    </div>
  );
}