import { LicenseAgreement } from "@/components/license/license-agreement";

export default function LicensePage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">License Agreement</h1>
      <p className="text-gray-600 mb-8">
        Please review and sign the following license agreement to continue.
      </p>
      <LicenseAgreement />
    </div>
  );
}