import { PINATA_JWT } from "../constants";

export const uploadToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload to IPFS");
    }

    const data = await response.json();
    return {
      success: true,
      hash: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const uploadJSONToIPFS = async (jsonData) => {
  try {
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify(jsonData),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload JSON to IPFS");
    }

    const data = await response.json();
    return {
      success: true,
      hash: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("IPFS JSON Upload Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getFromIPFS = async (hash) => {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);

    if (!response.ok) {
      throw new Error("Failed to fetch from IPFS");
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("IPFS Fetch Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const uploadCampaignMetadata = async (campaignData, imageFile) => {
  try {
    let imageHash = null;

    // Upload image if provided
    if (imageFile) {
      const imageUpload = await uploadToIPFS(imageFile);
      if (!imageUpload.success) {
        throw new Error(imageUpload.error);
      }
      imageHash = imageUpload.hash;
    }

    // Create metadata object
    const metadata = {
      title: campaignData.title,
      description: campaignData.description,
      image: imageHash
        ? `https://gateway.pinata.cloud/ipfs/${imageHash}`
        : null,
      category: campaignData.category || "General",
      tags: campaignData.tags || [],
      creator: campaignData.creator,
      createdAt: new Date().toISOString(),
      additionalInfo: campaignData.additionalInfo || {},
    };

    // Upload metadata JSON
    const metadataUpload = await uploadJSONToIPFS(metadata);
    if (!metadataUpload.success) {
      throw new Error(metadataUpload.error);
    }

    return {
      success: true,
      metadataHash: metadataUpload.hash,
      imageHash,
      metadataUrl: metadataUpload.url,
    };
  } catch (error) {
    console.error("Campaign Metadata Upload Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
