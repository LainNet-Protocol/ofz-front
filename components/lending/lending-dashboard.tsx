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
import { SimpleProgress as Progress } from "@/components/ui/simple-progress";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Scale,
  Shield,
  Wallet,
  Loader2,
  RussianRuble,
  CircleCheck,
  ScrollText,
  Info,
  Calendar,
  BarChart4,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSRUBContract, COLLATERALIZATION_RATIO, LIQUIDATION_THRESHOLD } from "@/hooks/use-srub-contract";
import { Address } from "viem";
import { formatUnits, createPublicClient, http, parseAbiItem, Log, encodeFunctionData, decodeAbiParameters } from "viem";
import { useReadContract } from "wagmi";
import { holesky } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";
import { API_ENDPOINTS } from "@/config/api-urls";

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// BondOracle ABI for getPriceFeeds function
const bondOracleAbi = [
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_feeds',
        type: 'address[]',
      },
    ],
    name: 'getPriceFeeds',
    outputs: [
      {
        components: [
          {
            internalType: 'uint160',
            name: 'lastPrice',
            type: 'uint160',
          },
          {
            internalType: 'uint40',
            name: 'lastUpdated',
            type: 'uint40',
          },
          {
            internalType: 'uint40',
            name: 'maturityAt',
            type: 'uint40',
          },
        ],
        internalType: 'struct BondInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Multicall3 ABI for aggregate3 function
const multicall3Abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'allowFailure',
            type: 'bool',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall3.Call3[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          {
            internalType: 'bool',
            name: 'success',
            type: 'bool',
          },
          {
            internalType: 'bytes',
            name: 'returnData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall3.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Look for the contract addresses and update them
// Contract addresses
const BOND_FACTORY_ADDRESS = CONTRACT_ADDRESSES.BOND_FACTORY_ADDRESS as `0x${string}`;
const BOND_ORACLE_ADDRESS = CONTRACT_ADDRESSES.BOND_ORACLE_ADDRESS as `0x${string}`;
const MULTICALL3_ADDRESS = CONTRACT_ADDRESSES.MULTICALL3_ADDRESS as `0x${string}`;

// Create a public client
const client = createPublicClient({
  chain: holesky,
  transport: http('https://ethereum-holesky.blockpi.network/v1/rpc/4a51167eb43f45c938311689e7514635fe357842'),
});

// Define types for bond data
interface BondEvent {
  bondToken: string;
  name: string;
  initialPrice: bigint;
  maturityPrice: bigint;
  maturityAt: number;
  maturityDate: string;
  blockNumber: number;
  transactionHash: string | `0x${string}` | null;
}

interface BondPrice {
  bondAddress: string;
  lastPrice: string;
  lastUpdated: string;
  maturityAt: number;
  maturityDate: string;
}

interface UserBond extends BondEvent {
  balance: bigint;
  formattedBalance: string;
  hasBalance: boolean;
  currentPrice?: string;
  lastUpdated?: string;
  maturityPriceFormatted?: string;
  initialPriceFormatted?: string;
}

type ActionType = "supply" | "withdraw" | "borrow" | "repay";

export function LendingDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, isSignedLicense, kycStatus, address } = useWeb3();
  const {
    position,
    collateralValue,
    positionHealth,
    ltv,
    depositCollateral,
    withdrawCollateral,
    borrowSRUB,
    repaySRUB,
    isDepositPending,
    isWithdrawPending,
    isBorrowPending,
    isRepayPending,
    isApprovalDialogOpen,
    setIsApprovalDialogOpen,
    handleApprove,
    isApprovalPending,
    refetchAll,
  } = useSRUBContract();
  
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<UserBond | null>(null);
  const [userBonds, setUserBonds] = useState<UserBond[]>([]);
  const [isFetchingUserBonds, setIsFetchingUserBonds] = useState(true);
  const [totalPositionValue, setTotalPositionValue] = useState<number>(0);
  const [bondShortnames, setBondShortnames] = useState<Record<string, string>>({});

  // Check if there's a loading state from any transaction
  const isLoading = isDepositPending || isWithdrawPending || isBorrowPending || isRepayPending;

  // Fetch bond shortnames from API
  useEffect(() => {
    const fetchBondShortnames = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.MARKET_DATA.BONDS}?onchain=true`);
        const data = await response.json();
        console.log(data);
        // Create a mapping of bond secids to shortnames
        const shortnameMap: Record<string, string> = {};
        if (data && data.bonds && Array.isArray(data.bonds)) {
          data.bonds.forEach((bond: any) => {
            if (bond.secid && bond.shortname) {
              shortnameMap[bond.secid] = bond.shortname;
            }
          });
        }
        
        setBondShortnames(shortnameMap);
      } catch (error) {
        console.error('Error fetching bond shortnames:', error);
      }
    };

    fetchBondShortnames();
  }, []);

  // Helper function to get bond shortname or fallback to original name
  const getBondShortname = (originalName: string): string => {
    return bondShortnames[originalName] || originalName;
  };

  // Convert bigint values to numbers for display
  const debtAmount = Number(position.debtAmount) / 1_000_000; // convert from wei (assuming 6 decimals)
  const collateralAmount = Number(position.collateralAmount) / 1_000_000; // convert from wei
  const collateralValueNum = Number(collateralValue) / 1_000_000; // convert from wei
  const healthFactor = Number(positionHealth) / 100; // contract returns percentage value

  // Format health factor to be more readable
  const formattedHealthFactor = healthFactor > 1e10 ? '∞' : healthFactor.toFixed(2);

  // Calculate LTV and health status
  const loanToValue = ltv;
  const liquidationThresholdPercent = LIQUIDATION_THRESHOLD;

  const getHealthColor = (health: number) => {
    if (health >= 1.75) return "text-emerald-600";
    if (health >= 1.25) return "text-amber-600";
    return "text-red-600";
  };

  // Function to get all bond balances for a user using Multicall3
  const getBondBalancesWithMulticall = async (bondDetails: BondEvent[], userAddress: string) => {
    try {
      console.log(`Getting balances for ${bondDetails.length} bonds using Multicall3...`);
      
      // Prepare calls for Multicall3
      const calls = bondDetails.map((bond) => {
        // Encode the balanceOf call for each bond token
        const callData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        });
        
        return {
          target: bond.bondToken as `0x${string}`,
          allowFailure: true, // Allow failure in case any token contract is invalid
          callData,
        };
      });
      
      // Make the multicall
      const results = await client.readContract({
        address: MULTICALL3_ADDRESS as `0x${string}`,
        abi: multicall3Abi,
        functionName: 'aggregate3',
        args: [calls],
      }) as Array<{success: boolean, returnData: `0x${string}`}>;
      
      // Process results
      const balances = bondDetails.map((bond, index) => {
        const result = results[index];
        
        let balance = BigInt(0);
        let formattedBalance = '0';
        
        // Only process if the call was successful
        if (result.success) {
          try {
            // Decode the return data using decodeAbiParameters
            [balance] = decodeAbiParameters(
              [{ name: 'balance', type: 'uint256' }],
              result.returnData
            );
            
            // Format the balance with 18 decimals (adjust if your tokens use different decimals)
            formattedBalance = formatUnits(balance, 0);
          } catch (error) {
            console.warn(`Failed to decode balance for ${bond.name} (${bond.bondToken}):`, error);
          }
        }
        
        return {
          ...bond,
          balance,
          formattedBalance,
          hasBalance: balance > BigInt(0),
        };
      });
      
      return balances;
    } catch (error) {
      console.error('Error getting bond balances with Multicall3:', error);
      throw error;
    }
  };

  // Function to calculate position value for a single bond
  const calculateBondPositionValue = (bond: UserBond): number => {
    const currentPrice = parseFloat(bond.currentPrice || "0");
    const balance = parseFloat(bond.formattedBalance);
    return currentPrice * balance;
  };

  // Fetch user's bonds
  useEffect(() => {
    const fetchUserBonds = async () => {
      if (!isConnected || !address) {
        setIsFetchingUserBonds(false);
        return;
      }

      try {
        setIsFetchingUserBonds(true);

        // Fetch BondCreated events
        const startBlock = BigInt(3820577);
        const currentBlock = await client.getBlockNumber();
        const MAX_BLOCK_RANGE = BigInt(1000);
        
        let allEvents: Log[] = [];
        let fromBlock = startBlock;
        
        // Process blocks in chunks
        while (fromBlock <= currentBlock) {
          const toBlock = fromBlock + MAX_BLOCK_RANGE - BigInt(1) <= currentBlock 
            ? fromBlock + MAX_BLOCK_RANGE - BigInt(1) 
            : currentBlock;
            
          try {
            const events = await client.getLogs({
              address: BOND_FACTORY_ADDRESS,
              event: parseAbiItem('event BondCreated(address indexed bondToken, string name, uint160 initialPrice, uint160 maturityPrice, uint40 maturityAt)'),
              fromBlock: fromBlock,
              toBlock: toBlock,
            });
            
            allEvents = [...allEvents, ...events];
          } catch (error) {
            console.error(`Error fetching logs for block range ${fromBlock}-${toBlock}:`, error);
          }
          
          fromBlock = toBlock + BigInt(1);
        }

        // Parse events
        const bondDetails: BondEvent[] = allEvents.map((event) => {
          const { args } = event as any;
          return {
            bondToken: args.bondToken,
            name: args.name,
            initialPrice: args.initialPrice,
            maturityPrice: args.maturityPrice,
            maturityAt: args.maturityAt,
            maturityDate: new Date(Number(args.maturityAt) * 1000).toLocaleDateString(),
            blockNumber: Number(event.blockNumber),
            transactionHash: event.transactionHash,
          };
        });

        if (bondDetails.length === 0) {
          setIsFetchingUserBonds(false);
          return;
        }

        // Get bond addresses from the events
        const bondAddresses = bondDetails.map(bond => bond.bondToken);
        
        // Get current prices for these bonds
        const bondInfos = await client.readContract({
          address: BOND_ORACLE_ADDRESS as `0x${string}`,
          abi: bondOracleAbi,
          functionName: 'getPriceFeeds',
          args: [bondAddresses],
        }) as Array<{lastPrice: bigint, lastUpdated: number, maturityAt: number}>;
        
        // Process bond info
        const bondPrices: BondPrice[] = bondAddresses.map((address, index) => {
          const bondInfo = bondInfos[index];
          return {
            bondAddress: address,
            lastPrice: formatUnits(bondInfo.lastPrice, 6),
            lastUpdated: new Date(Number(bondInfo.lastUpdated) * 1000).toLocaleString(),
            maturityAt: bondInfo.maturityAt,
            maturityDate: new Date(Number(bondInfo.maturityAt) * 1000).toLocaleString(),
          };
        });

        // Get user bond balances
        const userBondBalances = await getBondBalancesWithMulticall(bondDetails, address);

        // Add price data to user bonds
        const userBondsWithPrices = userBondBalances.map(bond => {
          const priceData = bondPrices.find(price => price.bondAddress === bond.bondToken);
          return {
            ...bond,
            currentPrice: priceData?.lastPrice || "0",
            lastUpdated: priceData?.lastUpdated || "",
            maturityPriceFormatted: Number(formatUnits(bond.maturityPrice, 6)).toLocaleString(),
            initialPriceFormatted: Number(formatUnits(bond.initialPrice, 6)).toLocaleString()
          };
        });
        
        // Filter to only bonds with balance
        const userBondsWithBalance = userBondsWithPrices.filter(bond => bond.hasBalance);
        
        setUserBonds(userBondsWithBalance);

        // Calculate total position value
        const totalValue = userBondsWithBalance.reduce((sum, bond) => {
          return sum + calculateBondPositionValue(bond);
        }, 0);

        setTotalPositionValue(totalValue);
      } catch (error) {
        console.error("Error fetching user bonds:", error);
      } finally {
        setIsFetchingUserBonds(false);
      }
    };

    fetchUserBonds();
  }, [isConnected, address]);

  // Refresh data on component mount
  useEffect(() => {
    if (isConnected) {
      refetchAll();
    }
  }, [isConnected, refetchAll]);

  const handleAction = async (type: ActionType, token?: UserBond) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }

    setActionType(type);
    setSelectedToken(token || null);
    setAmount("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      switch (actionType) {
        case "supply":
          await depositCollateral(selectedToken?.bondToken as `0x${string}`, amount);
          break;
        case "withdraw":
          await withdrawCollateral(amount);
          toast({
            title: "Success",
            description: `Successfully ${actionType}ed ${amount} RUB`,
          });
          break;
        case "borrow":
          await borrowSRUB(amount);
          toast({
            title: "Success",
            description: `Successfully ${actionType}ed ${amount} sRUB`,
          });
          break;
        case "repay":
          await repaySRUB(amount);
          toast({
            title: "Success",
            description: `Successfully ${actionType}ed ${amount} sRUB`,
          });
          break;
      }
      setIsDialogOpen(false);
      setAmount('');
      await refetchAll();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Check if user has an active position - using collateral amount or debt amount
  const hasActivePosition = position.collateralAmount > BigInt(0) || position.debtAmount > BigInt(0);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-500 mb-6">
          Please connect your wallet to view your lending position and manage your collateral.
        </p>
      </div>
    );
  }

  if (!isSignedLicense) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">License Not Signed</h3>
          <p className="mt-2 text-amber-700">
            You need to sign the license agreement before accessing the lending dashboard.
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
            Your KYC verification must be approved before you can access the lending dashboard.
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
    <div className="space-y-8">
      {/* User's Owned Bonds Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your OFZ Bond Portfolio</h2>
        
        {/* Token Balance */}
        <Card className="p-4 bg-white border border-gray-200 mt-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Wallet className="h-5 w-5 text-emerald-600 mr-2" />
              <h3 className="text-lg font-medium">Position Value</h3>
            </div>
            <div className="flex items-center">
              {isFetchingUserBonds ? (
                <span className="text-gray-500">Calculating...</span>
              ) : (
                <span className="text-xl font-semibold text-emerald-600">
                  {totalPositionValue.toLocaleString()} ₽
                </span>
              )}
            </div>
          </div>
        </Card>
        
        {isFetchingUserBonds ? (
          <Card className="p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mr-2" />
              <span className="text-gray-700">Loading your portfolio...</span>
            </div>
          </Card>
        ) : userBonds.length === 0 ? (
          <Card className="p-6 bg-gray-50 border-gray-200">
            <div className="flex flex-col items-center text-center p-4">
              <Wallet className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-800">No Bonds in Portfolio</h3>
              <p className="mt-2 text-gray-600">
                You don't own any OFZ bonds yet. Browse the marketplace to start investing.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBonds.map((bond) => (
              <Card key={bond.bondToken} className="overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{getBondShortname(bond.name)}</h3>
                      <div className="mt-1 inline-flex items-center bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        <CircleCheck className="h-3 w-3 mr-1" />
                        Owned
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        {parseFloat(bond.formattedBalance).toLocaleString()} <ScrollText className="inline h-4 w-4 ml-1" />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{calculateBondPositionValue(bond).toLocaleString()} ₽</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-6">
                    <div className="flex items-center">
                      <RussianRuble className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Initial Price</p>
                        <p className="text-base font-medium">{bond.initialPriceFormatted}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center group relative">
                      <RussianRuble className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Oracle Price</p>
                        <p className="text-base font-medium">{parseFloat(bond.currentPrice || "0").toLocaleString()}</p>
                        {bond.lastUpdated && (
                          <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-0 w-auto z-10 whitespace-nowrap">
                            Last updated: {bond.lastUpdated}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <RussianRuble className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Maturity Price</p>
                        <p className="text-base font-medium">{bond.maturityPriceFormatted}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Maturity</p>
                        <p className="text-base font-medium">{bond.maturityDate}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      <span className="flex items-center">
                        <a 
                          href={`https://www.moex.com/ru/issue.aspx?board=TQOB&code=${getBondShortname(bond.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-emerald-600 transition-colors"
                        >
                          View on MOEX <ArrowUpRight className="h-4 w-4 ml-1" />
                        </a>
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleAction("supply", bond)}
                      disabled={isLoading}
                    >
                      Use as Collateral
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lending Position Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Lending Position</h2>
        
        {hasActivePosition ? (
          // User has a position - show full dashboard
          <>
            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-emerald-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Current Debt</p>
                    <p className="text-2xl font-bold">${debtAmount.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-emerald-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Position Health</p>
                    <p className={`text-2xl font-bold ${getHealthColor(healthFactor)}`}>
                      {formattedHealthFactor}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center">
                  <Scale className="h-8 w-8 text-emerald-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Loan to Value</p>
                    <div>
                      <p className="text-2xl font-bold">
                        {loanToValue.toFixed(1)}%
                        <span className="text-sm text-gray-500 ml-2">/ {liquidationThresholdPercent}%</span>
                      </p>
                      <Progress 
                        value={Math.min(Math.max(0, (loanToValue / liquidationThresholdPercent) * 100), 100)} 
                        className="h-2 mt-2"
                      />
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center">
                  <Percent className="h-8 w-8 text-emerald-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Collateralization Ratio</p>
                    <p className="text-2xl font-bold">{COLLATERALIZATION_RATIO}%</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Position Details */}
            <div className="mt-6">
              <Card className="overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {position.collateralToken 
                          ? getBondShortname(userBonds.find(b => b.bondToken === position.collateralToken)?.name || "OFZ Bond") 
                          : "OFZ Bond"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Collateral Value: ${collateralValueNum.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                      {COLLATERALIZATION_RATIO}% CR
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">Supplied</p>
                        <p className="font-semibold">${collateralAmount.toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAction("withdraw")}
                          disabled={isLoading}
                        >
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAction("supply")}
                          disabled={isLoading}
                        >
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          Supply
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">Borrowed</p>
                        <p className="font-semibold">${debtAmount.toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAction("repay")}
                          disabled={isLoading || debtAmount <= 0}
                        >
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          Repay
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAction("borrow")}
                          disabled={isLoading}
                        >
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          Borrow
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          // User doesn't have a position yet - show simple create position card
          <Card className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Create Your First Position</h3>
              <p className="text-gray-500 mb-6">
                Select a bond from your portfolio to use as collateral and start using the lending platform.
              </p>
            </div>
          </Card>
        )}
      </div>
      
      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType?.charAt(0).toUpperCase()}{actionType?.slice(1)} {selectedToken ? getBondShortname(selectedToken.name) : ""}
            </DialogTitle>
            <DialogDescription>
              Enter the amount you want to {actionType}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount {actionType === "borrow" || actionType === "repay" ? "(sRUB)" : <span className="inline-flex items-center"><ScrollText className="h-4 w-4 ml-1" /></span>}
              </label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            {actionType && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Available to {actionType}:</span>
                  <span className="font-medium">
                    {actionType === "withdraw" 
                      ? `$${collateralAmount.toLocaleString()}`
                      : actionType === "repay"
                      ? `$${debtAmount.toLocaleString()}`
                      : actionType === "borrow"
                      ? `$${(collateralValueNum * COLLATERALIZATION_RATIO / 100 - debtAmount).toLocaleString()}`
                      : actionType === "supply" && selectedToken
                      ? <span className="flex items-center">{parseFloat(selectedToken.formattedBalance).toLocaleString()} <ScrollText className="h-4 w-4 ml-1" /></span>
                      : "0"}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  {actionType === "supply" || actionType === "borrow" ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  Confirm {actionType?.charAt(0).toUpperCase()}{actionType?.slice(1)}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog 
        open={isApprovalDialogOpen} 
        onOpenChange={() => setIsApprovalDialogOpen()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Token</DialogTitle>
            <DialogDescription>
              Before you can deposit your tokens as collateral, you need to approve the lending contract to spend your tokens.
              This is a one-time approval that allows the contract to handle your tokens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen()}
              disabled={isApprovalPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApprovalPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isApprovalPending ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                  Approving...
                </span>
              ) : (
                'Approve'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}