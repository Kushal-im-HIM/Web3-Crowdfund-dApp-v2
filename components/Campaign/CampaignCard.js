import { useState, useEffect } from "react";
import Link from "next/link";
import { FiUser, FiClock, FiTarget, FiTrendingUp } from "react-icons/fi";
import {
  formatEther,
  formatAddress,
  calculateTimeLeft,
  calculateProgress,
} from "../../utils/helpers";
import { getFromIPFS } from "../../utils/ipfs";

export default function CampaignCard({ campaign, className = "" }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) {
          setMetadata(result.data);
        }
      }
      setLoading(false);
    };

    fetchMetadata();
  }, [campaign.metadataHash]);

  const progress = calculateProgress(
    campaign.raisedAmount,
    campaign.targetAmount
  );
  const timeLeft = calculateTimeLeft(campaign.deadline);
  const raisedAmount = formatEther(campaign.raisedAmount);
  const targetAmount = formatEther(campaign.targetAmount);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${className}`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
        {metadata?.image ? (
          <img
            src={metadata.image}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-6xl font-bold opacity-20">
              {campaign.title?.charAt(0) || "C"}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${
              campaign.active
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }
          `}
          >
            {campaign.active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Time Left Badge */}
        {!timeLeft.expired && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-medium bg-black bg-opacity-50 text-white rounded-full backdrop-blur-sm">
              <FiClock className="inline w-3 h-3 mr-1" />
              {timeLeft.text}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title & Description */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {campaign.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
            {campaign.description}
          </p>
        </div>

        {/* Creator */}
        <div className="flex items-center mb-4 text-sm text-gray-500 dark:text-gray-400">
          <FiUser className="w-4 h-4 mr-2" />
          <span>by {formatAddress(campaign.creator)}</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1">
              <FiTrendingUp className="w-3 h-3 mr-1" />
              Raised
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {parseFloat(raisedAmount).toFixed(2)} ETH
            </div>
          </div>
          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1">
              <FiTarget className="w-3 h-3 mr-1" />
              Target
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {parseFloat(targetAmount).toFixed(2)} ETH
            </div>
          </div>
        </div>

        {/* Contributors Count */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span>{campaign.contributorsCount || 0} contributors</span>
          {timeLeft.expired && (
            <span className="text-red-500 font-medium">Expired</span>
          )}
        </div>

        {/* Action Button */}
        <Link href={`/campaign/${campaign.id}`}>
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
}
