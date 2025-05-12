"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { readContract as wagmiReadContract } from 'wagmi/actions';
import { holesky } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { WalletConnectionAlert } from '@/components/ui/WalletConnectionAlert';
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";

// Configure Wagmi with Holesky testnet
const config = createConfig({
  chains: [holesky],
  transports: {
    [holesky.id]: http('https://ethereum-holesky.blockpi.network/v1/rpc/4a51167eb43f45c938311689e7514635fe357842'),
  },
  connectors: [
    injected(), // This enables MetaMask and other injected wallets
  ],
});

const queryClient = new QueryClient();

// NFT Contract ABI for the isWhitelisted function
const NFT_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "isWhitelisted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "mainAccount",
        "type": "address"
      },
      {
        "internalType": "uint40",
        "name": "expiration",
        "type": "uint40"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Use the contract address from centralized config
const NFT_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.NFT_CONTRACT_ADDRESS as `0x${string}`;
console.log('NFT_CONTRACT_ADDRESS123432423');
console.log(CONTRACT_ADDRESSES);

// Interface for whitelist data
interface WhitelistData {
  isWhitelisted: boolean;
  mainAccount: string;
  expiration: bigint;
  isValid: boolean; // true if whitelisted and not expired
}

// Mock web3 functionality - Replace with actual RainbowKit/Wagmi implementation
interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isSignedLicense: boolean;
  isKycSubmitted: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  connectWallet: () => Promise<void>;
  signLicense: () => Promise<string>;
  submitKyc: (data: any) => Promise<void>;
  disconnectWallet: () => void;
  checkWhitelistStatus: () => Promise<WhitelistData>;
  startPollingWhitelistStatus: () => Promise<void>;
  stopPollingWhitelistStatus: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Web3ContextProvider>{children}</Web3ContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function Web3ContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  
  const [isSignedLicense, setIsSignedLicense] = useState(false);
  const [isKycSubmitted, setIsKycSubmitted] = useState(false);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [showWalletAlert, setShowWalletAlert] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [whitelistData, setWhitelistData] = useState<WhitelistData | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
    console.log("Web3Provider mounted, isConnected:", isConnected);
    console.log("NFT_CONTRACT_ADDRESS in provider:", NFT_CONTRACT_ADDRESS);
    console.log("All contract addresses:", CONTRACT_ADDRESSES);
  }, [isConnected]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Check license status on mount and address change
  useEffect(() => {
    if (address) {
      console.log("Address changed or detected:", address);
      const licenseStatus = localStorage.getItem(`licenseStatus_${address}`);
      setIsSignedLicense(licenseStatus === 'signed');
      
      const storedKycStatus = localStorage.getItem(`kycStatus_${address}`) as any;
      setKycStatus(storedKycStatus || 'none');
      setIsKycSubmitted(storedKycStatus === 'pending' || storedKycStatus === 'approved');
    }
  }, [address]);

  // Real wallet connection implementation
  const connectWallet = async () => {
    try {
      // Check if window.ethereum exists (actual indicator of MetaMask being installed)
      if (typeof window !== 'undefined' && !window.ethereum) {
        console.log('No wallet detected: window.ethereum is not available');
        setShowWalletAlert(true);
        return;
      }
      
      // Debug logs
      console.log('Available connectors:', connectors);
      
      // Check for MetaMask specifically
      const metamaskConnector = connectors.find(
        connector => connector.name === 'MetaMask' || connector.name === 'Injected'
      );

      if (!metamaskConnector) {
        console.log('No MetaMask connector found');
        setShowWalletAlert(true);
        return;
      }

      console.log('Connecting to MetaMask...');
      
      try {
        await connect({ connector: metamaskConnector });
      } catch (error) {
        console.error('Connection error:', error);
        // If connection fails, show the wallet alert
        setShowWalletAlert(true);
        return;
      }
      
      // Check if user has signed license
      if (address) {
        const licenseStatus = localStorage.getItem(`licenseStatus_${address}`);
        setIsSignedLicense(licenseStatus === 'signed');
        
        // Check KYC status
        const storedKycStatus = localStorage.getItem(`kycStatus_${address}`) as any;
        setKycStatus(storedKycStatus || 'none');
        setIsKycSubmitted(storedKycStatus === 'pending' || storedKycStatus === 'approved');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      // Show wallet alert on any error
      setShowWalletAlert(true);
      throw error;
    }
  };

  const signLicense = async () => {
    if (!address) return '';

    console.log('Starting license signing process...');
    try {
      // Create the license message
      const licenseMessage = `I, ${address}, hereby agree to the terms and conditions of the OFZ Crypto Portal License Agreement. This signature serves as my digital consent to be bound by all terms and conditions outlined in the agreement.`;

      console.log('Requesting signature from wallet for message:', licenseMessage);

      // Use signMessageAsync instead for better promise handling
      const signature = await signMessageAsync({ 
        message: licenseMessage 
      });
      
      console.log('Received signature result:', signature);
      
      // Only if we get a valid signature back
      if (signature) {
      // Store the signature in localStorage
      localStorage.setItem(`licenseStatus_${address}`, 'signed');
      localStorage.setItem(`licenseSignature_${address}`, signature);
      
      // Update the signed state
      setIsSignedLicense(true);
        console.log('License marked as signed');
      }
      
      // Return the signature for verification if needed
      return signature;
    } catch (error) {
      console.error('Error signing license (detailed):', error);
      // Reset the signed state if there's an error
      setIsSignedLicense(false);
      throw error;
    }
  };

  // Function to check if the user is whitelisted on the NFT contract
  const checkWhitelistStatus = async (): Promise<WhitelistData> => {
    // Track when this check is called for debugging
    const timestamp = new Date().toISOString();
    const checkId = Math.random().toString(36).substring(7);
    
    if (!address) {
      console.log(`[${timestamp}][${checkId}] checkWhitelistStatus: No address available`);
      return {
        isWhitelisted: false,
        mainAccount: '0x0000000000000000000000000000000000000000',
        expiration: BigInt(0),
        isValid: false
      };
    }
    
    try {
      console.log(`[${timestamp}][${checkId}] Checking whitelist for ${address.substring(0, 8)}...`);
      
      // Use wagmi's readContract action to query the blockchain
      const result = await wagmiReadContract(config, {
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_CONTRACT_ABI,
        functionName: 'isWhitelisted',
        args: [address],
      });
      
      if (result) {
        // Parse result - contract returns [boolean, address, uint40]
        // uint40 will be treated as a bigint in JavaScript
        const [isWhitelisted, mainAccount, expiration] = result as [boolean, string, bigint];
        
        // Only log once per check
        console.log(`[${timestamp}][${checkId}] Whitelist result: {isWhitelisted: ${isWhitelisted}, expiration: ${expiration.toString()}}`);
        
        // Check if expiration is valid (current time < expiration)
        const currentTime = BigInt(Math.floor(Date.now() / 1000)); // Current time in seconds
        const isValid = isWhitelisted && expiration > currentTime;
        
        const whitelistInfo = {
          isWhitelisted,
          mainAccount,
          expiration,
          isValid
        };
        
        // Store the whitelist data
        setWhitelistData(whitelistInfo);
        
        // If whitelisted and valid, update KYC status to approved
        if (isValid) {
          console.log(`[${timestamp}][${checkId}] Whitelist is valid, updating KYC status to approved`);
          localStorage.setItem(`kycStatus_${address}`, 'approved');
          setKycStatus('approved');
          setIsKycSubmitted(true);
          
          // Make sure polling stops once approved
          stopPollingWhitelistStatus();
        }
        
        return whitelistInfo;
      }
    } catch (error) {
      console.error(`[${timestamp}][${checkId}] Error checking whitelist status:`, error);
    }
    
    // Default return if contract call fails
    return {
      isWhitelisted: false,
      mainAccount: '0x0000000000000000000000000000000000000000',
      expiration: BigInt(0),
      isValid: false
    };
  };

  // Prevent multiple polling instances
  const [isPolling, setIsPolling] = useState(false);

  // Function to start polling for whitelist status
  const startPollingWhitelistStatus = async (): Promise<void> => {
    // If we're already polling, don't start another interval
    if (isPolling || pollingInterval) {
      console.log('Already polling for whitelist status, skipping new poll request');
      return;
    }
    
    // Check once immediately
    const initialStatus = await checkWhitelistStatus();
    
    // DEBUG PURPOSE -- remove before production
    // localStorage.setItem(`kycStatus_${address}`, 'approved');
    // setKycStatus('approved');

    // If already whitelisted, no need to poll
    if (initialStatus.isValid) {
      console.log('User is already whitelisted, no need to poll');
      localStorage.setItem(`kycStatus_${address}`, 'approved');
      setKycStatus('approved');
      return;
    }
    
    // Stop any existing polling first to prevent multiple intervals
    stopPollingWhitelistStatus();
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting whitelist status polling (every 15 seconds)`);
    
    // Set polling flag
    setIsPolling(true);
    
    // Start polling every 15 seconds
    const interval = setInterval(async () => {
      const checkTimestamp = new Date().toISOString();
      console.log(`[${checkTimestamp}] Running scheduled whitelist check`);
      const whitelistInfo = await checkWhitelistStatus();
      
      // If user becomes whitelisted with a valid expiration
      if (whitelistInfo.isValid) {
        console.log(`[${checkTimestamp}] User is now whitelisted!`);
        localStorage.setItem(`kycStatus_${address}`, 'approved');
        setKycStatus('approved');
        
        // Stop polling once approved
        stopPollingWhitelistStatus();
      }
    }, 15000); // Check every 15 seconds
    
    setPollingInterval(interval);
  };
  
  // Function to stop polling
  const stopPollingWhitelistStatus = (): void => {
    if (pollingInterval) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Stopping whitelist status polling`);
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setIsPolling(false);
    } else if (isPolling) {
      // Reset polling flag even if there is no interval
      setIsPolling(false);
    }
  };

  const submitKyc = async (data: any) => {
    if (!address) return;
    
    // First set status to pending
    localStorage.setItem(`kycStatus_${address}`, 'pending');
    setKycStatus('pending');
    setIsKycSubmitted(true);
    
    // Start polling for whitelist status
    await startPollingWhitelistStatus();
  };

  const disconnectWallet = () => {
    // Stop polling when disconnecting
    stopPollingWhitelistStatus();
    
    disconnect();
    setIsSignedLicense(false);
    setIsKycSubmitted(false);
    setKycStatus('none');
    setWhitelistData(null);
  };

  // Don't render anything until after hydration
  if (!isMounted) {
    return null;
  }

  return (
    <Web3Context.Provider
      value={{
        address: address || null,
        isConnected,
        isSignedLicense,
        isKycSubmitted,
        kycStatus,
        connectWallet,
        signLicense,
        submitKyc,
        disconnectWallet,
        checkWhitelistStatus,
        startPollingWhitelistStatus,
        stopPollingWhitelistStatus
      }}
    >
      {children}
      <WalletConnectionAlert 
        isOpen={showWalletAlert} 
        onClose={() => setShowWalletAlert(false)} 
      />
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
