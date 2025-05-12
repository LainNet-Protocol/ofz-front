"use client"

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useWeb3 } from "@/providers/web3-provider";
import { ArrowRight, ShieldCheck, Clock, Landmark, BarChart } from "lucide-react";

export function CallToActionSection() {
  const router = useRouter();
  const { isConnected, isSignedLicense, kycStatus } = useWeb3();
  
  const getNextStep = () => {
    if (!isConnected) return { text: "Get Started", path: "/" };
    if (!isSignedLicense) return { text: "Sign License", path: "/license" };
    if (kycStatus === 'none' || kycStatus === 'rejected') return { text: "Complete KYC", path: "/kyc" };
    if (kycStatus === 'pending') return { text: "Check Verification", path: "/verification" };
    return { text: "View Marketplace", path: "/marketplace" };
  };
  
  const nextStep = getNextStep();
  
  const handleContinue = () => {
    router.push(nextStep.path);
  };

  const features = [
    {
      name: 'Secure Investment',
      description: 'Government-backed bonds with blockchain security',
      icon: ShieldCheck,
    },
    {
      name: 'Stable Returns',
      description: 'Fixed income with predictable yield',
      icon: BarChart,
    },
    {
      name: 'Long-term Value',
      description: 'Maturity dates from 1 to 10 years',
      icon: Clock,
    },
    {
      name: 'Asset Diversification',
      description: 'Expand your portfolio with sovereign debt',
      icon: Landmark,
    },
  ];

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Why Invest in OFZ Bonds?
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Russian OFZ bonds offer stability and consistent returns in a volatile crypto market.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name} className="pt-6">
                <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center rounded-md bg-emerald-600 p-3 shadow-lg">
                        <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">
                      {feature.name}
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <Button 
            onClick={handleContinue}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base"
          >
            {nextStep.text}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}