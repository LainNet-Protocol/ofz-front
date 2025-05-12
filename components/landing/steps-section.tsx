"use client"

import { 
  Wallet, 
  FileSignature, 
  Upload, 
  BarChart4, 
  DollarSign,
  ArrowRight
} from "lucide-react";
import { useWeb3 } from "@/providers/web3-provider";
import { cn } from "@/lib/utils";

export function StepsSection() {
  const { isConnected, isSignedLicense, isKycSubmitted, kycStatus } = useWeb3();
  
  const steps = [
    {
      name: 'Connect Wallet',
      description: 'Connect your crypto wallet to get started.',
      icon: Wallet,
      status: isConnected ? 'complete' : 'current',
    },
    {
      name: 'Sign License',
      description: 'Digitally sign our license agreement.',
      icon: FileSignature,
      status: !isConnected ? 'upcoming' : isSignedLicense ? 'complete' : 'current',
    },
    {
      name: 'Upload KYC',
      description: 'Complete the KYC verification process.',
      icon: Upload,
      status: !isConnected || !isSignedLicense ? 'upcoming' : isKycSubmitted ? 'complete' : 'current',
    },
    {
      name: 'Invest',
      description: 'Browse and invest in OFZ bonds.',
      icon: BarChart4,
      status: !isConnected || !isSignedLicense || kycStatus !== 'approved' ? 'upcoming' : 'current',
    },
    {
      name: 'Claim',
      description: 'Claim your tokens and rewards.',
      icon: DollarSign,
      status: 'upcoming',
    },
  ];

  return (
    <div className="py-16 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Follow these simple steps to start investing in Russian OFZ bonds using cryptocurrency.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="mt-8 lg:mt-16">
            <nav className="flex flex-col justify-between">
              <ol className="relative grid grid-cols-1 md:grid-cols-5 gap-6">
                {steps.map((step, stepIdx) => (
                  <li key={step.name} className="relative">
                    <div className={cn(
                      "group flex flex-col items-center pt-6 pb-8 px-6 rounded-lg",
                      step.status === 'complete' && "bg-emerald-50",
                      step.status === 'current' && "bg-white border-2 border-emerald-500 shadow-md",
                      step.status === 'upcoming' && "bg-white border border-gray-200"
                    )}>
                      <div className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full",
                        step.status === 'complete' && "bg-emerald-500 text-white",
                        step.status === 'current' && "bg-emerald-100 text-emerald-700",
                        step.status === 'upcoming' && "bg-gray-100 text-gray-500"
                      )}>
                        <step.icon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <h3 className={cn(
                        "mt-4 text-lg font-medium",
                        step.status === 'complete' && "text-emerald-700",
                        step.status === 'current' && "text-emerald-900",
                        step.status === 'upcoming' && "text-gray-900"
                      )}>
                        {step.name}
                      </h3>
                      <p className={cn(
                        "mt-2 text-sm",
                        step.status === 'complete' && "text-emerald-600",
                        step.status === 'current' && "text-gray-600",
                        step.status === 'upcoming' && "text-gray-500"
                      )}>
                        {step.description}
                      </p>
                    </div>

                    {stepIdx < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 right-0 h-0.5 w-5 bg-gray-300 -translate-y-1/2 translate-x-full">
                        <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full text-gray-400" />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}