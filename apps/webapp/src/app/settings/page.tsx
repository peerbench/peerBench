import { ApiKeysSection } from "./components/api-keys-section";
import { ProfileForm } from "./components/profile-form";
import { SecuritySection } from "./components/security-section";
import { MiscellaneousSection } from "./components/miscellaneous-section";
import { PrivateKeySection } from "./components/private-key-section";
import { PeerBenchApiKeys } from "./components/peerbench-api-keys";

export default function SettingsPage() {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto px-4 py-8">
      {/* User Profile Card */}
      <ProfileForm />

      {/* Security Section */}
      <SecuritySection />

      {/* Miscellaneous Section */}
      <MiscellaneousSection />

      {/* PeerBench API Keys */}
      <PeerBenchApiKeys />

      {/* API Keys & Authentication Section */}
      <ApiKeysSection />

      {/* Private Key Section - Only visible in debug mode */}
      <PrivateKeySection />
    </main>
  );
}
