"use client"

import { useState, useEffect } from "react";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function LicenseAgreement() {
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isConnected, signLicense, isSignedLicense } = useWeb3();
  const { toast } = useToast();
  const router = useRouter();
  
  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track when a signature is completed
  useEffect(() => {
    if (isSignedLicense) {
      setSigned(true);
    }
  }, [isSignedLicense]);

  const handleSignLicense = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Starting license signing in component...");
    setLoading(true);
    try {
      // Clear signed state before starting the signature process
      setSigned(false);
      
      console.log("Calling web3 provider signLicense function...");
      // Wait for the signature to complete - this will show MetaMask popup
      const signature = await signLicense();
      
      console.log("Component received signature result:", signature ? "Valid signature" : "No valid signature");
      
      // Only if we get a valid signature
      if (signature) {
        // Set signed to true after successful signature
        setSigned(true);
        console.log("Component marked license as signed");
        
        toast({
          title: "License signed successfully",
          description: "Your signature has been recorded on the blockchain",
          variant: "default",
        });
      } else {
        console.log("Received empty signature from provider");
      }
    } catch (error: any) {
      console.error("Error signing license in component:", error);
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      
      // Handle user rejection
      if (error.message?.includes("User rejected")) {
        toast({
          title: "Signature rejected",
          description: "You need to sign the license to continue",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to sign license",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      console.log("License signing process completed");
    }
  };

  // Don't render anything until after hydration
  if (!isMounted) {
    return null;
  }

  // Only show success state if we have a confirmed signature
  if (signed || isSignedLicense) {
    return (
      <Card className="p-6 bg-emerald-50 border-emerald-200">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-medium text-emerald-800">License Agreement Signed</h3>
          <p className="mt-2 text-emerald-600">
            You have successfully signed the license agreement.
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/kyc')}
          >
            Continue to KYC
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium">OFZ Crypto Portal License Agreement</h3>
        </div>
        
        <ScrollArea className="h-96 p-4">
          <div className="space-y-4 text-sm">
            <p>
              <strong>IMPORTANT:</strong> This License Agreement (the "Agreement") is entered into between you ("User", "you", or "your") and OFZ Crypto Portal ("Company", "we", "us", or "our"). 
              By accessing or using the OFZ Crypto Portal (the "Platform"), you agree to be bound by the terms and conditions of this Agreement.
            </p>
            
            <h4 className="text-base font-medium mt-6">1. Definition of Services</h4>
            <p>
              The Platform provides users with access to invest in Russian Federal Loan Obligations (OFZ bonds) using cryptocurrency. Our services include providing access to OFZ bond offerings, 
              facilitating cryptocurrency transactions, and maintaining records of your investments.
            </p>
            
            <h4 className="text-base font-medium mt-4">2. Eligibility Requirements</h4>
            <p>
              By signing this Agreement, you confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are at least 18 years of age</li>
              <li>You have the legal capacity to enter into this Agreement</li>
              <li>You will complete the required KYC verification process</li>
              <li>You are not a citizen or resident of a sanctioned country</li>
              <li>You will comply with all applicable laws and regulations</li>
            </ul>
            
            <h4 className="text-base font-medium mt-4">3. Compliance Requirements</h4>
            <p>
              The User acknowledges and agrees to comply with all applicable laws, regulations, and rules related to cryptocurrency investments and Russian financial instruments.
              This includes anti-money laundering (AML) laws, know-your-customer (KYC) procedures, and any applicable sanctions.
            </p>
            
            <h4 className="text-base font-medium mt-4">4. User Responsibilities</h4>
            <p>
              As a User, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate and truthful information during the KYC verification process</li>
              <li>Maintain the security of your wallet and private keys</li>
              <li>Accept all risks associated with cryptocurrency investments</li>
              <li>Accept all risks associated with investments in foreign government bonds</li>
              <li>Not engage in any fraudulent, deceptive, or manipulative practices</li>
            </ul>
            
            <h4 className="text-base font-medium mt-4">5. Investment Risks</h4>
            <p>
              You acknowledge that investing in OFZ bonds using cryptocurrency carries significant risks, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Price volatility in cryptocurrency markets</li>
              <li>Potential for loss of principal</li>
              <li>Geopolitical risks related to Russian financial instruments</li>
              <li>Currency exchange risks</li>
              <li>Regulatory changes that may affect your investment</li>
            </ul>
            
            <h4 className="text-base font-medium mt-4">6. Fees and Charges</h4>
            <p>
              The Platform charges fees for its services according to the following schedule:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Transaction fee: 1% of the investment amount</li>
              <li>Withdrawal fee: 0.5% of the withdrawal amount</li>
              <li>Currency conversion fee: 0.25% of the converted amount</li>
            </ul>
            <p>
              All fees are subject to change with 30 days notice.
            </p>
            
            <h4 className="text-base font-medium mt-4">7. Privacy Policy</h4>
            <p>
              The Company collects, uses, and protects your personal information in accordance with our Privacy Policy, which is incorporated into this Agreement by reference.
            </p>
            
            <h4 className="text-base font-medium mt-4">8. Term and Termination</h4>
            <p>
              This Agreement remains in effect until terminated by either party. The Company reserves the right to terminate this Agreement and your access to the Platform at any time for any reason, 
              including but not limited to violation of this Agreement or applicable laws.
            </p>
            
            <h4 className="text-base font-medium mt-4">9. Governing Law</h4>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of Switzerland, without regard to its conflict of law principles.
            </p>
            
            <h4 className="text-base font-medium mt-4">10. Digital Signature</h4>
            <p>
              By clicking "Sign License with Wallet," you are providing your digital signature and agreeing to be bound by the terms and conditions of this Agreement.
              This digital signature shall have the same validity and enforceability as a physical signature.
            </p>
          </div>
        </ScrollArea>
      </Card>
      
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-amber-700 text-sm">
            You need to connect your wallet before you can sign the license agreement.
          </p>
        </div>
      )}
      
      <Button 
        disabled={!isConnected || loading} 
        onClick={handleSignLicense}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? (
          <span className="flex items-center">
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
            Signing...
          </span>
        ) : (
          <span className="flex items-center">
            <PenLine className="h-5 w-5 mr-2" />
            Sign License with Wallet
          </span>
        )}
      </Button>
    </div>
  );
}