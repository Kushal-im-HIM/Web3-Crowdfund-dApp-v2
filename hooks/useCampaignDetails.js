import { useState, useEffect } from "react";
import { useContract } from "./useContract";

export const useCampaignDetails = (campaignIds) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { useCampaign } = useContract();

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      if (!campaignIds || campaignIds.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching details for campaigns:", campaignIds);

        // Convert BigInt IDs to numbers if needed
        const normalizedIds = campaignIds.map((id) => {
          if (typeof id === "bigint") return Number(id);
          return parseInt(id.toString());
        });

        console.log("🔢 Normalized campaign IDs:", normalizedIds);

        // For now, create placeholder data that represents the actual campaign structure
        // In a real implementation, you would need to call the contract for each ID
        const campaignDetails = await Promise.all(
          normalizedIds.map(async (id) => {
            try {
              // This is a placeholder - you'd replace this with actual contract calls
              return {
                id: id,
                title: `Campaign #${id}`,
                description: `This is campaign number ${id} created by the user.`,
                creator: "", // Will be filled by the parent component
                targetAmount: "1000000000000000000", // 1 ETH in wei
                raisedAmount: "0",
                deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
                active: true,
                withdrawn: false,
                contributorsCount: 0,
                createdAt: Math.floor(Date.now() / 1000),
                metadataHash: `QmHash${id}`, // Placeholder IPFS hash
              };
            } catch (error) {
              console.error(`Error fetching campaign ${id}:`, error);
              return null;
            }
          })
        );

        const validCampaigns = campaignDetails.filter(
          (campaign) => campaign !== null
        );
        console.log("✅ Fetched campaign details:", validCampaigns);
        setCampaigns(validCampaigns);
      } catch (error) {
        console.error("❌ Error fetching campaign details:", error);
        setError(error.message);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignDetails();
  }, [campaignIds]);

  return { campaigns, loading, error };
};

export const useRealCampaignDetails = (campaignIds) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRealCampaignDetails = async () => {
      if (!campaignIds || campaignIds.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Convert BigInt IDs to numbers if needed
        const normalizedIds = campaignIds.map((id) => {
          if (typeof id === "bigint") return Number(id);
          return parseInt(id.toString());
        });

        console.log(
          "🔍 Fetching real campaign details for IDs:",
          normalizedIds
        );

        // Note: This approach requires making individual contract calls
        // In a production app, you might want to batch these or use a different approach
        const campaignPromises = normalizedIds.map(async (id) => {
          try {
            // You would use your contract hook here
            // const { data: campaign } = useCampaign(id);
            // For now, return placeholder data
            return {
              id: id,
              title: `Real Campaign #${id}`,
              description: "Fetched from blockchain",
              // ... other properties from your contract
            };
          } catch (error) {
            console.error(`Error fetching campaign ${id}:`, error);
            return null;
          }
        });

        const results = await Promise.all(campaignPromises);
        const validCampaigns = results.filter((campaign) => campaign !== null);

        setCampaigns(validCampaigns);
      } catch (error) {
        console.error("❌ Error fetching real campaign details:", error);
        setError(error.message);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRealCampaignDetails();
  }, [campaignIds]);

  return { campaigns, loading, error };
};
