/**
 * pages/campaign/[id].js
 *
 * Idea 8 — Open Graph meta tags per campaign.
 * Uses Next.js Head + wagmi's useContractRead to fetch live campaign data
 * for dynamic og:title, og:description, and og:image from IPFS metadata.
 * When shared on X, WhatsApp, LinkedIn, Telegram → rich link preview card.
 *
 * Fallback to EthosFund defaults while data loads (prevents blank unfurls).
 */

import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useState } from "react";
import Layout from "../../components/Layout/Layout";
import CampaignDetails from "../../components/Campaign/CampaignDetails";
import { useContract } from "../../hooks/useContract";
import { formatEther } from "../../utils/helpers";
import { getFromIPFS } from "../../utils/ipfs";

const DEFAULT_OG = {
  title: "EthosFund — Decentralised Crowdfunding",
  description: "Milestone-gated crowdfunding with 0% platform fees, community governance, and automatic refunds. Built on Ethereum.",
  image: "https://ethosfund.xyz/og-default.png",
  siteName: "EthosFund",
};

export default function CampaignPage() {
  const router = useRouter();
  const { id } = router.query;
  const [ogData, setOgData] = useState(DEFAULT_OG);

  const { useCampaign } = useContract();
  const { data: campaign } = useCampaign(id ? Number(id) : undefined);

  useEffect(() => {
    if (!campaign || !id) return;

    const raisedEth = campaign.raisedAmount
      ? parseFloat(formatEther(campaign.raisedAmount)).toFixed(2)
      : "0";
    const targetEth = campaign.targetAmount
      ? parseFloat(formatEther(campaign.targetAmount)).toFixed(2)
      : "?";

    const title = campaign.title
      ? `${campaign.title} — EthosFund`
      : DEFAULT_OG.title;

    const description = campaign.description
      ? `${campaign.description.slice(0, 120)}${campaign.description.length > 120 ? "…" : ""} | ${raisedEth}/${targetEth} ETH raised · Milestone-gated · 0% fees`
      : DEFAULT_OG.description;

    // Try to get IPFS image for og:image
    const tryIpfsImage = async () => {
      if (campaign.metadataHash) {
        try {
          const result = await getFromIPFS(campaign.metadataHash);
          if (result.success && result.data?.image) {
            setOgData({ title, description, image: result.data.image, siteName: DEFAULT_OG.siteName });
            return;
          }
        } catch { }
      }
      setOgData({ title, description, image: DEFAULT_OG.image, siteName: DEFAULT_OG.siteName });
    };

    tryIpfsImage();
  }, [campaign, id]);

  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/campaign/${id}`
    : `https://ethosfund.xyz/campaign/${id}`;

  return (
    <>
      <Head>
        <title>{ogData.title}</title>
        <meta name="description" content={ogData.description} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={ogData.siteName} />
        <meta property="og:title" content={ogData.title} />
        <meta property="og:description" content={ogData.description} />
        <meta property="og:image" content={ogData.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter / X Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@EthosFund" />
        <meta name="twitter:title" content={ogData.title} />
        <meta name="twitter:description" content={ogData.description} />
        <meta name="twitter:image" content={ogData.image} />

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <Layout>
        <CampaignDetails campaignId={id} />
      </Layout>
    </>
  );
}
