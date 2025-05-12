import { VerificationStatus } from '@/components/verification/verification-status';

export default function VerificationPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Verification Status</h1>
      <p className="text-gray-600 mb-8">
        Check your current verification status and connected wallet details.
      </p>
      <VerificationStatus />
    </div>
  );
}