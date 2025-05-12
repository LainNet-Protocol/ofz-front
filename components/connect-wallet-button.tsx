"use client"

import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/providers/web3-provider";
import { WalletIcon } from 'lucide-react';

interface ConnectWalletButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ConnectWalletButton({ 
  variant = "default", 
  size = "default",
  className = ""
}: ConnectWalletButtonProps) {
  const { isConnected, address, connectWallet, disconnectWallet } = useWeb3();

  const handleClick = async () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleClick}
      className={`font-medium transition-all ${className}`}
    >
      <WalletIcon className="w-4 h-4 mr-2" />
      {isConnected 
        ? `${address?.slice(0, 6)}...${address?.slice(-4)}` 
        : "Connect Wallet"}
    </Button>
  );
}