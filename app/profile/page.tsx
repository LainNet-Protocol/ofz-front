import { UserProfile } from '@/components/profile/user-profile';

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">User Profile</h1>
      <p className="text-gray-600 mb-8">
        Manage your identity NFT and delegated wallets.
      </p>
      <UserProfile />
    </div>
  );
}