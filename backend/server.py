from fastapi import FastAPI, HTTPException
import os
from dotenv import load_dotenv
from web3 import Web3
from pydantic import BaseModel, Field
from eth_typing import Address
from typing import Optional
import json
import time
import requests
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Configure Web3
HOLESKY_RPC_URL = os.getenv('HOLESKY_RPC_URL')
IDENTITY_MINTER_PRIVATE_KEY = os.getenv('IDENTITY_MINTER_PRIVATE_KEY')
NFT_CONTRACT_ADDRESS = os.getenv('NEXT_PUBLIC_NFT_CONTRACT_ADDRESS')

BOND_FACTORY_ADDRESS = os.getenv('NEXT_PUBLIC_BOND_FACTORY_ADDRESS')
BOND_ISSUER_PRIVATE_KEY = os.getenv('BOND_ISSUER_PRIVATE_KEY')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(HOLESKY_RPC_URL))
if not w3.is_connected():
    raise ConnectionError(f"Failed to connect to Ethereum node at {HOLESKY_RPC_URL}")

# Load contract ABI
ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint40", "name": "expiration", "type": "uint40"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Create contract instance
contract = w3.eth.contract(address=NFT_CONTRACT_ADDRESS, abi=ABI)

# BondFactory ABI and address
BOND_FACTORY_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint160", "name": "initialPrice", "type": "uint160"},
            {"internalType": "uint160", "name": "maturityPrice", "type": "uint160"},
            {"internalType": "uint40", "name": "maturityAt", "type": "uint40"}
        ],
        "name": "issueBond",
        "outputs": [
            {"internalType": "address", "name": "", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Create BondFactory contract instance
bond_factory = w3.eth.contract(address=BOND_FACTORY_ADDRESS, abi=BOND_FACTORY_ABI)

# Create account from private key
account = w3.eth.account.from_key(IDENTITY_MINTER_PRIVATE_KEY)

# Create bond issuer account
bond_issuer_account = w3.eth.account.from_key(BOND_ISSUER_PRIVATE_KEY)

# Initialize FastAPI
app = FastAPI(title="SoulBoundNFT API", description="API for interacting with SoulBoundIdentityNFT contract")

# Configure CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Define request models
class MintRequest(BaseModel):
    to_address: str = Field(..., description="Ethereum address to mint the NFT to")
    expiration: int = Field(..., description="Expiration timestamp (uint40)")

# Define response models
class TransactionResponse(BaseModel):
    transaction_hash: str
    from_address: str
    to_address: str
    gas_used: Optional[int] = None
    status: str

# Define request models for bond issuance
class IssueBondRequest(BaseModel):
    name: str = Field(..., description="Name of the bond")
    initial_price: int = Field(..., description="Initial price (uint160)")
    maturity_price: int = Field(..., description="Maturity price (uint160)")
    maturity_at: int = Field(..., description="Maturity timestamp (uint40)")

# Define response model for bond issuance
class BondIssuedResponse(BaseModel):
    transaction_hash: str
    bond_address: str
    from_address: str
    status: str
    gas_used: Optional[int] = None

# Bond Token ABI for mint function
BOND_TOKEN_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Define response model for token minting
class TokenMintResponse(BaseModel):
    transaction_hash: str
    from_address: str
    to_address: str
    bond_address: str
    amount: int
    gas_used: Optional[int] = None
    status: str

@app.get("/api/nft/mint", response_model=TransactionResponse)
async def mint_nft(to_address: str):
    """
    Mint a SoulBoundIdentityNFT to the specified address with an expiration of one year from now
    """
    try:
        # Set expiration to current timestamp + 1 year (in seconds)
        current_time = int(time.time())
        one_year_seconds = 365 * 24 * 60 * 60
        expiration = current_time + one_year_seconds
        
        # Validate address
        if not w3.is_address(to_address):
            raise HTTPException(status_code=400, detail="Invalid Ethereum address")
        
        # Get the current nonce for our account
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Build the transaction
        tx = contract.functions.mint(
            to_address,
            expiration
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 200000,  # Gas limit
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        try:
            # Sign the transaction
            signed_tx = account.sign_transaction(tx)
            
            # Different versions of web3.py may use different attribute names
            raw_tx = None
            if hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            elif hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            else:
                # If we can't find the attribute, print debug info and try to extract the data
                print(f"DEBUG - Signed transaction attributes: {dir(signed_tx)}")
                if isinstance(signed_tx, dict) and 'rawTransaction' in signed_tx:
                    raw_tx = signed_tx['rawTransaction']
                elif isinstance(signed_tx, dict) and 'raw_transaction' in signed_tx:
                    raw_tx = signed_tx['raw_transaction']
            
            if not raw_tx:
                raise ValueError(f"Unable to extract raw transaction data from {type(signed_tx)}")
            
            # Send the transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            
            # Wait for transaction receipt
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Return transaction details
            return TransactionResponse(
                transaction_hash=tx_hash.hex(),
                from_address=account.address,
                to_address=NFT_CONTRACT_ADDRESS,
                gas_used=tx_receipt.gasUsed,
                status="success" if tx_receipt.status == 1 else "failed"
            )
        except Exception as e:
            # More detailed error
            print(f"Transaction error: {str(e)}")
            print(f"Transaction object type: {type(signed_tx)}")
            print(f"Transaction object attributes: {dir(signed_tx)}")
            raise HTTPException(status_code=500, detail=f"Transaction error: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bond/issue", response_model=BondIssuedResponse)
async def issue_bond(name: str, initial_price: int, maturity_price: int, maturity_at: int):
    """
    Issue a new bond on the blockchain with specified parameters
    """
    try:
        # Get the current nonce for our bond issuer account
        nonce = w3.eth.get_transaction_count(bond_issuer_account.address)
        
        # Build the transaction
        tx = bond_factory.functions.issueBond(
            name,
            initial_price,
            maturity_price,
            maturity_at
        ).build_transaction({
            'from': bond_issuer_account.address,
            'nonce': nonce,
            'gas': 300000,  # Gas limit
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        try:
            # Sign the transaction with bond issuer account
            signed_tx = bond_issuer_account.sign_transaction(tx)
            
            # Different versions of web3.py may use different attribute names
            raw_tx = None
            if hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            elif hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            else:
                # If we can't find the attribute, print debug info and try to extract the data
                print(f"DEBUG - Signed transaction attributes: {dir(signed_tx)}")
                if isinstance(signed_tx, dict) and 'rawTransaction' in signed_tx:
                    raw_tx = signed_tx['rawTransaction']
                elif isinstance(signed_tx, dict) and 'raw_transaction' in signed_tx:
                    raw_tx = signed_tx['raw_transaction']
            
            if not raw_tx:
                raise ValueError(f"Unable to extract raw transaction data from {type(signed_tx)}")
            
            # Send the transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            
            # Wait for transaction receipt
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Get the bond address from the transaction logs or function return value
            bond_address = "Bond address unavailable"
            
            # Try to get the address from the transaction receipt
            # The issueBond function returns the address of the created bond
            try:
                # Since we don't know what events the contract might emit,
                # we'll use a direct approach to extract the return value
                # We can try to call the contract function again with the same parameters
                # to get the expected return value
                call_result = bond_factory.functions.issueBond(
                    name, initial_price, maturity_price, maturity_at
                ).call({'from': bond_issuer_account.address})
                
                if call_result and w3.is_address(call_result):
                    bond_address = call_result
            except Exception as e:
                print(f"Could not retrieve bond address: {str(e)}")
            
            # Return transaction details
            return BondIssuedResponse(
                transaction_hash=tx_hash.hex(),
                bond_address=bond_address,
                from_address=bond_issuer_account.address,
                gas_used=tx_receipt.gasUsed,
                status="success" if tx_receipt.status == 1 else "failed"
            )
        
        except Exception as e:
            # More detailed error
            print(f"Transaction error: {str(e)}")
            print(f"Transaction object type: {type(signed_tx)}")
            print(f"Transaction object attributes: {dir(signed_tx)}")
            raise HTTPException(status_code=500, detail=f"Transaction error: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bond/mint-tokens", response_model=TokenMintResponse)
async def mint_bond_tokens(bond_address: str, to_address: str, amount: int):
    """
    Mint ERC20 tokens for a specific bond and send them to the specified address
    """
    try:
        # Validate addresses
        if not w3.is_address(bond_address):
            raise HTTPException(status_code=400, detail="Invalid bond address")
        
        if not w3.is_address(to_address):
            raise HTTPException(status_code=400, detail="Invalid recipient address")
        
        # Create bond token contract instance
        bond_token = w3.eth.contract(address=bond_address, abi=BOND_TOKEN_ABI)
        
        # Get the current nonce for our bond issuer account
        nonce = w3.eth.get_transaction_count(bond_issuer_account.address)
        
        # Build the transaction
        tx = bond_token.functions.mint(
            to_address,
            amount
        ).build_transaction({
            'from': bond_issuer_account.address,
            'nonce': nonce,
            'gas': 200000,  # Gas limit
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        try:
            # Sign the transaction with bond issuer account
            signed_tx = bond_issuer_account.sign_transaction(tx)
            
            # Different versions of web3.py may use different attribute names
            raw_tx = None
            if hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            elif hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            else:
                # If we can't find the attribute, print debug info and try to extract the data
                print(f"DEBUG - Signed transaction attributes: {dir(signed_tx)}")
                if isinstance(signed_tx, dict) and 'rawTransaction' in signed_tx:
                    raw_tx = signed_tx['rawTransaction']
                elif isinstance(signed_tx, dict) and 'raw_transaction' in signed_tx:
                    raw_tx = signed_tx['raw_transaction']
            
            if not raw_tx:
                raise ValueError(f"Unable to extract raw transaction data from {type(signed_tx)}")
            
            # Send the transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            
            # Wait for transaction receipt
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Return transaction details
            return TokenMintResponse(
                transaction_hash=tx_hash.hex(),
                from_address=bond_issuer_account.address,
                to_address=to_address,
                bond_address=bond_address,
                amount=amount,
                gas_used=tx_receipt.gasUsed,
                status="success" if tx_receipt.status == 1 else "failed"
            )
        
        except Exception as e:
            # More detailed error
            print(f"Transaction error: {str(e)}")
            print(f"Transaction object type: {type(signed_tx)}")
            print(f"Transaction object attributes: {dir(signed_tx)}")
            raise HTTPException(status_code=500, detail=f"Transaction error: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bonds")
async def get_bonds():
    """
    Proxy endpoint to fetch bonds data from external API
    """
    try:
        response = requests.get("http://51.250.96.12:34915/api/bonds?onchain=true")
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching bonds data: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "connected_to_network": w3.is_connected()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
