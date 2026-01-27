# Decentralized Crowd Funding Marketplace DApp

Build & Deploy a Decentralized Crowd Funding Marketplace DApp | Next.js + Solidity + Wagmi | Web3 Project for Beginners

![alt text](https://www.daulathussain.com/wp-content/uploads/2025/06/Build-Deploy-a-Decentralized-Crowd-Funding-Marketplace-DApp-Next.js-Solidity-Wagmi-Web3-Project-for-Beginners.jpg)

## Instruction

Kindly follow the following Instructions to run the project in your system and install the necessary requirements

- [Final Source Code](https://www.theblockchaincoders.com/sourceCode/build-and-deploy-a-decentralized-crowd-funding-marketplace-dapp-or-next.js-+-solidity-+-wagmi-or-web3-project-for-beginners)

#### Setup Video

- [Final Code Setup video](https://youtu.be/ds_LyZDChqg?si=4_ZFPxaR93aroeYo)

In this step-by-step tutorial, you’ll learn how to build and deploy a fully functional Blockchain Crowd Funding Marketplace DApp using Next.js, Solidity, and Wagmi Provider. This beginner-friendly Web3 project will teach you how to:

✅ Write and deploy a smart contract for managing crowdfunding campaigns
✅ Connect your frontend to the Ethereum blockchain using Wagmi hooks
✅ Allow users to create, contribute to, and track fundraising campaigns
✅ Store campaign data securely on-chain
✅ Deploy your DApp to a live blockchain network

Whether you're new to Web3 development or looking to strengthen your skills, this tutorial is perfect for developers ready to build real-world decentralized applications.

🔗 Tech Stack:
Next.js • Solidity • Hardhat • Ethers.js • Wagmi • RainbowKit • MetaMask

#### Crowd Funding Marketplace DApp

```
  WATCH: Crowd Funding Marketplace DApp
  Get : https://www.theblockchaincoders.com/sourceCode/crowd-funding-marketplace-project-source-code
  SETUP: https://youtu.be/muskTp3wf2k?si=wA9Lo0999hGCV23j
  VIDEO: https://youtu.be/9iSsnQJyUDM?si=pj2BGj4S-3Avt1Dj
```

#### Deploying Dapp

```
  WATCH: Hostinger
  Get : Discount 75%
  URL: https://www.hostg.xyz/aff_c?offer_id=6&aff_id=139422
```

### MULTI-CURRENCY ICO DAPP

```
  PROJECT: MULTI-CURRENCY ICO DAPP
  Code: https://www.theblockchaincoders.com/sourceCode/multi-currency-ico-dapp-using-next.js-solidity-and-wagmi
  VIDEO: https://youtu.be/j8NO8ea5zVo?si=jCmvfXmpmefwjhO5
```

#### Install Vs Code Editor

```
  GET: VsCode Editor
  URL: https://code.visualstudio.com/download
```

#### NodeJs & NPM Version

```
  NodeJs: v18.17.1 / LATEST
  NPM: 8.19.2
  URL: https://nodejs.org/en/download
  Video: https://youtu.be/PIR0oBVowXU?si=9eNdR29u37F2ujJJ
```

#### FINAL SOURCE CODE

```
  SETUP VIDEO:
  URL: https://www.theblockchaincoders.com/sourceCode/build-and-deploy-blockchain-supply-chain-dapp-or-next.js-solidity-wagmi-(web3-project)
```

All you need to follow the complete project and follow the instructions which are explained in the tutorial by Daulat

## Final Code Instruction

If you download the final source code then you can follow the following instructions to run the Dapp successfully

#### PINATA IPFS

```
  OPEN: PINATA.CLOUD
  URL:https://pinata.cloud/
```

#### reown

```
  OPEN: WALLET CONNECT
  URL: https://docs.reown.com/cloud/relay
```

#### FORMSPREE

```
  OPEN: FORMSPREE
  URL: https://formspree.io/
```

#### ALCHEMY

```
  OPEN: ALCHEMY.COM
  URL: https://www.alchemy.com/
```

## Important Links

- [Get Pro Blockchain Developer Course](https://www.theblockchaincoders.com/pro-nft-marketplace)
- [Support Creator](https://bit.ly/Support-Creator)
- [All Projects Source Code](https://www.theblockchaincoders.com/SourceCode)

## Authors

- [@theblockchaincoders.com](https://www.theblockchaincoders.com/)
- [@consultancy](https://www.theblockchaincoders.com/consultancy)
- [@youtube](https://www.youtube.com/@daulathussain)

# CrowdFund Pro - Complete Frontend Structure

## 📁 Project Structure

```
crowdfund-pro/
├── components/
│   ├── Campaign/
│   │   ├── CampaignCard.js
│   │   ├── CampaignDetails.js
│   │   └── CreateCampaignForm.js
│   ├── Dashboard/
│   │   ├── DashboardStats.js
│   │   └── StatsCard.js
│   └── Layout/
│       ├── Header.js
│       ├── Layout.js
│       └── Sidebar.js
├── config/
│   └── wagmi.js (your existing config)
├── constants/
│   ├── index.js
│   └── abi.js (your existing ABI)
├── hooks/
│   └── useContract.js
├── pages/
│   ├── admin.js
│   ├── campaigns/
│   │   └── index.js
│   ├── campaign/
│   │   └── [id].js
│   ├── contributions.js
│   ├── create-campaign.js
│   ├── dashboard.js
│   ├── index.js
│   ├── my-campaigns.js
│   └── _app.js
├── styles/
│   └── globals.css
├── utils/
│   ├── helpers.js
│   └── ipfs.js
├── .env.local
├── next.config.js
├── package.json
├── postcss.config.js
└── tailwind.config.js
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create `.env.local` file with your configuration:

```env
# Network Configuration (Localhost)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CHAIN_NAME=Localhost
NEXT_PUBLIC_CHAIN_SYMBOL=ETH
NEXT_PUBLIC_BLOCK_EXPLORER=http://localhost:8545
NEXT_PUBLIC_NETWORK=localhost
NEXT_PUBLIC_BLOCK_EXPLORER_NAME=Localhost Explorer
NEXT_PUBLIC_PLATFORM_NAME=CrowdFund Pro

# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address

# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt

# Admin Configuration (optional)
NEXT_PUBLIC_ADMIN_ADDRESS=your_admin_wallet_address
```

### 3. For Holesky Testnet

Simply update your `.env.local`:

```env
# Holesky Testnet Configuration
NEXT_PUBLIC_RPC_URL=https://ethereum-holesky.publicnode.com
NEXT_PUBLIC_CHAIN_ID=17000
NEXT_PUBLIC_CHAIN_NAME=Holesky
NEXT_PUBLIC_NETWORK=holesky
NEXT_PUBLIC_BLOCK_EXPLORER=https://holesky.etherscan.io
NEXT_PUBLIC_BLOCK_EXPLORER_NAME=Holesky Etherscan
```

### 4. Add Your Contract ABI

Create `constants/abi.js` and export your contract ABI:

```javascript
// constants/abi.js
export const CROWDFUNDING_ABI = [
  // Your contract ABI here
];
```

### 5. Update Contract Hook

In `hooks/useContract.js`, uncomment and import your ABI:

```javascript
import { CROWDFUNDING_ABI } from "../constants/abi";
```

### 6. PostCSS Configuration

Create `postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 7. Next.js Configuration

Create `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["gateway.pinata.cloud", "ipfs.io"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
```

### 8. Run the Application

```bash
npm run dev
```

## 🎨 Features Included

### ✅ Core Functionality

- **Wallet Connection**: RainbowKit integration with dynamic network support
- **Campaign Management**: Create, view, and manage campaigns
- **IPFS Integration**: Metadata and image storage via Pinata
- **Smart Contract Integration**: Complete Web3 functionality
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### ✅ Pages & Components

- **Landing Page**: Beautiful hero section with features
- **Dashboard**: Stats overview and recent activity
- **All Campaigns**: Browse and filter campaigns
- **Campaign Details**: Full campaign view with contribution functionality
- **Create Campaign**: Comprehensive form with IPFS upload
- **My Campaigns**: Creator's campaign management
- **My Contributions**: User's contribution history
- **Admin Panel**: Platform management (owner only)

### ✅ Advanced Features

- **Dark Mode**: Toggle between light and dark themes
- **Real-time Stats**: Platform and campaign statistics
- **Progress Tracking**: Visual progress bars and time remaining
- **Image Upload**: IPFS integration for campaign images
- **Network Switching**: Dynamic network configuration
- **Error Handling**: Comprehensive error states and loading indicators
- **Toast Notifications**: User feedback for all actions

### ✅ UI/UX Features

- **Sidebar Navigation**: Collapsible sidebar with icons
- **Search & Filter**: Campaign discovery functionality
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Skeleton loaders and spinners
- **Empty States**: Helpful messages when no data
- **Hover Effects**: Smooth animations and transitions

## 🔧 Customization

### Network Configuration

Switch between localhost and Holesky by updating your `.env.local` file. The app automatically adapts to the configured network.

### Styling

- Modify `tailwind.config.js` for theme customization
- Update `globals.css` for additional styles
- Components use Tailwind utility classes for easy styling

### IPFS Configuration

Update Pinata credentials in `.env.local` to enable image uploads and metadata storage.

### Admin Features

Set `NEXT_PUBLIC_ADMIN_ADDRESS` to enable admin panel access for the specified wallet address.

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Deploy to Netlify

1. Build the project: `npm run build`
2. Upload the `out` folder to Netlify
3. Configure environment variables

## 📝 Important Notes

1. **Contract ABI**: Make sure to add your complete contract ABI to `constants/abi.js`
2. **Environment Variables**: All environment variables must be prefixed with `NEXT_PUBLIC_` for client-side access
3. **IPFS Setup**: Get Pinata credentials from [pinata.cloud](https://pinata.cloud)
4. **Network Configuration**: The app dynamically switches networks based on environment variables
5. **Admin Access**: Set the admin address in environment variables to access admin features

## 🎯 Ready to Launch!

Your CrowdFund Pro application is now ready with:

- Complete smart contract integration
- Beautiful, responsive UI
- IPFS metadata storage
- Multi-network support
- Admin functionality
- Mobile-friendly design

Simply update your environment variables, add your contract ABI, and deploy! 🚀
