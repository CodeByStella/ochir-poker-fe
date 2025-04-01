/** @type {import('next').NextConfig} */

const isDevelopment = process.env.NODE_ENV !== "production";
const rewritesConfig = isDevelopment
  ? [
    {
      source: "/app/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_HOST}/app/:path*`,
    },
  ]
  : [];

const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Remove trailing slash
        port: '',
        pathname: '/**', // Matches any path after the domain
      },
    ],
  },
  rewrites: async () => rewritesConfig,
};

module.exports = nextConfig;