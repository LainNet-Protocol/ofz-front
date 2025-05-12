"use client"

import { useState, useEffect } from "react";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { WalletAvatar } from "@/components/ui/wallet-avatar";
import { useAccount, useContractRead, useWriteContract, useWatchContractEvent } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";

// SoulBoundIdentityNFT contract ABI (relevant parts)
const soulBoundNFTAbi = [
  {
    inputs: [{name: "subAccount", type: "address"}],
    name: "addSubAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{name: "subAccount", type: "address"}],
    name: "removeSubAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getSubAccounts",
    outputs: [{name: "", type: "address[]"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{name: "mainAccount", type: "address"}],
    name: "getSubAccounts",
    outputs: [{name: "", type: "address[]"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{name: "account", type: "address"}],
    name: "isWhitelisted",
    outputs: [
      {name: "", type: "bool"},
      {name: "mainAccount", type: "address"},
      {name: "expiration", type: "uint40"},
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "tokenOwner", type: "address"},
      {indexed: false, name: "subAccount", type: "address"},
    ],
    name: "SubAccountAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "tokenOwner", type: "address"},
      {indexed: false, name: "subAccount", type: "address"},
    ],
    name: "SubAccountRemoved",
    type: "event",
  },
] as const;

// Update the NFT Contract Address
const NFT_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.NFT_CONTRACT_ADDRESS as `0x${string}`;

interface UserProfileProps {
  profileAddress?: string; // Address from URL parameter
}

export function UserProfile({ profileAddress }: UserProfileProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, address, isSignedLicense, kycStatus } = useWeb3();
  const { address: wagmiAddress } = useAccount();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [delegatedWallets, setDelegatedWallets] = useState<Array<{
    address: string;
    status: string;
    type: string;
    dateAdded: string;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  
  // Use the profile address from props, or fall back to connected wallet address
  const targetAddress = profileAddress || address;
  
  // Determine if the connected wallet is the owner of this profile
  const isOwner = isConnected && address && targetAddress?.toLowerCase() === address.toLowerCase();

  const nftExpirationDate = "2025-12-31"; // This should come from the contract in production
  const isNftExpired = new Date(nftExpirationDate) < new Date();

  // Get subaccounts from contract using target address
  const { data: subAccounts, isLoading: isLoadingSubAccounts, refetch: refetchSubAccounts } = useContractRead({
    address: NFT_CONTRACT_ADDRESS,
    abi: soulBoundNFTAbi,
    functionName: 'getSubAccounts',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
  });

  // Contract write function
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Watch for contract events
  useWatchContractEvent({
    address: NFT_CONTRACT_ADDRESS,
    abi: soulBoundNFTAbi,
    eventName: 'SubAccountAdded',
    onLogs: (logs) => {
      console.log("SubAccountAdded event received:", logs);
      refetchSubAccounts();
      if (currentOperation === 'add') {
        toast({
          title: "Wallet delegated successfully",
          description: "The new wallet has been added as a subaccount",
          variant: "default",
        });
        setIsDialogOpen(false);
        setNewWalletAddress("");
        setCurrentOperation(null);
        setIsProcessing(false);
      }
    },
  });

  useWatchContractEvent({
    address: NFT_CONTRACT_ADDRESS,
    abi: soulBoundNFTAbi,
    eventName: 'SubAccountRemoved',
    onLogs: (logs) => {
      console.log("SubAccountRemoved event received:", logs);
      refetchSubAccounts();
      if (currentOperation === 'remove') {
        toast({
          title: "Wallet removed",
          description: "The delegated wallet has been removed successfully",
          variant: "default",
        });
        setCurrentOperation(null);
        setIsProcessing(false);
      }
    },
  });

  // Format subaccounts data when it changes
  useEffect(() => {
    if (subAccounts && Array.isArray(subAccounts) && subAccounts.length > 0) {
      const formattedWallets = subAccounts.map((account) => ({
        address: account,
        status: 'active',
        type: 'full-access',
        dateAdded: new Date().toISOString().split('T')[0], // We don't have this info from contract
      }));
      setDelegatedWallets(formattedWallets);
    } else {
      setDelegatedWallets([]);
    }
  }, [subAccounts]);

  const handleDelegateWallet = async () => {
    // Trim and basic validation
    const cleanAddress = newWalletAddress.trim();
    
    if (!cleanAddress || !cleanAddress.startsWith('0x') || cleanAddress.length !== 42) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address (0x followed by 40 hex characters)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // For debugging purposes, check common revert scenarios
      if (cleanAddress.toLowerCase() === address?.toLowerCase()) {
        console.warn("Warning: User is trying to add their own address as a subaccount");
        toast({
          title: "Warning",
          description: "You're trying to add your own address as a subaccount. This might not be allowed by the contract.",
          variant: "destructive",
        });
        // Continue anyway for debugging
      }
      
      // Check if this subaccount already exists
      if (delegatedWallets.some(wallet => wallet.address.toLowerCase() === cleanAddress.toLowerCase())) {
        console.warn("Warning: This address is already a subaccount");
        toast({
          title: "Warning",
          description: "This address is already registered as a subaccount. The contract might revert this transaction.",
          variant: "destructive",
        });
        // Continue anyway for debugging
      }
      
      // Check if the user has permission (is the NFT owner)
      if (!isConnected || !address || !isOwner) {
        console.error("Error: User is not connected or is not the owner");
        toast({
          title: "Permission Error",
          description: "You need to be connected with the wallet that owns this identity NFT",
          variant: "destructive",
        });
        return;
      }
      
      // Debug logs
      console.log("DEBUG - Adding subaccount");
      console.log("- Subaccount address:", cleanAddress);
      console.log("- Contract address:", NFT_CONTRACT_ADDRESS);
      console.log("- Main account:", address);
      console.log("- Connected with wagmi address:", wagmiAddress);
      console.log("- Current wallet list:", delegatedWallets);
      
      setCurrentOperation('add');
      setIsProcessing(true);
      
      // Execute the transaction
      const hash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: soulBoundNFTAbi,
        functionName: 'addSubAccount',
        args: [cleanAddress as `0x${string}`],
      });
      
      console.log("Transaction submitted - hash:", hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Your request has been submitted to the blockchain",
      });
      
      // Display link to etherscan for debugging
      console.log(`View transaction on explorer: https://holesky.etherscan.io/tx/${hash}`);
      
    } catch (error: any) {
      console.error("Transaction error:", error);
      
      // Deep error inspection
      console.log("Error type:", typeof error);
      console.log("Error properties:", Object.keys(error));
      console.log("Error stringified:", JSON.stringify(error, null, 2));
      
      setIsProcessing(false);
      setCurrentOperation(null);
      
      // Attempt to extract helpful information from the error
      let errorMessage = "Failed to add delegated wallet";
      
      if (error?.message) {
        // Look for common error patterns
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction";
        } else if (error.message.includes("execution reverted")) {
          // Try to extract the revert reason if available
          const revertMatch = error.message.match(/execution reverted: (.*?)(?:"|$)/);
          if (revertMatch && revertMatch[1]) {
            errorMessage = `Contract reverted: ${revertMatch[1]}`;
          } else {
            errorMessage = "Transaction failed: The contract reverted execution";
          }
        } else {
          // Just use the beginning of the error message
          errorMessage = error.message.substring(0, 100);
        }
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRemoveWallet = async (walletAddress: string) => {
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      toast({
        title: "Invalid address",
        description: "Invalid wallet address format",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Check if the user is the owner
      if (!isOwner) {
        toast({
          title: "Permission Error",
          description: "Only the owner of this identity NFT can remove delegated wallets",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Removing subaccount:", walletAddress);
      
      setCurrentOperation('remove');
      setIsProcessing(true);
      
      const hash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: soulBoundNFTAbi,
        functionName: 'removeSubAccount',
        args: [walletAddress as `0x${string}`],
      });
      
      console.log("Remove transaction submitted, hash:", hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Your request to remove the wallet has been submitted",
      });
      
      // Success will be handled by event listeners
      
    } catch (error: any) {
      console.error("Transaction error:", error);
      setIsProcessing(false);
      setCurrentOperation(null);
      
      // Extract useful error message
      let errorMessage = "Failed to remove delegated wallet";
      
      if (error?.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error.message.includes("execution reverted")) {
          const revertMatch = error.message.match(/execution reverted: (.*?)(?:"|$)/);
          if (revertMatch && revertMatch[1]) {
            errorMessage = `Contract reverted: ${revertMatch[1]}`;
          } else {
            errorMessage = "Transaction failed: The contract reverted execution";
          }
        } else {
          errorMessage = error.message.substring(0, 100);
        }
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // If no address is provided (either via props or connection), show an error
  if (!targetAddress) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">Address Not Found</h3>
          <p className="mt-2 text-amber-700">
            No address was provided to view the profile.
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

  // Check if owner needs to sign license (only if they're trying to manage the profile)
  if (isOwner && !isSignedLicense) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">License Not Signed</h3>
          <p className="mt-2 text-amber-700">
            You need to sign the license agreement before managing your profile.
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
    <div className="space-y-8">
      {/* NFT Identity Section */}
      <Card className="overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Identity NFT</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-5 w-5 text-gray-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This NFT represents your verified identity on the platform.
                    It's non-transferable and linked to your KYC verification.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex justify-center items-center">
              <div className="relative w-64 h-64 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-lg border-2 border-emerald-200 flex items-center justify-center">
                {kycStatus === 'approved' || !isOwner ? (
                  <Image
                    src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${targetAddress}`}
                    alt="Identity NFT"
                    width={256}
                    height={256}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <Shield className="w-24 h-24 text-emerald-300" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Verified Identity NFT</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Soulbound token representing your verified identity
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center">
                  <Wallet className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">NFT Owner</p>
                    <WalletAvatar address={targetAddress || undefined} />
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Valid Until</p>
                    <p className={`font-medium ${isNftExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                      {nftExpirationDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kycStatus === 'approved' || !isOwner
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {kycStatus === 'approved' || !isOwner ? 'Verified' : 'Pending Verification'}
                    </div>
                  </div>
                </div>
              </div>

              {isOwner && isNftExpired && (
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push('/kyc')}
                >
                  Re-verify KYC
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Delegated Wallets Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delegated Wallets</h2>
              <p className="text-sm text-gray-500 mt-1">
                {isOwner ? "Allow trusted wallets to access your OFZ positions" : "Wallets authorized to access OFZ positions"}
              </p>
            </div>
            {isOwner && (
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isProcessing}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add Wallet
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {isLoadingSubAccounts && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading delegated wallets...</p>
              </div>
            )}
            
            {!isLoadingSubAccounts && delegatedWallets.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No delegated wallets</h3>
                <p className="text-gray-500 mt-2">
                  {isOwner 
                    ? "Add trusted wallets to manage your OFZ positions" 
                    : "This account has no delegated wallets configured"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {delegatedWallets.map((wallet) => (
                  <div 
                    key={wallet.address}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        wallet.status === 'active' 
                          ? 'bg-emerald-100' 
                          : 'bg-amber-100'
                      }`}>
                        <img 
                          src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${wallet.address}`}
                          alt="Wallet avatar"
                          className={`h-5 w-5 rounded-full ${
                            wallet.status === 'active' 
                              ? 'border-2 border-emerald-600' 
                              : 'border-2 border-amber-600'
                          }`}
                        />
                      </div>
                      <div>
                        <WalletAvatar address={wallet.address} size={32} />
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            wallet.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {wallet.status === 'active' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {wallet.status.charAt(0).toUpperCase() + wallet.status.slice(1)}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            wallet.type === 'full-access'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {wallet.type === 'full-access' ? 'Full Access' : 'Read Only'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => handleRemoveWallet(wallet.address)}
                        disabled={isProcessing}
                      >
                        {isProcessing && currentOperation === 'remove' ? (
                          <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Add Wallet Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Delegated Wallet</DialogTitle>
            <DialogDescription>
              Enter the wallet address you want to delegate access to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="wallet" className="text-sm font-medium">
                Wallet Address
              </label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={newWalletAddress}
                onChange={(e) => {
                  // Clean up and validate the address as it's typed
                  let address = e.target.value.trim();
                  setNewWalletAddress(address);
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelegateWallet}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!newWalletAddress || isProcessing}
            >
              {isProcessing && currentOperation === 'add' ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Wallet
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}