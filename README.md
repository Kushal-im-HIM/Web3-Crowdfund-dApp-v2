# 🚀 Decentralized Crowdfunding Marketplace DApp

A fully decentralized crowdfunding platform built on Ethereum, enabling transparent and secure fundraising campaigns with smart contract automation, IPFS storage, and Web3 integration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-363636?logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-13.2.4-000000?logo=next.js)
![Hardhat](https://img.shields.io/badge/Hardhat-Development-yellow)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Security-4E5EE4)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [Frontend Configuration](#-frontend-configuration)
- [Environment Variables](#-environment-variables)
- [Usage Guide](#-usage-guide)
- [Admin Functions](#-admin-functions)
- [Security Features](#-security-features)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

The **Decentralized Crowdfunding Marketplace** is a cutting-edge Web3 application that revolutionizes traditional crowdfunding by eliminating intermediaries and ensuring complete transparency. Built on Ethereum blockchain with smart contracts, it provides a trustless environment where:

- **Campaign Creators** can launch fundraising campaigns with complete control
- **Donors** can contribute securely knowing funds are held in smart contracts
- **All transactions** are transparent and immutable on the blockchain
- **Refunds** are automatic for failed campaigns
- **No platform commission** on successful campaigns (only creation fee)

---

## ✨ Key Features

### 🎯 Core Functionality

- ✅ **Campaign Creation** - Create campaigns with customizable goals and deadlines
- ✅ **Secure Contributions** - Donate to campaigns with MetaMask wallet
- ✅ **Automatic Refunds** - Failed campaigns trigger automatic refunds
- ✅ **Fund Withdrawal** - Creators withdraw funds only after reaching target
- ✅ **Real-time Tracking** - Monitor campaign progress and contributions
- ✅ **IPFS Storage** - Decentralized storage for campaign metadata and images
- ✅ **Responsive UI** - Mobile-first design with Tailwind CSS
- ✅ **Multi-network Support** - Works on localhost, testnets, and mainnet

### 🔒 Security Features

- 🛡️ **ReentrancyGuard** - Protection against reentrancy attacks
- 🛡️ **Ownable** - Admin-only functions with access control
- 🛡️ **Pausable** - Emergency pause mechanism
- 🛡️ **Input Validation** - Comprehensive parameter validation
- 🛡️ **Modifier-based Access** - Role-based permissions
- 🛡️ **OpenZeppelin Libraries** - Battle-tested security standards

### 💎 Advanced Features

- 📊 **Dashboard Analytics** - Platform-wide statistics
- 🔍 **Campaign Discovery** - Browse and search campaigns
- 📈 **Progress Tracking** - Visual progress bars and time counters
- 👥 **Contributor Tracking** - View all contributors per campaign
- 🎨 **Dark Mode** - Toggle between light and dark themes
- 🔔 **Toast Notifications** - Real-time user feedback
- 📱 **Mobile Responsive** - Optimized for all devices

---

## 🛠 Technology Stack

### Blockchain & Smart Contracts

```
├── Solidity ^0.8.19          # Smart contract language
├── Hardhat                    # Development framework
├── OpenZeppelin Contracts     # Security libraries
│   ├── ReentrancyGuard       # Reentrancy protection
│   ├── Ownable               # Access control
│   └── Pausable              # Emergency pause
└── Ethers.js v5.7.2          # Ethereum interaction
```

### Frontend Application

```
├── Next.js 13.2.4            # React framework
├── React 18.2.0              # UI library
├── Tailwind CSS 3.3.1        # Styling
├── Wagmi 1.4.13              # React hooks for Ethereum
├── RainbowKit 1.3.6          # Wallet connection UI
└── Viem 1.21.4               # TypeScript Ethereum library
```

### Decentralized Storage

```
├── IPFS (Pinata)             # Decentralized file storage
├── Campaign Metadata         # JSON data storage
└── Campaign Images           # Image storage
```

### Development Tools

```
├── Node.js v18.17.1+         # Runtime environment
├── NPM 8.19.2+               # Package manager
├── Hardhat                   # Testing & deployment
└── Git                       # Version control
```

---

## 🏗 Smart Contract Architecture

### Contract: `CrowdfundingMarketplace.sol`

**Location:** `web3/contracts/CrowdfundingMarketplace.sol`

#### Core Functions

```solidity
// Campaign Management
createCampaign(title, description, metadataHash, targetAmount, duration)
contributeToCampaign(campaignId) payable
withdrawCampaignFunds(campaignId)
getRefund(campaignId)

// Admin Functions
deactivateCampaign(campaignId)
reactivateCampaign(campaignId)
emergencyRefund(campaignId, contributor)
withdrawFees(amount)
pause()
unpause()

// View Functions
getCampaign(campaignId)
getActiveCampaigns(offset, limit)
getCampaignStats(campaignId)
getUserCampaigns(user)
getUserContributions(user)
getContractStats()
```

#### Campaign Structure

```solidity
struct Campaign {
    uint256 id;
    address payable creator;
    string title;
    string description;
    string metadataHash;        // IPFS hash
    uint256 targetAmount;
    uint256 raisedAmount;
    uint256 deadline;
    bool withdrawn;
    bool active;
    uint256 createdAt;
    uint256 contributorsCount;
}
```

#### Key Parameters

- **Campaign Creation Fee:** 1 ETH
- **Platform Commission:** 0% (creators get 100% on success)
- **Refund Policy:** Automatic for failed campaigns
- **Campaign Limit:** Unlimited active campaigns
- **Pagination:** 100 campaigns per query

---

## 📁 Project Structure

```
decentralized-crowdfunding/
│
├── web3/                           # Smart contract layer
│   ├── contracts/
│   │   └── CrowdfundingMarketplace.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── artifacts/                  # Compiled contracts
│   ├── hardhat.config.js
│   ├── package.json
│   └── .env
│
├── components/                     # React components
│   ├── Campaign/
│   │   ├── CampaignCard.js        # Campaign preview card
│   │   ├── CampaignDetails.js     # Full campaign view
│   │   └── CreateCampaignForm.js  # Campaign creation form
│   ├── Dashboard/
│   │   ├── DashboardStats.js      # Statistics overview
│   │   └── StatsCard.js           # Individual stat card
│   ├── Debug/
│   │   └── ContractDebug.js       # Development debug tools
│   └── Layout/
│       ├── Header.js              # Navigation header
│       ├── Layout.js              # Main layout wrapper
│       ├── Sidebar.js             # Navigation sidebar
│       └── GlobalErrorBoundary.js # Error handling
│
├── config/
│   └── wagmi.js                   # Web3 configuration
│
├── constants/
│   ├── index.js                   # Contract address & constants
│   └── abi.js                     # Contract ABI
│
├── hooks/
│   ├── useContract.js             # Smart contract hook
│   └── useCampaignDetails.js      # Campaign data hook
│
├── pages/                         # Next.js pages
│   ├── index.js                   # Landing page
│   ├── dashboard.js               # Dashboard
│   ├── campaigns/
│   │   └── index.js               # All campaigns
│   ├── campaign/
│   │   └── [id].js                # Campaign details
│   ├── create-campaign.js         # Create new campaign
│   ├── my-campaigns.js            # Creator's campaigns
│   ├── contributions.js           # Donor's contributions
│   ├── admin.js                   # Admin panel
│   └── _app.js                    # App wrapper
│
├── styles/
│   └── globals.css                # Global styles
│
├── utils/
│   ├── helpers.js                 # Utility functions
│   └── ipfs.js                    # IPFS integration
│
├── public/
│   └── logo.png                   # Assets
│
├── .env.local                     # Environment variables
├── next.config.js                 # Next.js config
├── tailwind.config.js             # Tailwind config
├── postcss.config.js              # PostCSS config
└── package.json                   # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** v18.17.1 or higher ([Download](https://nodejs.org/))
- **NPM** 8.19.2 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **MetaMask** browser extension ([Install](https://metamask.io/))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/decentralized-crowdfunding.git
cd decentralized-crowdfunding
```

#### 2. Install Frontend Dependencies

```bash
npm install
```

#### 3. Install Smart Contract Dependencies

```bash
cd web3
npm install
cd ..
```

#### 4. Get Required API Keys

You'll need accounts on these platforms:

- **Pinata** - IPFS storage ([Sign up](https://pinata.cloud/))
- **Reown (WalletConnect)** - Wallet connection ([Sign up](https://docs.reown.com/cloud/relay))
- **Alchemy** (optional) - RPC endpoint ([Sign up](https://www.alchemy.com/))

---

## 🔧 Smart Contract Deployment

### Local Development (Hardhat Network)

#### 1. Configure Hardhat

Edit `web3/hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337
    }
  }
};
```

#### 2. Compile Smart Contracts

```bash
cd web3
npx hardhat compile
```

#### 3. Run Local Blockchain

```bash
npx hardhat node
```

This starts a local Ethereum network at `http://localhost:8545` with 20 test accounts.

#### 4. Deploy Contract (New Terminal)

```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Save the deployed contract address!** You'll need it for the frontend.

### Testnet Deployment (Holesky)

#### 1. Create `.env` file in `web3/` folder

```env
PRIVATE_KEY=your_wallet_private_key_here
HOLESKY_RPC_URL=https://ethereum-holesky.publicnode.com
ETHERSCAN_API_KEY=your_etherscan_api_key (optional, for verification)
```

⚠️ **Security Warning:** Never commit `.env` files to Git!

#### 2. Update `hardhat.config.js`

```javascript
require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    holesky: {
      url: process.env.HOLESKY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 17000
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

#### 3. Get Holesky ETH

Get free testnet ETH from [Holesky Faucet](https://holesky-faucet.pk910.de/)

#### 4. Deploy to Holesky

```bash
cd web3
npx hardhat run scripts/deploy.js --network holesky
```

#### 5. Verify Contract (Optional)

```bash
npx hardhat verify --network holesky DEPLOYED_CONTRACT_ADDRESS
```

---

## ⚙️ Frontend Configuration

### 1. Create Environment File

Create `.env.local` in the root directory:

```env
# ============================================
# NETWORK CONFIGURATION
# ============================================

# For Local Development (Hardhat)
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CHAIN_NAME=Localhost
NEXT_PUBLIC_NETWORK=localhost
NEXT_PUBLIC_BLOCK_EXPLORER=http://localhost:8545
NEXT_PUBLIC_BLOCK_EXPLORER_NAME=Localhost Explorer

# For Holesky Testnet (uncomment to use)
# NEXT_PUBLIC_RPC_URL=https://ethereum-holesky.publicnode.com
# NEXT_PUBLIC_CHAIN_ID=17000
# NEXT_PUBLIC_CHAIN_NAME=Holesky
# NEXT_PUBLIC_NETWORK=holesky
# NEXT_PUBLIC_BLOCK_EXPLORER=https://holesky.etherscan.io
# NEXT_PUBLIC_BLOCK_EXPLORER_NAME=Holesky Etherscan

# ============================================
# CONTRACT CONFIGURATION
# ============================================
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address_here
NEXT_PUBLIC_CHAIN_SYMBOL=ETH

# ============================================
# IPFS CONFIGURATION (Pinata)
# ============================================
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token

# ============================================
# WALLET CONNECT (Reown)
# ============================================
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_reown_project_id

# ============================================
# PLATFORM CONFIGURATION
# ============================================
NEXT_PUBLIC_PLATFORM_NAME=CrowdFund Pro
NEXT_PUBLIC_ADMIN_ADDRESS=your_admin_wallet_address (optional)
```

### 2. Update Contract Address

In `constants/index.js`, update with your deployed contract address:

```javascript
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CAMPAIGN_CREATION_FEE = "1"; // 1 ETH
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "CrowdFund Pro";
```

### 3. Verify Contract ABI

Ensure `constants/abi.js` has the complete ABI from:
```bash
web3/artifacts/contracts/CrowdfundingMarketplace.sol/CrowdfundingMarketplace.json
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 🌐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address | `0x1234...abcd` |
| `NEXT_PUBLIC_PINATA_JWT` | Pinata JWT token | `eyJhbGc...` |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Reown project ID | `abc123...` |
| `NEXT_PUBLIC_RPC_URL` | Ethereum RPC endpoint | `http://localhost:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | Network chain ID | `31337` or `17000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Admin wallet address | None |
| `NEXT_PUBLIC_PLATFORM_NAME` | Platform display name | `CrowdFund Pro` |
| `NEXT_PUBLIC_PINATA_API_KEY` | Pinata API key | (JWT preferred) |
| `NEXT_PUBLIC_PINATA_SECRET_API_KEY` | Pinata secret | (JWT preferred) |

---

## 📖 Usage Guide

### For Campaign Creators

#### 1. Connect Wallet
- Click "Connect Wallet" in the header
- Approve MetaMask connection
- Ensure you're on the correct network

#### 2. Create Campaign
- Navigate to "Create Campaign"
- Fill in campaign details:
  - **Title**: Campaign name
  - **Description**: Detailed description
  - **Target Amount**: Funding goal in ETH
  - **Duration**: Campaign duration in days
  - **Image**: Upload campaign image (stored on IPFS)
- **Pay Creation Fee**: 1 ETH (refunded if campaign is manually deactivated by admin)
- Confirm transaction in MetaMask

#### 3. Manage Campaigns
- View your campaigns in "My Campaigns"
- Monitor real-time progress
- View contributors and their contributions
- Withdraw funds after successful completion

#### 4. Withdraw Funds
- Campaign must be completed and target reached
- Click "Withdraw Funds" on your campaign
- Confirm transaction in MetaMask
- Funds transferred to your wallet

### For Donors

#### 1. Discover Campaigns
- Browse all campaigns on "All Campaigns" page
- Use search and filters to find campaigns
- View campaign details by clicking campaign card

#### 2. Make a Contribution
- On campaign details page, enter contribution amount
- Click "Contribute"
- Confirm transaction in MetaMask
- Receive confirmation notification

#### 3. Track Contributions
- View all contributions in "My Contributions"
- See campaign progress
- Check if eligible for refunds

#### 4. Request Refund (if campaign fails)
- Campaign must be expired and target not reached
- Click "Request Refund" on failed campaign
- Confirm transaction in MetaMask
- Funds returned to your wallet

---

## 🔐 Admin Functions

### Access Control

Only the contract owner can access admin functions. Set your admin address:

```env
NEXT_PUBLIC_ADMIN_ADDRESS=0xYourAdminWalletAddress
```

### Available Admin Functions

#### 1. Pause/Unpause Contract
```javascript
// Emergency pause - stops all campaign creation and contributions
pause()
unpause()
```

#### 2. Campaign Moderation
```javascript
// Deactivate problematic campaign
deactivateCampaign(campaignId)

// Reactivate campaign (if not expired)
reactivateCampaign(campaignId)
```

#### 3. Emergency Refunds
```javascript
// Issue refund to specific contributor
emergencyRefund(campaignId, contributorAddress)
```

#### 4. Fee Management
```javascript
// Withdraw accumulated platf
