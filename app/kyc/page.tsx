import { KycFormWrapper } from '@/components/kyc/kyc-form-wrapper';

export default function KycPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">KYC Verification</h1>
      <p className="text-gray-600 mb-8">
        To comply with regulations, please complete the KYC verification process.
      </p>
      <KycFormWrapper />
    </div>
  );
}