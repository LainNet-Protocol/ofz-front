import { InvestmentSummary } from '@/components/investments/investment-summary';

export default function InvestmentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Investment Summary</h1>
      <p className="text-gray-600 mb-8">
        View your OFZ bond investments and claim available tokens.
      </p>
      <InvestmentSummary />
    </div>
  );
}