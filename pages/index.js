import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  FiArrowRight,
  FiTarget,
  FiUsers,
  FiShield,
  FiGlobe,
  FiCheckCircle,
  FiZap,
  FiLock,
  FiTrendingUp,
  FiCode,
  FiGift,
  FiBook,
} from "react-icons/fi";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();

  // ═══════════════════════════════════════════════════════════
  // NEW FEATURES DATA - Updated for Web3 Innovation Platform
  // ═══════════════════════════════════════════════════════════

  const features = [
    {
      icon: FiTarget,
      title: "Milestone-Based Releases",
      description:
        "Funds released only when project milestones are verified and approved by the community.",
      color: "emerald",
    },
    {
      icon: FiLock,
      title: "Smart Contract Escrow",
      description:
        "Your contributions are held securely in audited smart contracts until goals are met.",
      color: "slate",
    },
    {
      icon: FiShield,
      title: "Automatic Refunds",
      description:
        "Failed campaigns trigger instant automatic refunds to all contributors—no manual claims.",
      color: "cyan",
    },
    {
      icon: FiGlobe,
      title: "Zero Platform Fees",
      description:
        "0% commission on successful campaigns. Only a one-time creation fee to prevent spam.",
      color: "amber",
    },
  ];

  const useCases = [
    {
      icon: FiBook,
      title: "Student Research",
      description: "Fund academic projects and capstone innovations",
      color: "emerald",
    },
    {
      icon: FiCode,
      title: "Dev Tooling",
      description: "Support Web3 infrastructure and open-source tools",
      color: "cyan",
    },
    {
      icon: FiUsers,
      title: "Indie Games",
      description: "Back creative game development projects",
      color: "amber",
    },
    {
      icon: FiGift,
      title: "NFT & Digital Art",
      description: "Support digital creators and artists",
      color: "emerald",
    },
    {
      icon: FiTrendingUp,
      title: "Public Goods",
      description: "Fund decentralized community projects",
      color: "cyan",
    },
  ];

  const stats = [
    { value: "0%", label: "Platform Fee", icon: FiCheckCircle, color: "emerald" },
    { value: "100%", label: "On-Chain Transparency", icon: FiShield, color: "cyan" },
    { value: "Instant", label: "Crypto Disbursement", icon: FiZap, color: "amber" },
  ];

  // ═══════════════════════════════════════════════════════════
  // OLD FEATURES DATA (COMMENTED OUT FOR REFERENCE)
  // ═══════════════════════════════════════════════════════════
  /*
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
  */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary-900">
      {/* ═══════════════════════════════════════════════════════════
          NEW HEADER - Professional, Clean Design
          ═══════════════════════════════════════════════════════════ */}
      <header className="bg-white dark:bg-primary-800 border-b border-gray-200 dark:border-primary-700 sticky top-0 z-50 backdrop-blur-sm bg-white/80 dark:bg-primary-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-emerald rounded-xl flex items-center justify-center shadow-emerald-glow">
                <span className="text-white font-bold text-lg">CF</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  CrowdFund Pro
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Web3 Innovation</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          NEW HERO SECTION - Soft Gradient, Professional
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark py-20 sm:py-28">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-200 dark:bg-secondary-900 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white dark:bg-primary-800 px-4 py-2 rounded-full shadow-soft mb-6 border border-gray-200 dark:border-primary-700">
              <FiShield className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Smart Contract Verified Platform
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Transparent Funding for
              <span className="block mt-2 bg-gradient-emerald bg-clip-text text-transparent">
                Web3 Innovation
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Launch milestone-based campaigns with zero platform fees. Every contribution protected by smart contracts, every release verified on-chain.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isConnected ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group bg-gradient-emerald text-white px-8 py-4 rounded-xl font-semibold hover:shadow-emerald-glow transition-all duration-300 inline-flex items-center text-lg transform hover:-translate-y-0.5"
                >
                  Go to Dashboard
                  <FiArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div className="bg-white dark:bg-primary-800 border-2 border-secondary-500 px-8 py-4 rounded-xl shadow-soft">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="text-secondary-600 dark:text-secondary-400 font-semibold text-lg inline-flex items-center"
                      >
                        <FiLock className="w-5 h-5 mr-2" />
                        Connect Wallet to Start
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}
              <button
                onClick={() => router.push("/campaigns")}
                className="bg-white dark:bg-primary-800 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-semibold border-2 border-gray-300 dark:border-primary-600 hover:border-secondary-500 dark:hover:border-secondary-500 transition-all duration-300 text-lg"
              >
                Explore Campaigns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW FLOATING STATS BAR - Trust Indicators
          ═══════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-primary-800 border-t border-b border-gray-200 dark:border-primary-700 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                emerald: "text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-900/20",
                cyan: "text-tertiary-600 dark:text-tertiary-400 bg-tertiary-50 dark:bg-tertiary-900/20",
                amber: "text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20",
              };
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`inline-flex items-center space-x-3 ${colorClasses[stat.color]} px-6 py-3 rounded-full mb-2`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-3xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW USE CASES SECTION - Categories Grid
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Can You Fund?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From student research to indie games, support Web3 innovation across all categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              const colorClasses = {
                emerald: "group-hover:bg-secondary-50 dark:group-hover:bg-secondary-900/20 group-hover:text-secondary-600 dark:group-hover:text-secondary-400",
                cyan: "group-hover:bg-tertiary-50 dark:group-hover:bg-tertiary-900/20 group-hover:text-tertiary-600 dark:group-hover:text-tertiary-400",
                amber: "group-hover:bg-accent-50 dark:group-hover:bg-accent-900/20 group-hover:text-accent-600 dark:group-hover:text-accent-400",
              };
              return (
                <div key={index} className="group text-center cursor-pointer">
                  <div className={`w-20 h-20 mx-auto bg-gray-100 dark:bg-primary-800 rounded-2xl flex items-center justify-center transition-all duration-300 ${colorClasses[useCase.color]}`}>
                    <Icon className="w-10 h-10 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                    {useCase.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {useCase.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW FEATURES SECTION - Why Choose CrowdFund Pro
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50 dark:bg-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose CrowdFund Pro?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Built on Ethereum with cutting-edge smart contracts for maximum security and transparency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                emerald: "from-secondary-500 to-secondary-600 shadow-emerald-glow",
                slate: "from-primary-500 to-primary-600",
                cyan: "from-tertiary-500 to-tertiary-600",
                amber: "from-accent-500 to-accent-600 shadow-amber-glow",
              };
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-primary-900 p-8 rounded-2xl shadow-slate-soft hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-primary-700 hover:border-secondary-300 dark:hover:border-secondary-700 group"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW HOW IT WORKS SECTION
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Three simple steps to launch or support a campaign
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-emerald rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-emerald-glow">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Create Campaign
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set your funding goal, milestones, and deadline. Pay a one-time creation fee to prevent spam.
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-tertiary-500 to-tertiary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Community Funds
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Contributors back your project with crypto. Funds locked in smart contract escrow.
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-amber rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-amber-glow">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Milestones Release
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Reach your goal, complete milestones, and withdraw funds. Or get auto-refunded if unsuccessful.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW STATS SECTION - Platform Metrics
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50 dark:bg-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-emerald bg-clip-text text-transparent mb-2">
                1000+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Campaigns Launched
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-br from-tertiary-500 to-tertiary-600 bg-clip-text text-transparent mb-2">
                $2M+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Funds Raised
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-amber bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Contributors
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NEW FOOTER - Professional Design
          ═══════════════════════════════════════════════════════════ */}
      <footer className="bg-primary-900 text-white py-12 border-t border-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-emerald rounded-xl flex items-center justify-center shadow-emerald-glow">
                <span className="text-white font-bold text-lg">CF</span>
              </div>
              <div>
                <span className="text-xl font-bold">CrowdFund Pro</span>
                <p className="text-sm text-gray-400">Web3 Innovation Launchpad</p>
              </div>
            </div>

            <p className="text-gray-400 text-center max-w-2xl">
              Transparent funding for Web3 innovation. Built on Ethereum with smart contract security.
            </p>

            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>© 2025 CrowdFund Pro</span>
              <span>•</span>
              <span>Built on Ethereum</span>
              <span>•</span>
              <span>Open Source</span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <FiShield className="w-4 h-4 text-secondary-400" />
              <span className="text-gray-500">Smart Contracts Audited</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════
          OLD CODE (COMMENTED OUT FOR REFERENCE)
          Uncomment these sections if you need to revert to original design
          ═══════════════════════════════════════════════════════════ */}
      {/*
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
      */}
    </div>
  );
}
