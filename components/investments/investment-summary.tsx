"use client"

import { useState } from "react";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  AlertTriangle, 
  ArrowUpRight, 
  Clock, 
  Wallet,
  DollarSign,
  Calendar,
  Percent,
  BarChart4
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Sample investments data
const sampleInvestments = [
  {
    id: "inv-001",
    bondId: "ofz-26207",
    bondName: "OFZ-PD 26207",
    investmentDate: "2023-08-15",
    amount: 2500,
    yield: 8.2,
    maturityDate: "Feb 17, 2027",
    claimableTokens: 205,
    lastClaimedDate: "2023-11-15",
    nextClaimDate: "2024-02-15",
  },
  {
    id: "inv-002",
    bondId: "ofz-26222",
    bondName: "OFZ-PD 26222",
    investmentDate: "2023-10-21",
    amount: 1500,
    yield: 8.5,
    maturityDate: "Oct 16, 2024",
    claimableTokens: 127.5,
    lastClaimedDate: "2024-01-21",
    nextClaimDate: "2024-04-21",
  },
];

export function InvestmentSummary() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, isSignedLicense, kycStatus } = useWeb3();
  const [investments, setInvestments] = useState(sampleInvestments);
  const [loadingClaim, setLoadingClaim] = useState<string | null>(null);

  const handleClaimTokens = async (investmentId: string) => {
    setLoadingClaim(investmentId);
    
    // Simulate token claiming process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update investment data (reset claimable tokens)
    setInvestments(investments.map(inv => 
      inv.id === investmentId 
        ? { 
            ...inv, 
            claimableTokens: 0, 
            lastClaimedDate: new Date().toISOString().split('T')[0] 
          } 
        : inv
    ));
    
    setLoadingClaim(null);
    
    toast({
      title: "Tokens claimed successfully",
      description: "Your tokens have been sent to your wallet",
      variant: "default",
    });
  };
  
  // Calculate total portfolio value
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalClaimable = investments.reduce((sum, inv) => sum + inv.claimableTokens, 0);

  if (!isConnected) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">Wallet Not Connected</h3>
          <p className="mt-2 text-amber-700">
            Please connect your wallet to view your investments.
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
            You need to sign the license agreement before accessing your investments.
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

  if (kycStatus !== 'approved') {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">KYC Not Approved</h3>
          <p className="mt-2 text-amber-700">
            Your KYC verification must be approved before you can access your investments.
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/verification')}
          >
            Check Verification Status
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Wallet className="h-6 w-6 text-emerald-600 mr-3" />
              <div>
                <p className="text-sm text-emerald-700">Total Invested</p>
                <p className="text-2xl font-bold text-emerald-900">${totalInvested.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart4 className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-700">Average Yield</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(investments.reduce((sum, inv) => sum + inv.yield, 0) / investments.length).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-amber-600 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Claimable Tokens</p>
                <p className="text-2xl font-bold text-amber-900">{totalClaimable.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Investment List */}
      <h3 className="text-lg font-medium text-gray-900">Your Investments</h3>
      
      {investments.length === 0 ? (
        <Card className="p-6 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No investments yet</h3>
          <p className="text-gray-500 mt-2">
            You haven't made any investments yet. Visit the marketplace to get started.
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/marketplace')}
          >
            Go to Marketplace
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {investments.map((investment) => (
            <Card key={investment.id} className="overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{investment.bondName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Invested on {new Date(investment.investmentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                    Active
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Wallet className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Investment</p>
                      <p className="font-semibold">${investment.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Percent className="h-5 w-5 text-emerald-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Yield</p>
                      <p className="font-semibold text-emerald-600">{investment.yield}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Maturity</p>
                      <p className="font-semibold">{investment.maturityDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Next Claim</p>
                      <p className="font-semibold">{investment.nextClaimDate}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-amber-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-amber-700">Claimable Tokens</p>
                      <p className="text-lg font-bold text-amber-900">{investment.claimableTokens}</p>
                    </div>
                    <Button 
                      onClick={() => handleClaimTokens(investment.id)}
                      disabled={investment.claimableTokens === 0 || loadingClaim === investment.id}
                      className="bg-amber-600 hover:bg-amber-700"
                      size="sm"
                    >
                      {loadingClaim === investment.id ? (
                        <span className="flex items-center">
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                          Claiming...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Claim Tokens
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                <button
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center"
                  onClick={() => window.open(`https://bonds.finam.ru/details/${investment.bondId}`, '_blank')}
                >
                  View Bond Details
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <div className="flex justify-center mt-8">
        <Button 
          onClick={() => router.push('/marketplace')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <BarChart4 className="h-5 w-5 mr-2" />
          Explore More Investments
        </Button>
      </div>
    </div>
  );
}