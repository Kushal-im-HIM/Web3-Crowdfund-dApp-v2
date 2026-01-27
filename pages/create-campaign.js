import Layout from "../components/Layout/Layout";
import CreateCampaignForm from "../components/Campaign/CreateCampaignForm";
import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function CreateCampaignPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to create a campaign.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CreateCampaignForm />
    </Layout>
  );
}
