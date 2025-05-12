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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  ArrowUpRight, 
  Clock, 
  CreditCard,
  Percent,
  Calendar,
  BarChart4,
  Wallet,
  Loader2,
  RussianRuble,
  CircleCheck,
  ScrollText,
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { formatUnits, createPublicClient, http, parseAbiItem, Log, encodeFunctionData, decodeAbiParameters } from "viem";
import { useReadContract } from "wagmi";
import { holesky } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";
import { API_ENDPOINTS, buildUrl } from "@/config/api-urls";

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

// BondFactory event ABI
const bondCreatedEventAbi = parseAbiItem(
  'event BondCreated(address indexed bondToken, string name, uint160 initialPrice, uint160 maturityPrice, uint40 maturityAt)'
);

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

// ERC20 ABI for balanceOf function
const erc20BalanceOfAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
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

interface BondDisplay {
  id: string;
  name: string;
  yieldRate: number;
  duration: string;
  maturityDate: string;
  minInvestment: number;
  description: string;
  riskLevel: string;
  issueDateText: string;
  country: string;
  currency: string;
  couponFrequency: string;
  tradingVolume: string;
  currentPrice: string;
  lastUpdated: string;
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

// Bond name mapping interface
interface BondNameMapping {
  secid: string;
  shortname: string;
}

export function BondsMarketplace() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, isSignedLicense, kycStatus, address } = useWeb3();
  const [selectedBond, setSelectedBond] = useState<BondDisplay | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("eth");
  const [loading, setLoading] = useState(false);
  const [bonds, setBonds] = useState<BondDisplay[]>([]);
  const [userBonds, setUserBonds] = useState<UserBond[]>([]);
  const [isFetchingBonds, setIsFetchingBonds] = useState(true);
  const [isFetchingUserBonds, setIsFetchingUserBonds] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [bondNameMappings, setBondNameMappings] = useState<BondNameMapping[]>([]);
  const [isFetchingNames, setIsFetchingNames] = useState(true);
  const [totalPositionValue, setTotalPositionValue] = useState<number>(0);
  const [selectedUserBond, setSelectedUserBond] = useState<UserBond | null>(null);
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  
  // Function to get all bond balances for a user using Multicall3
  const getBondBalancesWithMulticall = async (bondDetails: BondEvent[], userAddress: string) => {
    try {
      console.log(`Getting balances for ${bondDetails.length} bonds using Multicall3...`);
      
      // Prepare calls for Multicall3
      const calls = bondDetails.map((bond) => {
        // Encode the balanceOf call for each bond token
        const callData = encodeFunctionData({
          abi: erc20BalanceOfAbi,
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
            console.log(formattedBalance);
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

  // Function to get bond display name
  const getBondDisplayName = (bondName: string): string => {
    const mapping = bondNameMappings.find(mapping => mapping.secid === bondName);
    return mapping ? mapping.shortname : bondName;
  };

  // Fetch bond name mappings
  useEffect(() => {
    const fetchBondNames = async () => {
      try {
        setIsFetchingNames(true);
        const response = await fetch(`${API_ENDPOINTS.MARKET_DATA.BONDS}?onchain=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch bond names');
        }
        const data = await response.json();
        setBondNameMappings(data.bonds);
      } catch (error) {
        console.error('Error fetching bond names:', error);
      } finally {
        setIsFetchingNames(false);
      }
    };

    fetchBondNames();
  }, []);

  // Fetch bonds from blockchain
  useEffect(() => {
    const fetchBonds = async () => {
      if (!isConnected || !isSignedLicense || kycStatus !== 'approved') {
        setIsFetchingBonds(false);
        setIsFetchingUserBonds(false);
        return;
      }
      
      try {
        setIsFetchingBonds(true);
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
              event: bondCreatedEventAbi,
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
          setIsFetchingBonds(false);
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
        
        // Combine bond details and prices, and format to match the expected structure
        const formattedBonds: BondDisplay[] = bondDetails.map((bond, index) => {
          const price = bondPrices[index];
          
          // Calculate yield (simplified version - in a real app this should use proper financial calculations)
          const initialPrice = Number(formatUnits(bond.initialPrice, 6));
          const maturityPrice = Number(formatUnits(bond.maturityPrice, 6));
          const timeToMaturityInYears = (Number(bond.maturityAt) - Date.now() / 1000) / (365 * 24 * 60 * 60);
          const yieldRate = timeToMaturityInYears > 0 
            ? (((maturityPrice / initialPrice) - 1) / timeToMaturityInYears) * 100 
            : 0;
            
          // Calculate duration in years (simplified)
          const durationInYears = Math.round(timeToMaturityInYears);
          
          // Use blockNumber from the current bond for issue date
          const issueDate = new Date(Number(bond.blockNumber) * 15000).toLocaleDateString();
          
          return {
            id: bond.bondToken,
            name: bond.name,
            yieldRate: parseFloat(yieldRate.toFixed(2)),
            duration: `${durationInYears} years`,
            maturityDate: bond.maturityDate,
            minInvestment: 1000, // Default value
            description: "Federal loan bond with regular coupon payments",
            riskLevel: "Low",
            issueDateText: issueDate,
            country: "Russia",
            currency: "RUB",
            couponFrequency: "Quarterly",
            tradingVolume: "Medium",
            currentPrice: price.lastPrice,
            lastUpdated: price.lastUpdated,
          };
        });
        
        setBonds(formattedBonds);
        setIsFetchingBonds(false);
        
        // If user is connected, get their bond balances
        if (address) {
          try {
            // Get user bond balances
            const userBondBalances = await getBondBalancesWithMulticall(bondDetails, address);
            console.log('userBondBalances');
            console.log(userBondBalances);

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
          } catch (error) {
            console.error("Error fetching user bond balances:", error);
          }
        }
        
        setIsFetchingUserBonds(false);
      } catch (error) {
        console.error("Error fetching bonds:", error);
        setFetchError("Failed to fetch bonds. Please try again later.");
        setIsFetchingBonds(false);
        setIsFetchingUserBonds(false);
      }
    };
    
    fetchBonds();
  }, [isConnected, isSignedLicense, kycStatus, address]);

  // Function to calculate position value for a single bond
  const calculateBondPositionValue = (bond: UserBond): number => {
    const currentPrice = parseFloat(bond.currentPrice || "0");
    // If we're using formatUnits(balance, 0), the balance is already in the correct units
    const balance = parseFloat(bond.formattedBalance);
    return currentPrice * balance;
  };

  // Calculate total position value across all bonds
  useEffect(() => {
    if (userBonds.length === 0) {
      setTotalPositionValue(0);
      return;
    }

    const totalValue = userBonds.reduce((sum, bond) => {
      return sum + calculateBondPositionValue(bond);
    }, 0);

    setTotalPositionValue(totalValue);
  }, [userBonds]);

  const handleBuyClick = (bond: BondDisplay) => {
    setSelectedBond(bond);
    setIsDialogOpen(true);
  };

  const handleTopUpClick = (bond: UserBond) => {
    setSelectedUserBond(bond);
    setTopUpAmount("");
    setIsTopUpDialogOpen(true);
  };

  const handleInvestmentSubmit = async () => {
    if (!selectedBond || !address) return;
    
    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount < selectedBond.minInvestment) {
      toast({
        title: "Invalid amount",
        description: `Minimum investment is ₽${selectedBond.minInvestment}`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if user already owns this bond
      const userAlreadyOwns = userBonds.some(bond => bond.bondToken === selectedBond.id);
      let bondAddress = selectedBond.id;
      
      // If user doesn't own this bond, issue a new one
      if (!userAlreadyOwns) {
        // Calculate maturity timestamp (use the existing one from the bond)
        const maturityTimestamp = Math.floor(new Date(selectedBond.maturityDate).getTime() / 1000);
        
        // Convert price from display format to raw format (assuming 6 decimals based on formatUnits usage)
        const initialPrice = parseFloat(selectedBond.currentPrice) || 1;
        const maturityPrice = initialPrice * (1 + (selectedBond.yieldRate / 100)); // Approximate maturity price based on yield
        
        const issueUrl = buildUrl(API_ENDPOINTS.BOND.ISSUE, {
          name: selectedBond.name,
          initial_price: initialPrice,
          maturity_price: maturityPrice,
          maturity_at: maturityTimestamp
        });
        
        const issueResponse = await fetch(issueUrl);
        
        if (!issueResponse.ok) {
          throw new Error('Failed to issue bond');
        }
        
        const issueData = await issueResponse.json();
        console.log("Bond issued:", issueData);
        
        // Use the bond address from the response
        bondAddress = issueData.bond_address || selectedBond.id;
      }
      
      // Mint tokens to user
      const mintUrl = buildUrl(API_ENDPOINTS.BOND.MINT_TOKENS, {
        bond_address: bondAddress,
        to_address: address,
        amount: amount
      });
      
      const mintResponse = await fetch(mintUrl);
      
      if (!mintResponse.ok) {
        throw new Error('Failed to mint tokens');
      }
      
      const mintData = await mintResponse.json();
      console.log("Tokens minted:", mintData);
      
      if (mintData.status !== "success") {
        throw new Error(`Transaction failed: ${mintData.status}`);
      }
      
      // Successfully bought bonds
      toast({
        title: "Investment successful",
        description: `You have successfully invested ₽${amount} in ${selectedBond ? getBondDisplayName(selectedBond.name) : ''}`,
        variant: "default",
      });
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Refresh user bonds after purchase
      setTimeout(() => {
        // Reload the page to show updated balances
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Investment error:", error);
      toast({
        title: "Investment failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSubmit = async () => {
    if (!selectedUserBond || !address) return;
    
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    setIsTopUpLoading(true);
    
    try {
      // Mint additional tokens to user
      const mintUrl = buildUrl(API_ENDPOINTS.BOND.MINT_TOKENS, {
        bond_address: selectedUserBond.bondToken,
        to_address: address,
        amount: amount
      });
      
      const mintResponse = await fetch(mintUrl);
      
      if (!mintResponse.ok) {
        throw new Error('Failed to mint tokens');
      }
      
      const mintData = await mintResponse.json();
      console.log("Tokens minted:", mintData);
      
      if (mintData.status !== "success") {
        throw new Error(`Transaction failed: ${mintData.status}`);
      }
      
      // Successfully topped up
      toast({
        title: "Top Up successful",
        description: `You have successfully topped up ${amount} tokens of ${getBondDisplayName(selectedUserBond.name)}`,
        variant: "default",
      });
      
      // Close the dialog
      setIsTopUpDialogOpen(false);
      
      // Refresh user bonds after top up
      setTimeout(() => {
        // Reload the page to show updated balances
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Top Up error:", error);
      toast({
        title: "Top Up failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-medium text-amber-800">Wallet Not Connected</h3>
          <p className="mt-2 text-amber-700">
            Please connect your wallet to view the OFZ bonds marketplace.
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
            You need to sign the license agreement before accessing the marketplace.
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
            Your KYC verification must be approved before you can access the marketplace.
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
                You don't own any OFZ bonds yet. Browse the marketplace below to start investing.
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
                      <h3 className="text-lg font-medium text-gray-900">{getBondDisplayName(bond.name)}</h3>
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
                          href={`https://www.moex.com/ru/issue.aspx?board=TQOB&code=${bond.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-emerald-600 transition-colors"
                        >
                          View on MOEX <ArrowUpRight className="h-4 w-4 ml-1" />
                        </a>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleTopUpClick(bond)}
                      >
                        Top Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => window.open(`https://holesky.etherscan.io/address/${bond.bondToken}`, '_blank')}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
       
      </div>
      
      {/* Available Bonds Marketplace Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">OFZ Bonds Marketplace</h2>
        
        {isFetchingBonds ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mr-2" />
            <span className="text-lg text-gray-700">Loading bonds from blockchain...</span>
          </div>
        ) : fetchError ? (
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-medium text-red-800">Error Fetching Bonds</h3>
              <p className="mt-2 text-red-700">{fetchError}</p>
              <Button 
                className="mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : bonds.length === 0 ? (
          <Card className="p-6 bg-gray-50 border-gray-200">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-medium text-gray-800">No Bonds Available</h3>
              <p className="mt-2 text-gray-600">
                There are currently no bonds available for investment.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bonds
              .filter(bond => !userBonds.some(userBond => userBond.bondToken === bond.id))
              .map((bond) => (
              <Card key={bond.id} className="overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{getBondDisplayName(bond.name)}</h3>
                      <div className="mt-1 inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        <Info className="h-3 w-3 mr-1" />
                        Available
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        <Button 
                          onClick={() => handleBuyClick(bond)}
                          className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                          size="sm"
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Buy
                        </Button>
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-6">
                    <div className="flex items-center">
                      <Percent className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Yield</p>
                        <p className="text-base font-medium">{bond.yieldRate}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center group relative">
                      <RussianRuble className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Current Price</p>
                        <p className="text-base font-medium">{parseFloat(bond.currentPrice || "0").toLocaleString()}</p>
                        {bond.lastUpdated && (
                          <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-0 w-auto z-10 whitespace-nowrap">
                            Last updated: {bond.lastUpdated}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="text-base font-medium">{bond.duration}</p>
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
                          href={`https://www.moex.com/ru/issue.aspx?board=TQOB&code=${bond.name}`}
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
                      className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => window.open(`https://holesky.etherscan.io/address/${bond.id}`, '_blank')}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Investment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invest in {selectedBond ? getBondDisplayName(selectedBond.name) : ''}</DialogTitle>
            <DialogDescription>
              Enter the amount you want to invest and select your preferred cryptocurrency.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Investment Amount <ScrollText className="inline h-4 w-4 ml-1" />
              </label>
              <Input
                id="amount"
                type="number"
                placeholder={`Minimum ₽${selectedBond?.minInvestment}`}
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="crypto" className="text-sm font-medium">
                Pay with Cryptocurrency
              </label>
              <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                <SelectTrigger id="crypto">
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                  <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="usdt">Tether (USDT)</SelectItem>
                  <SelectItem value="usdc">USD Coin (USDC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md mt-2">
              <h4 className="text-sm font-medium text-gray-900">Bond Details</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Country:</span>
                  <span className="text-gray-700">{selectedBond?.country}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Coupon Frequency:</span>
                  <span className="text-gray-700">{selectedBond?.couponFrequency}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInvestmentSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!investmentAmount || parseFloat(investmentAmount) < (selectedBond?.minInvestment || 0) || loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <BarChart4 className="h-5 w-5 mr-2" />
                  Confirm Investment
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Up Dialog */}
      <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up {selectedUserBond ? getBondDisplayName(selectedUserBond.name) : ''}</DialogTitle>
            <DialogDescription>
              Enter the amount you want to top up and confirm the transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="topUpAmount" className="text-sm font-medium">
                Top Up Amount <ScrollText className="inline h-4 w-4 ml-1" />
              </label>
              <Input
                id="topUpAmount"
                type="number"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopUpDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTopUpSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || isTopUpLoading}
            >
              {isTopUpLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <BarChart4 className="h-5 w-5 mr-2" />
                  Confirm Top Up
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}