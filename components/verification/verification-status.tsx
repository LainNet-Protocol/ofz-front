"use client"

import { useEffect } from "react";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  BarChart4,
  RefreshCcw,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function VerificationStatus() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    isConnected, 
    address, 
    isSignedLicense, 
    kycStatus,
    checkWhitelistStatus,
    startPollingWhitelistStatus,
    stopPollingWhitelistStatus
  } = useWeb3();

  // Add debug logging
  useEffect(() => {
    console.log("VerificationStatus: Component mounted");
    console.log("Connection state:", { isConnected, address, isSignedLicense, kycStatus });
  }, [isConnected, address, isSignedLicense, kycStatus]);

  // Start polling if status is pending - only on first render
  useEffect(() => {
    // Flag to track if this effect has already run
    let hasStartedPolling = false;
    
    const setupPolling = async () => {
      // Only run this once per component mount and only if needed
      if (hasStartedPolling || !isConnected || !isSignedLicense || kycStatus !== 'pending') {
        return;
      }
      
      hasStartedPolling = true;
      console.log('VerificationStatus: Initial polling setup');
      
      // Start polling for whitelist status
      await startPollingWhitelistStatus();
    };
    
    setupPolling();
    
    // Cleanup on unmount
    return () => {
      console.log('VerificationStatus: Component unmounting, cleaning up polling');
      stopPollingWhitelistStatus();
    };
  // Only run this effect on mount and unmount, not on every dependency change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for manual check of whitelist status
  const handleCheckWhitelistStatus = async () => {
    if (!isConnected || !isSignedLicense) return;
    
    try {
      toast({
        title: "Checking verification status",
        description: "Checking your on-chain verification status...",
        variant: "default",
      });
      
      const whitelistData = await checkWhitelistStatus();
      
      if (whitelistData.isValid) {
        toast({
          title: "Verification Complete",
          description: "Your KYC verification has been approved.",
          variant: "default",
        });
        router.refresh();
      } else if (kycStatus === 'pending') {
        toast({
          title: "Still Pending",
          description: "Your verification is still being processed. We'll continue to check for updates.",
          variant: "default",
        });
        // Restart polling
        startPollingWhitelistStatus();
      }
    } catch (error) {
      console.error("Error checking whitelist status:", error);
      toast({
        title: "Error",
        description: "Failed to check your verification status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">Wallet Not Connected</h3>
          <p className="mt-2 text-amber-700">
            Please connect your wallet to check your verification status.
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/')}
          >
            Go to Home Page
          </Button>
        </div>
      </Card>
    );
  }

  if (!isSignedLicense) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">License Not Signed</h3>
          <p className="mt-2 text-amber-700">
            You need to sign the license agreement before proceeding to verification.
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/license')}
          >
            Sign License Agreement
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Wallet Section */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Wallet</h3>
        <div className="flex items-center">
          <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full mr-3">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Wallet Address</p>
            <p className="font-mono text-gray-900">{address}</p>
          </div>
        </div>
      </Card>
      
      {/* Verification Status Section */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Status</h3>
        
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="relative flex items-center justify-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                kycStatus === 'approved' 
                  ? 'bg-green-100' 
                  : kycStatus === 'pending' 
                    ? 'bg-amber-100' 
                    : kycStatus === 'rejected' 
                      ? 'bg-red-100' 
                      : 'bg-gray-100'
              }`}>
                {kycStatus === 'approved' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {kycStatus === 'pending' && <Clock className="h-6 w-6 text-amber-600" />}
                {kycStatus === 'rejected' && <XCircle className="h-6 w-6 text-red-600" />}
                {kycStatus === 'none' && <Upload className="h-6 w-6 text-gray-400" />}
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium">
                {kycStatus === 'approved' && 'Verified'}
                {kycStatus === 'pending' && 'Pending Verification'}
                {kycStatus === 'rejected' && 'Verification Rejected'}
                {kycStatus === 'none' && 'Not Submitted'}
              </h4>
              <p className="text-sm text-gray-500">
                {kycStatus === 'approved' && 'Your identity has been verified successfully.'}
                {kycStatus === 'pending' && 'Your documents are being reviewed.'}
                {kycStatus === 'rejected' && 'Your verification was rejected. Please check the reason below.'}
                {kycStatus === 'none' && 'You have not submitted your KYC documents yet.'}
              </p>
            </div>
          </div>
          
          {kycStatus === 'approved' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium">Verification Complete</p>
                  <p className="text-green-700 text-sm mt-1">
                    Your account is fully verified. You can now access the marketplace and invest in OFZ bonds.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kycStatus === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium">Verification In Progress</p>
                  <p className="text-amber-700 text-sm mt-1">
                    Your documents are being reviewed. This process typically takes 24-48 hours. 
                    Please check back later.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kycStatus === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Verification Rejected</p>
                  <p className="text-red-700 text-sm mt-1">
                    Your verification was rejected for the following reason: 
                    <span className="block mt-1 font-medium">Document quality was too low. Please upload a clearer image.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kycStatus === 'none' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex">
                <Upload className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-gray-800 font-medium">KYC Not Submitted</p>
                  <p className="text-gray-700 text-sm mt-1">
                    You need to submit your KYC documents to access the marketplace and invest in OFZ bonds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {kycStatus === 'approved' && (
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/marketplace')}
          >
            <BarChart4 className="h-5 w-5 mr-2" />
            Go to Marketplace
          </Button>
        )}
        
        {kycStatus === 'pending' && (
          <Button 
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={handleCheckWhitelistStatus}
          >
            <RefreshCcw className="h-5 w-5 mr-2" />
            Refresh Status
          </Button>
        )}
        
        {(kycStatus === 'rejected' || kycStatus === 'none') && (
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/kyc')}
          >
            <Upload className="h-5 w-5 mr-2" />
            {kycStatus === 'rejected' ? 'Re-submit KYC Documents' : 'Submit KYC Documents'}
          </Button>
        )}
      </Card>
    </div>
  );
}