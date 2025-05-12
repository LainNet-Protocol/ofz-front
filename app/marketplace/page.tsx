import { BondsMarketplace } from '@/components/marketplace/bonds-marketplace';

export default function MarketplacePage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">OFZ Bonds Marketplace</h1>
      <p className="text-gray-600 mb-8">
        Browse and invest in Russian OFZ bonds using cryptocurrency.
      </p>
      <BondsMarketplace />
    </div>
  );
}