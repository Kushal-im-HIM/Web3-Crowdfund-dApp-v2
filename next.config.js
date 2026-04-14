/** @type {import('next').NextConfig} */

// Content Security Policy — allows wagmi RPCs, RainbowKit CDN, MoonPay, IPFS
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://buy-sandbox.moonpay.com https://buy.moonpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://gateway.pinata.cloud https://ipfs.io https://cloudflare-ipfs.com https://*.walletconnect.com https://*.walletconnect.org",
  "connect-src 'self' wss: https: https://*.walletconnect.com https://*.walletconnect.org https://*.infura.io https://*.alchemyapi.io https://eth-mainnet.g.alchemy.com https://eth-sepolia.g.alchemy.com https://gateway.pinata.cloud https://ipfs.io https://api.coingecko.com https://buy-sandbox.moonpay.com",
  "frame-src 'self' https://buy-sandbox.moonpay.com https://buy.moonpay.com https://*.walletconnect.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // CSP — defence-in-depth against XSS
  { key: "Content-Security-Policy", value: CSP },
  // Clickjacking protection
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIME sniffing protection
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer control
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — enforce HTTPS for 1 year (enable only in production with HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Permissions policy — block unused browser APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // XSS filter (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // DNS prefetch control
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    domains: ["gateway.pinata.cloud", "ipfs.io", "cloudflare-ipfs.com"],
    unoptimized: true,
  },

  trailingSlash: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false,
      };
    }

    if (!isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        const hydrationSuppressor = `
          if (typeof window !== 'undefined') {
            const originalError = console.error;
            const originalWarn = console.warn;
            console.error = function(...args) {
              const message = args[0];
              if (typeof message === 'string' && (
                message.includes('Hydration failed') ||
                message.includes('Text content did not match') ||
                message.includes('Server HTML') ||
                message.includes('client-side rendered') ||
                message.includes('Expected server HTML to contain') ||
                message.includes('react-hydration-error')
              )) return;
              return originalError.apply(console, args);
            };
            console.warn = function(...args) {
              const message = args[0];
              if (typeof message === 'string' && (
                message.includes('Expected server HTML') ||
                message.includes('hydration') ||
                message.includes('useLayoutEffect does nothing on the server')
              )) return;
              return originalWarn.apply(console, args);
            };
          }
        `;
        Object.keys(entries).forEach((key) => {
          if (Array.isArray(entries[key])) {
            entries[key].unshift(`data:text/javascript,${encodeURIComponent(hydrationSuppressor)}`);
          }
        });
        return entries;
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      // Cache static assets aggressively
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Never cache HTML pages (wagmi state must be fresh)
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },

  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      // Prevent direct access to internal Next.js paths
      { source: "/_next/webpack-hmr", destination: "/", permanent: false },
    ];
  },
};

module.exports = nextConfig;
