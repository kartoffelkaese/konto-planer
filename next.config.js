/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'https://konto-planer.de', 'http://konto-planer.de']
    }
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig; 