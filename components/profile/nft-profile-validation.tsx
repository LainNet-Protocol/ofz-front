"use client"

import { useEffect, useState } from 'react';
import { UserProfile } from '@/components/profile/user-profile';
import { notFound } from 'next/navigation';
import { createPublicClient, http } from 'viem';
import { holesky } from 'viem/chains';
import { Loader2 } from 'lucide-react';
import { useAccount, useContractRead } from 'wagmi';
import { Card } from '@/components/ui/card';
import { AlertTriangle, User, ShieldCheck } from 'lucide-react';
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";

// NFT validation contract ABI
const isWhitelistedAbi = [
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
] as const;

// Use the contract address from centralized config
const NFT_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.NFT_CONTRACT_ADDRESS as `0x${string}`;

// Create a public client for read-only contract calls
const publicClient = createPublicClient({
  chain: holesky,
  transport: http(),
});

interface NFTProfileWithValidationProps {
  address: string;
}

export function NFTProfileWithValidation({ address }: NFTProfileWithValidationProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [hasNFT, setHasNFT] = useState(false);
  
  useEffect(() => {
    async function validateAddress() {
      try {
        // Check if the address has an NFT by calling the isWhitelisted function
        const result = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: isWhitelistedAbi,
          functionName: 'isWhitelisted',
          args: [address as `0x${string}`],
        });
        
        // First return value is a boolean indicating if address is whitelisted
        setHasNFT(result[0]);
        setIsValidating(false);
        
        // Log result for debugging
        console.log("Contract validation result:", result);
      } catch (error) {
        console.error("Error validating NFT address:", error);
        // If there's an error, we assume the address doesn't have an NFT
        setHasNFT(false);
        setIsValidating(false);
      }
    }
    
    validateAddress();
  }, [address]);
  
  // Loading state while validating
  if (isValidating) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-4xl flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-600">Validating address...</p>
      </div>
    );
  }
  
  // Show 404 if the address doesn't have an NFT
  if (!hasNFT) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">NFT Profile</h1>
      <p className="text-gray-600 mb-8">
        Viewing identity NFT profile for address: <span className="font-mono">{address}</span>
      </p>
      <UserProfile profileAddress={address} />
    </div>
  );
} 