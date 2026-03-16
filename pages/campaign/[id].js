import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import CampaignDetails from "../../components/Campaign/CampaignDetails";
import MilestonePanel from "../../components/Milestone/MilestonePanel";
import { useContract } from "../../hooks/useContract";

export default function CampaignPage() {
  const router = useRouter();
  const { id } = router.query;
  const { useCampaign } = useContract();
  const { data: campaignData } = useCampaign(id);

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <CampaignDetails campaignId={id} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <MilestonePanel
            campaignId={id}
            creatorAddress={campaignData?.creator}
          />
        </div>
      </div>
    </Layout>
  );
}