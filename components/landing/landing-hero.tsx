"use client"

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function LandingHero() {
  const router = useRouter();
  const { isConnected, isSignedLicense, kycStatus } = useWeb3();
  
  const getNextStep = () => {
    if (!isConnected) return { text: "Connect Wallet", path: "/" };
    if (!isSignedLicense) return { text: "Sign License", path: "/license" };
    if (kycStatus === 'none' || kycStatus === 'rejected') return { text: "Complete KYC", path: "/kyc" };
    if (kycStatus === 'pending') return { text: "Check Verification", path: "/verification" };
    return { text: "View Marketplace", path: "/marketplace" };
  };
  
  const nextStep = getNextStep();
  
  const handleContinue = () => {
    router.push(nextStep.path);
  };

  return (
    <div className="relative overflow-hidden bg-white pt-20">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative px-6 lg:px-8">
        <div className="mx-auto max-w-4xl py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              <span className="block text-emerald-600">OFZ Crypto Portal</span>
              <span className="block mt-2">Invest in Russian OFZ Bonds Using Crypto</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Access traditional financial instruments with the flexibility and security of blockchain technology.
              Our platform enables seamless investment in government bonds through cryptocurrency.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {!isConnected ? (
                <ConnectWalletButton 
                  variant="default"
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base"
                />
              ) : (
                <Button 
                  onClick={handleContinue}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base"
                >
                  {nextStep.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              
              <Button variant="outline" size="lg" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
                Learn more
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}