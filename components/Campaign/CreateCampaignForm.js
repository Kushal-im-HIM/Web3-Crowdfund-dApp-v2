/**
 * components/Campaign/CreateCampaignForm.js
 *
 * MANDATE 3 — Form Reorder & Cursor Fix
 *
 * Problems fixed:
 *   1. REORDER: Image Upload was at the top of the form, visually dominating it.
 *      New order: Title → Description → Target/Duration → Category/Tags →
 *                 Additional Info → Image Upload → Submit
 *      Text inputs now appear first so users fill in the most important fields
 *      before seeing the optional image section.
 *
 *   2. CURSOR BUG: The old implementation used:
 *        <input className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
 *      Because `absolute inset-0` expands to the nearest positioned ancestor
 *      (the outer form div), the invisible input was covering the entire page,
 *      making every click trigger the file picker — users couldn't click text inputs.
 *
 *      Fix: The file input is now `hidden` (not absolutely positioned). A
 *      `<label htmlFor="campaign-image-upload">` wraps only the upload dropzone
 *      box. The label has `cursor-pointer`; nothing else does.
 *      The rest of the page uses the browser default cursor.
 */

import { useState } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useHoneypot, useRateLimit } from "../HoneypotGuard";
import { FiUpload, FiX, FiInfo } from "react-icons/fi";
import { useContract } from "../../hooks/useContract";
import { uploadCampaignMetadata } from "../../utils/ipfs";
import { CAMPAIGN_CREATION_FEE } from "../../constants";
import { formatEther } from "../../utils/helpers";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";

export default function CreateCampaignForm() {
  const router = useRouter();
  const { useCreateCampaignSimple } = useContract();
  const { createCampaignAsync, isLoading } = useCreateCampaignSimple();
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAmount: "",
    duration: "",
    category: "General",
    tags: "",
    additionalInfo: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const categories = [
    "Technology", "Creative", "Medical", "Education",
    "Environment", "Community", "Business", "General",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const validateForm = () => {
    if (!formData.title.trim()) { toast.error("Title is required"); return false; }
    if (!formData.description.trim()) { toast.error("Description is required"); return false; }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) { toast.error("Valid target amount is required"); return false; }
    if (!formData.duration || parseInt(formData.duration) <= 0) { toast.error("Valid duration is required"); return false; }
    return true;
  };

  const { HoneypotField, validateHoneypot } = useHoneypot();
  const { checkRateLimit } = useRateLimit(6000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Anti-bot: honeypot + rate limit check
    if (!validateHoneypot()) {
      toast.error("Submission rejected. Please try again.");
      return;
    }
    const rateCheck = checkRateLimit("createCampaign");
    if (!rateCheck.allowed) {
      toast.error(rateCheck.message);
      return;
    }

    if (!createCampaignAsync) {
      toast.error("Contract function not available. Please check your wallet connection.");
      console.error("createCampaignAsync is undefined. CONTRACT_ADDRESS:", CONTRACT_ADDRESS);
      return;
    }

    setUploading(true);
    try {
      const metadataData = {
        ...formData,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      toast.loading("Uploading to IPFS...", { id: "upload" });
      const uploadResult = await uploadCampaignMetadata(metadataData, imageFile);
      toast.dismiss("upload");

      if (!uploadResult.success) throw new Error(uploadResult.error);

      const targetAmountWei = ethers.utils.parseEther(formData.targetAmount);
      const durationSeconds = parseInt(formData.duration) * 24 * 60 * 60;
      const creationFee = ethers.BigNumber.from(CAMPAIGN_CREATION_FEE);

      toast.loading("Creating campaign...", { id: "create" });

      const tx = await createCampaignAsync({
        args: [
          formData.title,
          formData.description,
          uploadResult.metadataHash,
          targetAmountWei,
          durationSeconds,
        ],
        value: creationFee,
      });

      console.log("Transaction submitted:", tx);
      toast.dismiss("create");
      toast.success("Campaign created successfully!");
      router.push("/my-campaigns");
    } catch (error) {
      toast.dismiss();
      console.error("Error creating campaign:", error);

      let msg = "Failed to create campaign";
      if (error?.message) {
        if (error.message.includes("User rejected") || error.message.includes("user rejected"))
          msg = "Transaction was rejected by user";
        else if (error.message.includes("insufficient funds"))
          msg = "Insufficient funds for transaction";
        else if (error.message.includes("execution reverted"))
          msg = "Transaction failed: " + (error.reason || "Unknown reason");
        else
          msg = error.message;
      }
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto bg-white dark:bg-primary-800 rounded-xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Campaign
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Launch your crowdfunding campaign and bring your ideas to life
        </p>
      </div>

      {/* Issue 1 — 0% platform fee, anti-spam deposit framing */}
      <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <FiInfo className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div>
            <h4 className="text-emerald-800 dark:text-emerald-200 font-semibold">
              EthosFund charges 0% platform fees
            </h4>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm mt-0.5">
              100% of every contribution goes directly to the campaign creator.
              A one-time anti-spam deposit of{" "}
              <strong>{formatEther(CAMPAIGN_CREATION_FEE)} ETH</strong>{" "}
              is required to prevent bot campaigns — this is not a platform revenue fee.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <HoneypotField />

        {/* ── MANDATE 3: Text inputs appear FIRST ───────────────────────── */}

        {/* 1. Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a compelling title for your campaign"
            className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white"
            required
          />
        </div>

        {/* 2. Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe your campaign, goals, and how funds will be used"
            className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white resize-none"
            required
          />
        </div>

        {/* 3. Target Amount & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Amount (ETH) *
            </label>
            <input
              type="number"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (Days) *
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              min="1"
              max="365"
              placeholder="30"
              className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white"
              required
            />
          </div>
        </div>

        {/* 4. Category & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="startup, tech, innovation (comma separated)"
              className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white"
            />
          </div>
        </div>

        {/* 5. Additional Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Information
          </label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            rows={3}
            placeholder="Any additional details about your campaign, team, or project timeline"
            className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:bg-primary-700 dark:text-white resize-none"
          />
        </div>

        {/* ── MANDATE 3: Image Upload section moved to BOTTOM of form ─────
            CURSOR FIX: The old code placed an `absolute inset-0 w-full h-full`
            invisible input inside the form, covering the entire page and hijacking
            all clicks. The new implementation uses a <label htmlFor="..."> that
            wraps only the dashed upload box. cursor-pointer is scoped to that
            label only. The hidden file input has no CSS positioning at all.
        ───────────────────────────────────────────────────────────────────── */}

        {/* 6. Campaign Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign Image
          </label>

          {imagePreview ? (
            /* Preview state: show image with remove button */
            <div className="relative">
              <img
                src={imagePreview}
                alt="Campaign preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /*
             * CURSOR FIX: <label> wraps the visible dropzone box.
             * cursor-pointer is on the label, NOT on the form or any parent.
             * The <input type="file"> is hidden (display:none via Tailwind `hidden`),
             * so it occupies no space and does NOT intercept clicks outside this box.
             */
            <label
              htmlFor="campaign-image-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-primary-600 rounded-lg p-8 cursor-pointer hover:border-secondary-500 dark:hover:border-secondary-400 transition-colors"
            >
              <FiUpload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2 text-center">
                Click to upload or drag and drop
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                PNG, JPG, GIF up to 10MB
              </p>

              {/* CURSOR FIX: `hidden` — no absolute positioning, no page overlap */}
              <input
                id="campaign-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={isLoading || uploading}
            className="w-full bg-gradient-emerald hover:shadow-emerald-glow disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {uploading
              ? "Uploading to IPFS..."
              : isLoading
                ? "Creating Campaign..."
                : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
