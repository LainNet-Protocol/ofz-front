import { useAccount, useContractRead, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, parseUnits, createPublicClient, http } from 'viem';
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { holesky } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '../config/contract-addresses';

// Create a public client
const client = createPublicClient({
  chain: holesky,
  transport: http('https://ethereum-holesky.blockpi.network/v1/rpc/4a51167eb43f45c938311689e7514635fe357842'),
});

// Constants from the contract
export const COLLATERALIZATION_RATIO = 150;
export const LIQUIDATION_THRESHOLD = 120;

// ABI with just the functions we need
const sRUBABI = [
  // Constants and public variables
  {
    inputs: [],
    name: 'COLLATERALIZATION_RATIO',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'LIQUIDATION_THRESHOLD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'LIQUIDATION_PENALTY',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_COLLATERAL_TOKENS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastUpdateTimestamp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // User position data
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'userPositions',
    outputs: [{ name: 'debtAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Read functions
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getTotalCollateralValue',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getPositionHealth',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserCollaterals',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'collateral', type: 'address' },
    ],
    name: 'getUserCollateralAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserDebt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collateral', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'previewDecrease',
    outputs: [
      { name: 'canWithdraw', type: 'bool' },
      { name: 'sRUBToBurn', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'collateral', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'depositCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collateral', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'decreasePosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'increasePosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'collateral', type: 'address' },
    ],
    name: 'liquidatePosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI for allowance and approve
const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Contract address from configuration
const SRUB_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.SRUB_CONTRACT_ADDRESS as `0x${string}`;

// Type for position data
type PositionData = {
  collateralAmount: bigint;
  debtAmount: bigint;
  collateralToken: Address;
};

export function useSRUBContract() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [pendingApprovalToken, setPendingApprovalToken] = useState<Address | null>(null);
  const [pendingApprovalAmount, setPendingApprovalAmount] = useState<string>('');
  const [isManuallyClosingApprovalDialog, setIsManuallyClosingApprovalDialog] = useState(false);

  // Get debt amount from userPositions
  const { data: debtAmount, refetch: refetchDebt } = useContractRead({
    address: SRUB_CONTRACT_ADDRESS,
    abi: sRUBABI,
    functionName: 'getUserDebt',
    args: address ? [address] : undefined,
  });

  // Get total collateral value
  const { data: collateralValue, refetch: refetchCollateralValue } = useContractRead({
    address: SRUB_CONTRACT_ADDRESS,
    abi: sRUBABI,
    functionName: 'getTotalCollateralValue',
    args: address ? [address] : undefined,
  });

  // Get position health
  const { data: positionHealth, refetch: refetchHealth } = useContractRead({
    address: SRUB_CONTRACT_ADDRESS,
    abi: sRUBABI,
    functionName: 'getPositionHealth',
    args: address ? [address] : undefined,
  });

  // Get user collaterals
  const { data: userCollaterals, refetch: refetchCollaterals } = useContractRead({
    address: SRUB_CONTRACT_ADDRESS,
    abi: sRUBABI,
    functionName: 'getUserCollaterals',
    args: address ? [address] : undefined,
  });

  // Setup contract writes with useWriteContract
  const { 
    writeContractAsync,
    isPending: isWritePending
  } = useWriteContract();

  // We need to track the collateral token and amount for the UI
  const [collateralTokens, setCollateralTokens] = useState<`0x${string}`[]>([]);
  const [totalCollateralAmount, setTotalCollateralAmount] = useState<bigint>(BigInt(0));

  // Update collateral tokens and amounts when userCollaterals changes
  useEffect(() => {
    if (userCollaterals && Array.isArray(userCollaterals) && address) {
      // Make sure the tokens are properly typed as 0x-prefixed strings
      const typedTokens = (userCollaterals as unknown[]).map(token => {
        // Ensure each token is properly typed
        if (typeof token === 'string' && token.startsWith('0x')) {
          return token as `0x${string}`;
        }
        console.error('Invalid token address format:', token);
        return '0x0000000000000000000000000000000000000000' as `0x${string}`;
      });
      
      setCollateralTokens(typedTokens);
      
      // For each collateral token, fetch the amount
      const fetchCollateralAmounts = async () => {
        let totalAmount = BigInt(0);
        for (const token of typedTokens) {
          try {
            const amount = await client.readContract({
              address: SRUB_CONTRACT_ADDRESS,
              abi: sRUBABI,
              functionName: 'getUserCollateralAmount',
              args: [address as `0x${string}`, token],
            });
            totalAmount += amount as bigint;
          } catch (error) {
            console.error('Error fetching collateral amount:', error);
          }
        }
        setTotalCollateralAmount(totalAmount);
      };
      
      fetchCollateralAmounts();
    } else {
      setCollateralTokens([]);
      setTotalCollateralAmount(BigInt(0));
    }
  }, [userCollaterals, address]);

  // Parse position data
  const position: PositionData = {
    collateralAmount: totalCollateralAmount,
    debtAmount: debtAmount !== undefined ? (debtAmount as bigint) : BigInt(0),
    collateralToken: collateralTokens.length > 0 ? collateralTokens[0] : '0x0000000000000000000000000000000000000000' as `0x${string}`,
  };

  // Calculate LTV
  const ltv = position.debtAmount > BigInt(0) && collateralValue && (collateralValue as bigint) > BigInt(0)
    ? Number((position.debtAmount * BigInt(100)) / (collateralValue as bigint))
    : 0;

  // Refetch all data
  const refetchAll = () => {
    refetchDebt();
    refetchCollateralValue();
    refetchHealth();
    refetchCollaterals();
  };

  // Watch for transaction receipt
  const { isLoading: isWaitingForTransaction } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  // Track loading states for different operations
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);

  // Separate function to check allowance
  const checkAllowance = async (token: Address): Promise<boolean> => {
    if (!address) return false;
    
    try {
      const allowance = await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, SRUB_CONTRACT_ADDRESS],
      });
      return allowance > BigInt(0);
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  };

  // Simplified approval function
  const handleApprove = async () => {
    if (!pendingApprovalToken) return;

    try {
      setCurrentOperation('approve');
      // Clear any pending transaction hash
      setLastTxHash(undefined);
      
      const hash = await writeContractAsync({
        address: pendingApprovalToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SRUB_CONTRACT_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')], // type(uint256).max
      });
      
      setLastTxHash(hash);
      
      toast({
        title: 'Approval Initiated',
        description: 'Your token approval transaction has been submitted.',
      });
      
      // Close approval dialog after approval is initiated
      setIsApprovalDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error?.message?.substring(0, 100) || 'Transaction failed',
        variant: 'destructive',
      });
      // Reset approval state on error
      setPendingApprovalToken(null);
      setPendingApprovalAmount('');
      setIsApprovalDialogOpen(false);
    } finally {
      setCurrentOperation(null);
    }
  };

  // Close approval dialog without approving
  const cancelApproval = () => {
    setIsManuallyClosingApprovalDialog(true);
    setPendingApprovalToken(null);
    setPendingApprovalAmount('');
    setIsApprovalDialogOpen(false);
    // Reset the flag after a short delay
    setTimeout(() => {
      setIsManuallyClosingApprovalDialog(false);
    }, 100);
  };

  // Deposit collateral with approval check
  const handleDepositCollateral = async (token: Address, amount: string) => {
    try {
      // Don't recheck allowance if we're already in an approval flow
      if (!pendingApprovalToken) {
        // Check allowance first
        const hasAllowance = await checkAllowance(token);
        
        if (!hasAllowance) {
          // Store the deposit details for approval
          setPendingApprovalToken(token);
          setPendingApprovalAmount(amount);
          setIsApprovalDialogOpen(true);
          return;
        }
      }

      // If we get here, either allowance is granted or we're retrying after approval
      setCurrentOperation('deposit');
      const parsedAmount = parseUnits(amount, 6); // Assuming 6 decimals
      const hash = await writeContractAsync({
        address: SRUB_CONTRACT_ADDRESS,
        abi: sRUBABI,
        functionName: 'depositCollateral',
        args: [token, parsedAmount],
      });
      
      setLastTxHash(hash);
      
      toast({
        title: 'Deposit Initiated',
        description: 'Your collateral deposit transaction has been submitted.',
      });
      
      // Clear any pending approval state
      setPendingApprovalToken(null);
      setPendingApprovalAmount('');
    } catch (error: any) {
      toast({
        title: 'Deposit Failed',
        description: error?.message?.substring(0, 100) || 'Transaction failed',
        variant: 'destructive',
      });
      // Clear any pending approval state on error
      setPendingApprovalToken(null);
      setPendingApprovalAmount('');
    } finally {
      setCurrentOperation(null);
    }
  };

  // Watch for transaction receipt - simplified handling
  useEffect(() => {
    if (lastTxHash && !isWaitingForTransaction) {
      // Transaction completed, refresh data
      refetchAll();
      
      // Show success toast for the completed transaction
      let operation = currentOperation || 'transaction';
      let message = 'Your transaction has been confirmed on the blockchain.';
      
      if (pendingApprovalToken && pendingApprovalAmount) {
        // If we just completed an approval and have pending deposit data
        // Try the deposit now
        const token = pendingApprovalToken;
        const amount = pendingApprovalAmount;
        
        // Clear pending data before making the next call to avoid loops
        setPendingApprovalToken(null);
        setPendingApprovalAmount('');
        
        // Schedule deposit for next tick to avoid state update conflicts
        setTimeout(() => {
          handleDepositCollateral(token, amount);
        }, 500);
      } else {
        toast({
          title: 'Transaction Confirmed',
          description: message,
        });
      }
    }
  }, [lastTxHash, isWaitingForTransaction]);

  const handleWithdrawCollateral = async (amount: string) => {
    try {
      if (collateralTokens.length === 0) {
        toast({
          title: 'Error',
          description: 'No collateral tokens found to withdraw from',
          variant: 'destructive',
        });
        return;
      }
      
      // Get the first collateral token to withdraw from
      const collateralToWithdraw = collateralTokens[0];
      
      setCurrentOperation('withdraw');
      const parsedAmount = parseUnits(amount, 6); // Assuming 6 decimals
      const hash = await writeContractAsync({
        address: SRUB_CONTRACT_ADDRESS,
        abi: sRUBABI,
        functionName: 'decreasePosition',
        args: [collateralToWithdraw, parsedAmount], // Use the first collateral token
      });
      
      setLastTxHash(hash);
      toast({
        title: 'Withdrawal Initiated',
        description: 'Your collateral withdrawal transaction has been submitted.',
      });
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error?.message?.substring(0, 100) || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setCurrentOperation(null);
    }
  };

  const handleBorrow = async (amount: string) => {
    try {
      setCurrentOperation('borrow');
      const parsedAmount = parseUnits(amount, 6); // sRUB has 6 decimals as per contract
      const hash = await writeContractAsync({
        address: SRUB_CONTRACT_ADDRESS,
        abi: sRUBABI,
        functionName: 'increasePosition',
        args: [parsedAmount],
      });
      
      setLastTxHash(hash);
      toast({
        title: 'Borrow Initiated',
        description: 'Your borrow transaction has been submitted.',
      });
    } catch (error: any) {
      toast({
        title: 'Borrow Failed',
        description: error?.message?.substring(0, 100) || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setCurrentOperation(null);
    }
  };

  const handleRepay = async (amount: string) => {
    try {
      if (collateralTokens.length === 0) {
        toast({
          title: 'Error',
          description: 'No collateral tokens found to repay from',
          variant: 'destructive',
        });
        return;
      }

      // Use the first collateral token for repayment
      const collateralToUse = collateralTokens[0];
      
      setCurrentOperation('repay');
      const parsedAmount = parseUnits(amount, 6); // sRUB has 6 decimals as per contract
      const hash = await writeContractAsync({
        address: SRUB_CONTRACT_ADDRESS,
        abi: sRUBABI,
        functionName: 'decreasePosition',
        args: [collateralToUse, parsedAmount],
      });
      
      setLastTxHash(hash);
      toast({
        title: 'Repay Initiated',
        description: 'Your repay transaction has been submitted.',
      });
    } catch (error: any) {
      toast({
        title: 'Repay Failed',
        description: error?.message?.substring(0, 100) || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setCurrentOperation(null);
    }
  };

  return {
    // Contract data
    position,
    collateralValue: collateralValue !== undefined ? (collateralValue as bigint) : BigInt(0),
    positionHealth: positionHealth !== undefined ? (positionHealth as bigint) : BigInt(0),
    ltv,
    
    // Contract actions
    depositCollateral: handleDepositCollateral,
    withdrawCollateral: handleWithdrawCollateral,
    borrowSRUB: handleBorrow,
    repaySRUB: handleRepay,
    
    // Loading states
    isDepositPending: isWritePending && currentOperation === 'deposit',
    isWithdrawPending: isWritePending && currentOperation === 'withdraw',
    isBorrowPending: isWritePending && currentOperation === 'borrow',
    isRepayPending: isWritePending && currentOperation === 'repay',
    isWaitingForTransaction,
    
    // Helpers
    refetchAll,
    
    // Constants
    COLLATERALIZATION_RATIO,
    LIQUIDATION_THRESHOLD,

    // Approval states
    isApprovalDialogOpen,
    setIsApprovalDialogOpen: cancelApproval, // Use cancelApproval to close dialog
    handleApprove,
    isApprovalPending: isWritePending && currentOperation === 'approve',
  };
} 