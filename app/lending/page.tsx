import { LendingDashboard } from '@/components/lending/lending-dashboard';

export default function LendingPage() {
  return (
    <div className="container mx-auto px-24 py-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Lending Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Manage your OFZ bond lending positions and monitor your debt.
      </p>
      <LendingDashboard />
    </div>
  );
}