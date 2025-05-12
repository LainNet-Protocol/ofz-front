/**
 * Centralized contract addresses for the application
 * Values are loaded from environment variables
 */

export const CONTRACT_ADDRESSES = {
  // NFT Contract used for user verification
  NFT_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS,
  
  // Bond-related contracts
  BOND_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_BOND_FACTORY_ADDRESS,
  BOND_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_BOND_ORACLE_ADDRESS,
  MULTICALL3_ADDRESS: process.env.NEXT_PUBLIC_MULTICALL3_ADDRESS,
  SRUB_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_SYNTHETIC_RUB_ADDRESS,

  // Other addresses from app/nft/[address]/page.tsx
  PROFILE_ADDRESSES: [
    '0x537C8f3d3E18dF5517a58B3fB9D9143697996802',
    '0x3e68b4f5209aFC5919b9cFE94d6E928C87270bFf'
  ],
  
  // Zero address constant
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000'
}; 