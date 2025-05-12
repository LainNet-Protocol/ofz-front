"use client"

import React from 'react';
import { useEnsAvatar, useEnsName } from 'wagmi';
import Image from 'next/image';
import { Wallet } from 'lucide-react';

interface WalletAvatarProps {
  address?: string;
  size?: number;
  showAddress?: boolean;
}

export function WalletAvatar({ address, size = 40, showAddress = true }: WalletAvatarProps) {
  const { data: ensName } = useEnsName({ address: address as `0x${string}` });
  const { data: avatar } = useEnsAvatar({ name: ensName || undefined });
  
  if (!address) return null;
  
  const displayAddress = ensName ?? `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  // Generate background color based on address (simple hashing)
  const getBackgroundColor = (addr: string) => {
    const hash = addr.toLowerCase().split('').reduce((a, b) => {
      return ((a << 5) - a) + b.charCodeAt(0) | 0;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 90%)`;
  };
  
  // Generate text color (darker version of background)
  const getTextColor = (addr: string) => {
    const hash = addr.toLowerCase().split('').reduce((a, b) => {
      return ((a << 5) - a) + b.charCodeAt(0) | 0;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 30%)`;
  };
  
  return (
    <div className="flex items-center">
      {avatar ? (
        <Image
          src={avatar}
          alt="ENS Avatar"
          width={size}
          height={size}
          className="rounded-full object-cover"
        />
      ) : (
        <div 
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: getBackgroundColor(address),
            color: getTextColor(address)
          }}
          className="rounded-full flex items-center justify-center"
        >
          {address.slice(2, 4).toUpperCase()}
        </div>
      )}
      
      {showAddress && (
        <span className="ml-2 font-medium">{displayAddress}</span>
      )}
    </div>
  );
} 