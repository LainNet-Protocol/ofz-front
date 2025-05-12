// @ts-nocheck
import { CONTRACT_ADDRESSES } from "@/config/contract-addresses";
import { redirect } from "next/navigation";

export async function generateStaticParams() {
  return CONTRACT_ADDRESSES.PROFILE_ADDRESSES.map(address => ({
    address,
  }));
}

export default function NFTProfilePage({ params }) {
  const { address } = params;
  
  return (
    <div className="container max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">NFT Profile</h1>
      <p className="text-gray-600 mb-8">
        Viewing profile for address: <span className="font-mono">{address}</span>
      </p>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Identity NFT</h2>
        <div className="flex items-center space-x-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-bold">{address.substring(0, 2)}</span>
          </div>
          <div>
            <p className="font-medium">{address}</p>
            <p className="text-sm text-emerald-600">Verified Identity</p>
          </div>
        </div>
      </div>
    </div>
  );
} 