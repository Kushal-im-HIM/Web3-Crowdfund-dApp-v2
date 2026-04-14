import Layout from "../components/Layout/Layout";
import RouteGuard from "../components/RouteGuard";
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



  return (
    <RouteGuard>
      <Layout>
        <CreateCampaignForm />
      </Layout>
    </RouteGuard>
  );
}
