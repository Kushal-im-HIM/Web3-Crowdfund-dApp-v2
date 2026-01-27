import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  FiArrowRight,
  FiTarget,
  FiUsers,
  FiShield,
  FiGlobe,
} from "react-icons/fi";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const features = [
    {
      icon: FiTarget,
      title: "Launch Your Ideas",
      description:
        "Create compelling campaigns and bring your innovative projects to life with blockchain transparency.",
    },
    {
      icon: FiUsers,
      title: "Global Community",
      description:
        "Connect with supporters worldwide and build a community around your vision.",
    },
    {
      icon: FiShield,
      title: "Secure & Transparent",
      description:
        "Smart contracts ensure funds are safe and transactions are transparent on the blockchain.",
    },
    {
      icon: FiGlobe,
      title: "Decentralized",
      description:
        "No intermediaries, no censorship. Pure peer-to-peer crowdfunding on Ethereum.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                CrowdFund Pro
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Fund The Future
              <span className="block text-blue-200">Decentralized</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              The next-generation crowdfunding platform powered by blockchain
              technology. Launch campaigns, support innovations, and be part of
              the decentralized economy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-medium hover:bg-blue-50 transition-colors inline-flex items-center"
                >
                  Go to Dashboard
                  <FiArrowRight className="ml-2 w-5 h-5" />
                </button>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-lg">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="text-white font-medium"
                      >
                        Connect Wallet to Start
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}
              <button
                onClick={() => router.push("/campaigns")}
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-colors"
              >
                Explore Campaigns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose CrowdFund Pro?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Experience the power of decentralized crowdfunding
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                1000+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Campaigns Launched
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                $2M+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Funds Raised
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                50K+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Contributors
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-xl font-bold">CrowdFund Pro</span>
            </div>
            <p className="text-gray-400 mb-4">
              Decentralized crowdfunding for the future
            </p>
            <p className="text-gray-500 text-sm">
              © 2025 CrowdFund Pro. Built on Ethereum.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
